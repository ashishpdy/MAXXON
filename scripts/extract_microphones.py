"""Extract MAXX-ON microphones from the shop + catalogue into JSON and image folders."""

from __future__ import annotations

import json
import re
import urllib.request
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(r"C:\Projects\MAXXON")
PDF = Path(r"c:\Users\ashis_j2fpu3p\Downloads\MAXON FINAL New Catalogue.pdf")
DUMP = Path(
    r"C:\Users\ashis_j2fpu3p\.cursor\projects\c-Projects-siac\agent-tools\9ca787dc-d0f5-498f-9807-2f418d0762d3.txt"
)
JSON_OUT = ROOT / "src" / "styles" / "microphones.json"
PUBLIC = ROOT / "public" / "assets" / "products" / "microphones"
STAGING = ROOT / "assets" / "products" / "microphones"

UA = {"User-Agent": "Mozilla/5.0 (compatible; MAXXON-extract/0.2)"}

WIRELESS_SPECS = {
    "response": "40Hz–16kHz",
    "range": "80m–150m",
    "snr": ">100dB",
}

# family, sku, folder, shop slug, highlight, extra specs, pdf page
PRODUCTS = [
    # Wireless (site + PDF)
    ("WIRELESS", "MX-168", "MX-168", "mx-168-single", "SINGLE", {**WIRELESS_SPECS, "type": "UHF single"}, 29),
    ("WIRELESS", "MX-902", "MX-902", "mx-902-single", "SINGLE", {**WIRELESS_SPECS, "type": "UHF single"}, 28),
    ("WIRELESS", "MXW-200", "MXW-200", "mxw-200-single", "SINGLE", {"response": "210–270MHz", "range": "50m", "snr": "≥105dB", "type": "PLL / FM"}, None),
    ("WIRELESS", "MXW-666", "MXW-666", "mxw-666-double", "DOUBLE", {"response": "210–270MHz", "range": "50m", "snr": "≥105dB", "type": "PLL / FM"}, 28),
    ("WIRELESS", "MXX-168", "MXX-168", "mxx-168-double", "DOUBLE", {**WIRELESS_SPECS, "type": "UHF double"}, 29),
    ("WIRELESS", "MXU-186", "MXU-186", "mxu-186", "HAND + TIE", {**WIRELESS_SPECS, "type": "Handheld + head/tie"}, 30),
    ("WIRELESS", "MXUD-2", "MXUD-2", "mxud-2-double-premium", "DOUBLE", {**WIRELESS_SPECS, "type": "UHF premium double"}, 30),
    ("WIRELESS", "MXU-1187", "MXU-1187", None, "HAND + HEAD", {**WIRELESS_SPECS, "type": "Handheld + head mic"}, 29),
    ("WIRELESS", "MXUD-2B", "MXUD-2B", None, "ADJUSTABLE", {**WIRELESS_SPECS, "type": "Adjustable frequency"}, 30),
    # Wired (site + PDF extras)
    ("WIRED", "MXM-510", "MXM-510", "mxm-510", "DYNAMIC", {"type": "Unidirectional dynamic"}, 26),
    ("WIRED", "MXM-555", "MXM-555", "mxm-555", "DYNAMIC", {"type": "Unidirectional dynamic"}, 26),
    ("WIRED", "MXM-666", "MXM-666", "mxm-666", "DYNAMIC", {"type": "Unidirectional dynamic"}, 26),
    ("WIRED", "MXM-980", "MXM-980", "mxm-980", "DYNAMIC", {"type": "Unidirectional dynamic"}, 26),
    ("WIRED", "MXM-990", "MXM-990", "mxm-990", "DYNAMIC", {"type": "Unidirectional dynamic"}, 26),
    ("WIRED", "MXP-700", "MXP-700", "mxp-700", "DYNAMIC", {"type": "Unidirectional dynamic"}, 26),
    ("WIRED", "MXC-033", "MXC-033", "mxc-033", "CONFERENCE", {"type": "Podium / lectern, 41cm", "inputs": "XLR, 5m cable"}, 27),
    ("WIRED", "MXM-320", "MXM-320", None, "DYNAMIC", {"type": "Unidirectional dynamic"}, 26),
    ("WIRED", "MXM-339", "MXM-339", None, "DYNAMIC", {"type": "Unidirectional dynamic"}, 26),
    ("WIRED", "MXM-340", "MXM-340", None, "DYNAMIC", {"type": "Unidirectional dynamic"}, 26),
    ("WIRED", "MXC-043", "MXC-043", None, "CONFERENCE", {"type": "Podium / lectern, 61cm", "inputs": "XLR"}, 27),
    # Head / tie
    ("HEAD/TIE", "CTP-10DX", "CTP-10DX", "ctp-10dx-tie-clip", "TIE-CLIP", {
        "response": "50–15,000Hz",
        "sensitivity": "2.54mV/Pa",
        "impedance": "600Ω",
        "type": "Omni electret lavalier",
    }, 27),
    ("HEAD/TIE", "MB-505", "MB-505", "mb-505", "HEADBAND", {
        "response": "50–15,000Hz",
        "sensitivity": "5.6mV/Pa",
        "impedance": "1000Ω",
        "type": "Condenser headband",
    }, 27),
]


def clip(v: str, n: int = 90) -> str:
    v = re.sub(r"\s+", " ", (v or "")).strip()
    return v if len(v) <= n else v[: n - 1] + "…"


def fetch(url: str) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.read()
    except Exception as exc:
        print(f"  fetch fail {url}: {exc}")
        return None


def save_jpeg(path: Path, data: bytes) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        im = Image.open(BytesIO(data))
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.save(path, "JPEG", quality=90)
        return True
    except Exception as exc:
        print(f"  jpeg fail {path}: {exc}")
        return False


def copy_to_both(src: Path, folder: str, name: str) -> None:
    for root in (PUBLIC, STAGING):
        dest = root / folder
        dest.mkdir(parents=True, exist_ok=True)
        if src.resolve() != (dest / name).resolve():
            (dest / name).write_bytes(src.read_bytes())


class CatalogParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.pairs: list[tuple[str, str]] = []
        self._href = ""
        self._in_flip = False

    def handle_starttag(self, tag, attrs):
        ad = dict(attrs)
        if tag == "a":
            href = ad.get("href") or ""
            if "/shop/" in href:
                self._href = href.rstrip("/")
        cls = ad.get("class") or ""
        if tag == "div" and "first-flip" in cls:
            self._in_flip = True
        if tag == "img" and self._in_flip:
            src = ad.get("src") or ad.get("data-src") or ""
            if self._href and src and "uploads" in src:
                slug = self._href.rsplit("/", 1)[-1]
                self.pairs.append((slug, src.split("?")[0]))
            self._in_flip = False


def shop_catalog_map() -> dict[str, str]:
    urls = [
        "https://maxx-on.com/product-category/microphone/wireless-microphone/",
        "https://maxx-on.com/product-category/microphone/wired-microphone/",
        "https://maxx-on.com/product-category/microphone/head-tie-mic/",
    ]
    mapping: dict[str, str] = {}
    for url in urls:
        raw = fetch(url)
        if not raw:
            continue
        parser = CatalogParser()
        parser.feed(raw.decode("utf-8", errors="replace"))
        for slug, img in parser.pairs:
            mapping.setdefault(slug, img)
        print(f"catalog {url} -> {len(parser.pairs)} images")
    return mapping


def collect_pdf_images(page: pymupdf.Page, doc: pymupdf.Document) -> list[dict]:
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
        if max(w, h) / min(w, h) > 3.1:
            continue
        rects = page.get_image_rects(xref) or []
        rect = rects[0] if rects else pymupdf.Rect(0, 0, w, h)
        found.append({"pix": pix, "w": w, "h": h, "rect": rect, "area": w * h})
    found.sort(key=lambda x: (round(x["rect"].y0 / 30), round(x["rect"].x0 / 30), -x["area"]))
    return found


def save_pix(folder: str, name: str, pix: pymupdf.Pixmap) -> None:
    for root in (PUBLIC, STAGING):
        dest = root / folder
        dest.mkdir(parents=True, exist_ok=True)
        tmp = dest / "_tmp.png"
        pix.save(tmp.as_posix())
        Image.open(tmp).convert("RGB").save(dest / name, "JPEG", quality=90)
        tmp.unlink(missing_ok=True)


def merge_dump_specs(products: list[dict]) -> None:
    if not DUMP.exists():
        return
    text = DUMP.read_text(encoding="utf-8", errors="replace")
    by_sku = {p["sku"]: p for p in products}

    def table_val(block: str, label: str) -> str:
        m = re.search(rf"\|\s*{label}\s*\|\s*([^|]+)\|", block, re.I)
        return clip(m.group(1)) if m else ""

    pat = re.compile(r"^(?:MICROPHONE|HEAD/TIE MIC)\s+(.+)$", re.M)
    matches = list(pat.finditer(text))
    for i, m in enumerate(matches):
        raw = m.group(1)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end]
        cut = re.search(r"\n(?:AMPLIFIER|SPEAKER|PROFFESIONAL|ACTIVE|ACCESSORIES|HORN|STANDS)\b", block)
        if cut:
            block = block[: cut.start()]
        compact = re.sub(r"[^A-Z0-9]+", "", raw.upper())
        target = None
        for sku, item in by_sku.items():
            if compact.startswith(re.sub(r"[^A-Z0-9]+", "", sku.upper())):
                target = item
                break
        if not target:
            continue
        specs = dict(target["specs"])
        for src, dst in (
            ("Frequency Response", "response"),
            ("Audio response", "response"),
            ("Impedance", "impedance"),
            ("Sensitivity", "sensitivity"),
            ("Receive distance", "range"),
            ("Frequency Signal to noise ratio", "snr"),
            ("Signal-to-noise ratio", "snr"),
        ):
            val = table_val(block, src)
            if val:
                specs[dst] = val
        target["specs"] = {k: v for k, v in specs.items() if v}


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    STAGING.mkdir(parents=True, exist_ok=True)
    catalog = shop_catalog_map()

    products = []
    for family, sku, folder, shop, highlight, specs, page in PRODUCTS:
        products.append(
            {
                "family": family,
                "sku": sku,
                "slug": sku.lower().replace(" ", "-"),
                "model": sku.replace("-", " "),
                "highlight": highlight,
                "folder": folder,
                "shop": shop,
                "page": page,
                "image_front": "",
                "image_back": "",
                "specs": dict(specs),
            }
        )
    merge_dump_specs(products)

    # Shop catalog photos first
    for p in products:
        shop = p["shop"]
        img_url = catalog.get(shop or "")
        if not img_url:
            continue
        data = fetch(img_url)
        if not data:
            continue
        dest = PUBLIC / p["folder"] / "front.jpg"
        if save_jpeg(dest, data):
            copy_to_both(dest, p["folder"], "front.jpg")
            p["image_front"] = f"/assets/products/microphones/{p['folder']}/front.jpg"
            print(f"{p['sku']}: shop front")

    # PDF fills missing fronts (and optional backs)
    doc = pymupdf.open(PDF)
    by_page: dict[int, list[dict]] = {}
    for p in products:
        if p["page"]:
            by_page.setdefault(p["page"], []).append(p)

    for page_no, items in by_page.items():
        page = doc[page_no - 1]
        images = collect_pdf_images(page, doc)
        print(f"PDF p{page_no}: {len(items)} skus, {len(images)} images")
        missing = [p for p in items if not p["image_front"]]
        pool = images[:]
        for p, im in zip(missing, pool):
            save_pix(p["folder"], "front.jpg", im["pix"])
            p["image_front"] = f"/assets/products/microphones/{p['folder']}/front.jpg"
            print(f"  {p['sku']} PDF front {im['w']}x{im['h']}")
        extras = pool[len(missing) :]
        for p, im in zip(missing, extras):
            save_pix(p["folder"], "back.jpg", im["pix"])
            p["image_back"] = f"/assets/products/microphones/{p['folder']}/back.jpg"
            print(f"  {p['sku']} PDF back {im['w']}x{im['h']}")
    doc.close()

    grouped: dict[str, list] = {"WIRELESS": [], "WIRED": [], "HEAD/TIE": []}
    for p in products:
        grouped[p["family"]].append(
            {
                "sku": p["sku"],
                "slug": p["slug"],
                "model": p["model"],
                "wattage": p["highlight"],
                "image_front": p["image_front"],
                "image_back": p["image_back"],
                "specs": p["specs"],
            }
        )

    JSON_OUT.write_text(json.dumps(grouped, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    fronts = sum(1 for fam in grouped.values() for x in fam if x["image_front"])
    print(f"wrote {JSON_OUT} products={sum(len(v) for v in grouped.values())} fronts={fronts}")


if __name__ == "__main__":
    main()
