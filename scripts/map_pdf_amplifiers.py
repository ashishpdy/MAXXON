"""Map catalogue pages to amplifier SKUs and extract the largest color photos."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pymupdf
from PIL import Image

PDF = Path(r"c:\Users\ashis_j2fpu3p\Downloads\MAXON FINAL New Catalogue.pdf")
OUT = Path(r"C:\Projects\MAXXON\_pdf_amp_extract")
JSON_OUT = Path(r"C:\Projects\MAXXON\pdf-amp-page-map.json")

SKUS = [
    "CA-12",
    "DJ-2K2M",
    "DJX-4000",
    "DJX-5000",
    "MSSA-100EUR",
    "MSSA-160 EUR",
    "MSSA-200 EUR",
    "MSSA-250 EUR",
    "MSSA-300 EUR",
    "MSSA-500EUR",
    "MSSA-800EUR",
    "MSSB-125EUR",
    "MSSB-30",
    "MSSB-45FXR",
    "MSSB-65FXR",
    "MSSB-85FXR",
    "MTZA-10000 EUR",
    "MTZA-1500 EUR",
    "MTZA-2000 EUR",
    "MTZA-3000 EUR",
    "MTZA-4000 EUR",
    "MTZA-5000 EUR",
    "MTZA-7000 EUR",
    "MX-1201DP",
    "MX-1201",
    "UTR-30DP",
]


def variants(sku: str) -> list[str]:
    compact = re.sub(r"\s+", "", sku)
    alts = {sku, compact, sku.replace(" EUR", "EUR"), compact.replace("EUR", " EUR")}
    if compact.startswith("M") and compact[1:4] in {"SSA", "SSB", "TZA"}:
        alts.add(compact[1:])  # SSA-100EUR
        alts.add(sku[1:] if sku.startswith("M") else sku)
    if sku.startswith("DJ-"):
        alts.add(sku.replace("-", ""))
        alts.add("DJ2K2M")
    return [a for a in alts if a]


def page_hits(text: str) -> list[str]:
    compact_text = re.sub(r"\s+", "", text)
    hits = []
    for sku in SKUS:
        for v in variants(sku):
            if v in text or re.sub(r"\s+", "", v) in compact_text:
                hits.append(sku)
                break
    # keep order, unique
    seen = []
    for h in hits:
        if h not in seen:
            seen.append(h)
    return seen


def main() -> None:
    OUT.mkdir(exist_ok=True)
    doc = pymupdf.open(PDF)
    mapping = []
    for i, page in enumerate(doc):
        text = page.get_text("text") or ""
        hits = page_hits(text)
        if not hits:
            continue
        images = []
        for img in page.get_images(full=True):
            xref = img[0]
            try:
                pix = pymupdf.Pixmap(doc, xref)
                if pix.n - pix.alpha > 3:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                w, h = pix.width, pix.height
                colorspace = pix.n
                if min(w, h) < 200 or max(w, h) < 280:
                    continue
                if colorspace <= 2 and max(w, h) < 500:
                    continue
                path = OUT / f"p{i+1:02d}_x{xref}_{w}x{h}.png"
                pix.save(path.as_posix())
                images.append({"file": path.name, "w": w, "h": h, "n": colorspace, "xref": xref})
            except Exception as exc:
                images.append({"error": str(exc), "xref": xref})
        images.sort(key=lambda x: x.get("w", 0) * x.get("h", 0), reverse=True)
        mapping.append(
            {
                "page": i + 1,
                "skus": hits,
                "image_count": len(images),
                "images": images[:12],
                "text_preview": re.sub(r"\s+", " ", text)[:400],
            }
        )
        print(f"page {i+1}: skus={hits} images={len(images)}")
    doc.close()
    JSON_OUT.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")
    print("wrote", JSON_OUT)


if __name__ == "__main__":
    main()
