"""Extract MAXX-ON amplifier SKUs, specs, and images into the SWA project."""

from __future__ import annotations

import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(r"C:\Projects\MAXXON")
PDF = Path(r"c:\Users\ashis_j2fpu3p\Downloads\MAXON FINAL New Catalogue.pdf")
SITE_DUMP = Path(
    r"C:\Users\ashis_j2fpu3p\.cursor\projects\c-Projects-siac\agent-tools\9ca787dc-d0f5-498f-9807-2f418d0762d3.txt"
)
OUT_JSON = ROOT / "src" / "data" / "amplifiers.json"
PUBLIC_AMPS = ROOT / "public" / "assets" / "products" / "amplifiers"
ASSETS_AMPS = ROOT / "assets" / "products" / "amplifiers"
REPORT = ROOT / "extraction-report.json"

UA = {"User-Agent": "Mozilla/5.0 (compatible; MAXXON-extract/0.1)"}


def normalize_sku(raw: str) -> str:
    s = re.sub(r"\s+", " ", raw.strip())
    s = s.replace(" – ", "-").replace(" –", "-").replace("–", "-")
    return s


def slugify_sku(sku: str) -> str:
    s = sku.lower().replace(" ", "-")
    s = re.sub(r"[^a-z0-9\-]+", "", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s


def folder_sku(sku: str) -> str:
    """Filesystem-safe SKU folder name."""
    return re.sub(r"[^\w.\-]+", "_", sku.replace(" ", ""))


def parse_site_amplifiers(text: str) -> list[dict]:
    # Split on AMPLIFIER <SKU> headings
    pattern = re.compile(r"^AMPLIFIER\s+(.+)$", re.M)
    matches = list(pattern.finditer(text))
    products = []
    for i, m in enumerate(matches):
        sku_raw = normalize_sku(m.group(1))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end]
        # Stop at next major non-amplifier product family noise if needed
        # Keep first ~80 lines of block
        products.append({"sku": sku_raw, "block": block})
    return products


def pick(pattern: str, text: str, flags=re.I) -> str:
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else ""


def extract_specs(sku: str, block: str) -> dict:
    wattage = pick(r"(\d+\s*WATTS(?:\s*\+\s*\d+\s*WATTS)?)", block) or pick(
        r"####\s*([^\n]+WATTS[^\n]*)", block
    )
    if not wattage:
        wattage = pick(r"^(\d+\s*WATTS)\s*$", block, re.M)

    power = pick(r"Power Output\s*:\s*([^\n]+)", block)
    if not power:
        # Power amp style channels / stereo lines
        stereo = pick(r"Stereo/Mono:\s*([^\n]+)", block)
        channels = pick(r"Input Channels\s*:\s*([^\n]+)", block)
        bridged = pick(r"Bridged Output:\s*([^\n]+)", block)
        parts = [p for p in (stereo, channels, bridged) if p]
        power = " | ".join(parts) if parts else wattage

    response = pick(r"Frequency Response(?:\(-dB\))?\s*:?\s*([^\n]+)", block)
    if not response:
        response = pick(r"Frequency Response\s*([^\n]+)", block)

    weight = pick(r"Net W(?:e)?ight\s*:?\s*([^\n]+)", block)

    impedance = pick(r"Input Impedance\s*:?\s*([^\n]+)", block)
    if not impedance:
        impedance = pick(r"Speaker Output\s*:?\s*([^\n]+)", block)

    inputs = pick(r"Input Channels\s*:?\s*([^\n]+)", block)
    if not inputs:
        # Feature bullets often list mic/aux
        mic = pick(r"(\d+\s*Mic[^\n]*)", block)
        inputs = mic

    # Truncate very long raw fields lightly (still raw)
    def clip(v: str, n: int = 220) -> str:
        v = re.sub(r"\s+", " ", v).strip()
        return v if len(v) <= n else v[: n - 1] + "…"

    return {
        "wattage": clip(wattage, 80),
        "specs": {
            "power": clip(power),
            "response": clip(response),
            "weight": clip(weight, 80),
            "impedance": clip(impedance),
            "inputs": clip(inputs),
        },
    }


class ImgCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag != "img":
            return
        ad = dict(attrs)
        for key in ("src", "data-src", "data-large_image", "data-srcset"):
            val = ad.get(key)
            if not val:
                continue
            if " " in val and "http" in val:
                val = val.split()[0]
            if val.startswith("//"):
                val = "https:" + val
            if "wp-content/uploads" in val or "woocommerce" in val:
                self.images.append(val.split("?")[0])


def fetch(url: str) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.read()
    except Exception as exc:
        print(f"  fetch fail {url}: {exc}")
        return None


def shop_images_for_sku(sku: str) -> list[str]:
    slug = slugify_sku(sku)
    candidates = [
        f"https://maxx-on.com/shop/{slug}/",
        f"https://maxx-on.com/shop/{slug.replace('eur', 'eur')}/",
    ]
    # Extra slug variants
    if " " in sku:
        candidates.append(f"https://maxx-on.com/shop/{slugify_sku(sku.replace(' EUR', ' EUR'))}/")
    seen = []
    for url in candidates:
        raw = fetch(url)
        if not raw:
            continue
        html = raw.decode("utf-8", errors="replace")
        parser = ImgCollector()
        parser.feed(html)
        for img in parser.images:
            if img not in seen:
                seen.append(img)
        if seen:
            break
    return seen


def save_jpeg(path: Path, data: bytes) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        from io import BytesIO

        im = Image.open(BytesIO(data))
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        elif im.mode == "L":
            im = im.convert("RGB")
        im.save(path, "JPEG", quality=90)
        return True
    except Exception:
        # raw write if already jpeg
        try:
            path.write_bytes(data)
            return True
        except Exception as exc:
            print(f"  save fail {path}: {exc}")
            return False


def extract_pdf_images_by_sku(skus: list[str]) -> dict[str, list[Path]]:
    """Map SKU -> list of extracted image paths from PDF pages mentioning that SKU."""
    doc = fitz.open(PDF)
    tmp = ROOT / "_pdf_amp_extract"
    tmp.mkdir(exist_ok=True)
    mapping: dict[str, list[Path]] = {sku: [] for sku in skus}

    for page_index in range(len(doc)):
        page = doc[page_index]
        text = page.get_text("text") or ""
        page_skus = []
        for sku in skus:
            # flexible match without spaces
            compact = re.sub(r"\s+", "", sku)
            if sku in text or compact in re.sub(r"\s+", "", text):
                page_skus.append(sku)
            else:
                # partial model tokens e.g. SSA-100EUR vs MSSA-100EUR
                alt = sku[1:] if sku.startswith("M") and len(sku) > 4 else ""
                if alt and alt in text:
                    page_skus.append(sku)
        if not page_skus:
            continue

        images = page.get_images(full=True)
        ranked = []
        for img in images:
            xref = img[0]
            try:
                pix = fitz.Pixmap(doc, xref)
                if pix.n > 4:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                w, h = pix.width, pix.height
                if min(w, h) < 180 or max(w, h) < 260:
                    continue
                if pix.n == 1:  # grayscale-ish skip small masks already filtered
                    # allow large grayscale product shots
                    if max(w, h) < 400:
                        continue
                ranked.append((w * h, w, h, xref, pix))
            except Exception:
                continue
        ranked.sort(key=lambda t: t[0], reverse=True)
        # Keep top images per page
        kept = ranked[: max(2, len(page_skus) * 2)]
        for i, (area, w, h, xref, pix) in enumerate(kept):
            out = tmp / f"p{page_index + 1:02d}_{i:02d}_{w}x{h}.png"
            try:
                pix.save(out.as_posix())
            except Exception:
                continue
            # Assign greedily to page SKUs
            target = page_skus[min(i, len(page_skus) - 1)]
            mapping[target].append(out)
    doc.close()
    return mapping


def main() -> None:
    site_text = SITE_DUMP.read_text(encoding="utf-8", errors="replace")
    parsed = parse_site_amplifiers(site_text)
    print(f"Found {len(parsed)} amplifier headings on site dump")

    products = []
    for item in parsed:
        sku = item["sku"]
        meta = extract_specs(sku, item["block"])
        products.append(
            {
                "sku": sku,
                "model": sku,
                "wattage": meta["wattage"],
                "image_front": "",
                "image_back": "",
                "specs": meta["specs"],
                "_folder": folder_sku(sku),
            }
        )

    skus = [p["sku"] for p in products]
    print("Extracting PDF images…")
    pdf_map = extract_pdf_images_by_sku(skus)

    report = {"products": [], "missing_front": [], "missing_back": []}

    for p in products:
        sku = p["sku"]
        folder = p["_folder"]
        pub = PUBLIC_AMPS / folder
        staging = ASSETS_AMPS / folder
        pub.mkdir(parents=True, exist_ok=True)
        staging.mkdir(parents=True, exist_ok=True)

        front_path = pub / "front.jpg"
        back_path = pub / "back.jpg"
        got_front = False
        got_back = False

        # 1) Prefer website shop gallery images (SKU-accurate)
        shop_imgs = shop_images_for_sku(sku)
        print(f"{sku}: shop images={len(shop_imgs)}")
        if shop_imgs:
            data0 = fetch(shop_imgs[0])
            if data0 and save_jpeg(front_path, data0):
                got_front = True
                (staging / "front.jpg").write_bytes(front_path.read_bytes())
            if len(shop_imgs) > 1:
                data1 = fetch(shop_imgs[1])
                if data1 and save_jpeg(back_path, data1):
                    got_back = True
                    (staging / "back.jpg").write_bytes(back_path.read_bytes())

        # 2) Fallback / fill from PDF extracts
        pdf_imgs = pdf_map.get(sku) or []
        if not got_front and pdf_imgs:
            im = Image.open(pdf_imgs[0]).convert("RGB")
            im.save(front_path, "JPEG", quality=90)
            im.save(staging / "front.jpg", "JPEG", quality=90)
            got_front = True
        if not got_back and len(pdf_imgs) > 1:
            im = Image.open(pdf_imgs[1]).convert("RGB")
            im.save(back_path, "JPEG", quality=90)
            im.save(staging / "back.jpg", "JPEG", quality=90)
            got_back = True

        if got_front:
            p["image_front"] = f"/assets/products/amplifiers/{folder}/front.jpg"
        else:
            report["missing_front"].append(sku)
        if got_back:
            p["image_back"] = f"/assets/products/amplifiers/{folder}/back.jpg"
        else:
            report["missing_back"].append(sku)

        clean = {
            "sku": p["sku"],
            "model": p["model"],
            "wattage": p["wattage"],
            "image_front": p["image_front"],
            "image_back": p["image_back"],
            "specs": p["specs"],
        }
        report["products"].append(clean)

    OUT_JSON.write_text(json.dumps(report["products"], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_JSON}")
    print(f"front missing: {len(report['missing_front'])} back missing: {len(report['missing_back'])}")


if __name__ == "__main__":
    main()
