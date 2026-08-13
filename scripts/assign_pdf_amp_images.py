"""Assign catalogue product photos to amplifier SKU folders as front.jpg."""

from __future__ import annotations

import json
import re
import shutil
from io import BytesIO
from pathlib import Path

import pymupdf
from PIL import Image

PDF = Path(r"c:\Users\ashis_j2fpu3p\Downloads\MAXON FINAL New Catalogue.pdf")
PUBLIC = Path(r"C:\Projects\MAXXON\public\assets\products\amplifiers")
STAGING = Path(r"C:\Projects\MAXXON\assets\products\amplifiers")
JSON_PATH = Path(r"C:\Projects\MAXXON\src\data\amplifiers.json")

# Catalogue product pages (skip cover page 1 false-positive)
PAGE_SKUS = {
    4: ["MTZA-10000 EUR", "MTZA-7000 EUR"],
    5: ["MTZA-4000 EUR", "MTZA-5000 EUR"],
    6: ["MTZA-1500 EUR", "MTZA-2000 EUR", "MTZA-3000 EUR"],
    8: ["MX-1201"],
    9: ["CA-12", "DJ-2K2M"],
    10: ["DJX-4000", "DJX-5000"],
    12: ["MSSA-500EUR", "MSSA-800EUR"],
    13: ["MSSA-250 EUR", "MSSA-300 EUR"],
    14: ["MSSA-160 EUR", "MSSA-200 EUR", "MSSB-125EUR"],
    15: ["MSSA-100EUR", "MSSB-85FXR"],
    16: ["MSSB-30", "MSSB-45FXR", "MSSB-65FXR", "UTR-30DP"],
}


def folder_sku(sku: str) -> str:
    return re.sub(r"[^\w.\-]+", "_", sku.replace(" ", ""))


def save_front(sku: str, pix: pymupdf.Pixmap) -> None:
    folder = folder_sku(sku)
    for root in (PUBLIC, STAGING):
        dest = root / folder
        dest.mkdir(parents=True, exist_ok=True)
        tmp = dest / "_tmp.png"
        pix.save(tmp.as_posix())
        im = Image.open(tmp).convert("RGB")
        im.save(dest / "front.jpg", "JPEG", quality=90)
        tmp.unlink(missing_ok=True)


def save_back_from_page_crop(sku: str, page: pymupdf.Page, rect: pymupdf.Rect) -> None:
    """If a second distinct image exists near the product, save as back.jpg."""
    pix = page.get_pixmap(clip=rect, dpi=140)
    folder = folder_sku(sku)
    for root in (PUBLIC, STAGING):
        dest = root / folder
        dest.mkdir(parents=True, exist_ok=True)
        im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        im.save(dest / "back.jpg", "JPEG", quality=88)


def collect_color_images(page: pymupdf.Page, doc: pymupdf.Document) -> list[dict]:
    found = []
    seen = set()
    for img in page.get_images(full=True):
        xref = img[0]
        if xref in seen:
            continue
        seen.add(xref)
        try:
            pix = pymupdf.Pixmap(doc, xref)
        except Exception:
            continue
        if pix.n - pix.alpha > 3:
            pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
        if pix.n - pix.alpha != 3:
            continue
        w, h = pix.width, pix.height
        if min(w, h) < 180 or max(w, h) < 250:
            continue
        rects = page.get_image_rects(xref) or []
        rect = rects[0] if rects else pymupdf.Rect(0, 0, w, h)
        found.append({"xref": xref, "pix": pix, "w": w, "h": h, "rect": rect, "area": w * h})
    # reading order: top to bottom, then left to right
    found.sort(key=lambda x: (round(x["rect"].y0 / 20), round(x["rect"].x0 / 20), -x["area"]))
    return found


def main() -> None:
    # Drop bogus marketing SKU folder
    for root in (PUBLIC, STAGING):
        for child in root.iterdir():
            if child.is_dir() and child.name.startswith("MAXX-ON"):
                shutil.rmtree(child, ignore_errors=True)

    doc = pymupdf.open(PDF)
    assigned = {}
    for page_no, skus in PAGE_SKUS.items():
        page = doc[page_no - 1]
        images = collect_color_images(page, doc)
        print(f"page {page_no}: {len(skus)} skus, {len(images)} color images")
        # Prefer landscape product shots (rack amps are wide)
        wide = [im for im in images if im["w"] >= im["h"] * 1.4]
        pool = wide if len(wide) >= len(skus) else images
        # Take one image per SKU
        used = pool[: len(skus)]
        for sku, im in zip(skus, used):
            save_front(sku, im["pix"])
            assigned[sku] = {
                "page": page_no,
                "front": f"{im['w']}x{im['h']}",
                "folder": folder_sku(sku),
            }
            print(f"  {sku} <- {im['w']}x{im['h']} @ ({im['rect'].x0:.0f},{im['rect'].y0:.0f})")

        # If extra images remain, treat next unused as back for matching SKUs
        extras = pool[len(skus) :]
        for sku, im in zip(skus, extras):
            folder = folder_sku(sku)
            for root in (PUBLIC, STAGING):
                dest = root / folder
                dest.mkdir(parents=True, exist_ok=True)
                tmp = dest / "_tmp.png"
                im["pix"].save(tmp.as_posix())
                Image.open(tmp).convert("RGB").save(dest / "back.jpg", "JPEG", quality=90)
                tmp.unlink(missing_ok=True)
            assigned[sku]["back"] = f"{im['w']}x{im['h']}"
            print(f"  {sku} back <- {im['w']}x{im['h']}")

    # MX-1201DP shares MX-1201 page if present in text on page 8
    page8 = doc[7].get_text("text") or ""
    if "1201DP" in page8.replace(" ", "") or "MX-1201DP" in page8:
        src = PUBLIC / "MX-1201" / "front.jpg"
        if src.exists():
            for name in ("MX-1201DP",):
                for root in (PUBLIC, STAGING):
                    dest = root / name
                    dest.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dest / "front.jpg")
                assigned.setdefault(name, {"page": 8, "folder": name, "note": "shared page with MX-1201"})

    doc.close()

    products = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    cleaned = []
    for p in products:
        sku = p.get("sku") or ""
        if sku.startswith("MAXX-ON AMPLIFIERS"):
            continue
        folder = folder_sku(sku)
        front = PUBLIC / folder / "front.jpg"
        back = PUBLIC / folder / "back.jpg"
        p["image_front"] = f"/assets/products/amplifiers/{folder}/front.jpg" if front.exists() else ""
        p["image_back"] = f"/assets/products/amplifiers/{folder}/back.jpg" if back.exists() else ""
        cleaned.append(p)
    JSON_PATH.write_text(json.dumps(cleaned, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    Path(r"C:\Projects\MAXXON\pdf-amp-assign.json").write_text(
        json.dumps(assigned, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("assigned", len(assigned), "wrote json", len(cleaned))


if __name__ == "__main__":
    main()
