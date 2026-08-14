"""Extract MAXX-ON portable PA systems from the shop dump + catalogue."""

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
JSON_OUT = ROOT / "src" / "styles" / "pa-systems.json"
PUBLIC = ROOT / "public" / "assets" / "products" / "pa-systems"
STAGING = ROOT / "assets" / "products" / "pa-systems"

UA = {"User-Agent": "Mozilla/5.0 (compatible; MAXXON-extract/0.3)"}

HEADING = re.compile(r"^PORTABLE PA\s+(.+)$", re.M)
NEXT_CUT = re.compile(r"\n(?:AMPLIFIER|MICROPHONE|ACCESSORIES|HORN|PORTABLE PA|STANDS|SPEAKER|DIAPHRAGMS)\b")

FAMILY_ORDER = ["MEGAPHONE", "MOBILE"]
FAMILY_TYPE = {
    "MEGAPHONE": "Shoulder megaphone",
    "MOBILE": "Portable PA",
}

SHOP_PAGES = [
    "https://maxx-on.com/product-category/portable-pa/",
]

SHOP_SLUGS = {
    "MEGAPHONE-201": ["megaphone-201"],
    "MEGAPHONE-301": ["megaphone-301-2", "megaphone-301"],
    "PM-99": ["pm-99-with-cell-tray", "pm-99"],
    "PM-99-REC": ["pm-99-rec", "portable-pa-pm-99-rec"],
}


def clip(v: str, n: int = 90) -> str:
    v = re.sub(r"\s+", " ", (v or "")).strip()
    return v if len(v) <= n else v[: n - 1] + "…"


def compact(s: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "", (s or "").upper())


def normalize_sku(raw: str) -> str:
    s = re.sub(r"\s+", " ", raw.strip())
    s = re.sub(r"\s*\([^)]*\)\s*$", "", s)
    s = s.replace(" – ", "-").replace(" –", "-").replace("–", "-")
    s = s.replace(" — ", "-").replace("—", "-")
    s = re.sub(r"\s*-\s*", "-", s)
    s = re.sub(r"\s+", "-", s)
    return s.strip("-")


def folder_sku(sku: str) -> str:
    return re.sub(r"[^\w.\-]+", "_", sku)


def slugify(sku: str) -> str:
    s = sku.lower().replace("/", "-").replace(" ", "-")
    s = re.sub(r"[^a-z0-9\-]+", "", s)
    return re.sub(r"-{2,}", "-", s).strip("-")


def family_for(sku: str) -> str:
    return "MEGAPHONE" if "MEGAPHONE" in sku.upper() else "MOBILE"


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
        target = dest / name
        if src.resolve() != target.resolve():
            target.write_bytes(src.read_bytes())


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
        if tag == "img" and (self._in_flip or "wp-post-image" in cls or "attachment" in cls):
            src = ad.get("src") or ad.get("data-src") or ""
            if self._href and src and "uploads" in src:
                slug = self._href.rsplit("/", 1)[-1]
                self.pairs.append((slug, src.split("?")[0]))
            self._in_flip = False


def shop_catalog_map() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for url in SHOP_PAGES:
        raw = fetch(url)
        if not raw:
            continue
        parser = CatalogParser()
        parser.feed(raw.decode("utf-8", errors="replace"))
        for slug, img in parser.pairs:
            mapping.setdefault(slug, img)
        print(f"catalog {url} -> {len(parser.pairs)} images")
    return mapping


def table_val(block: str, *labels: str) -> str:
    for label in labels:
        m = re.search(rf"\|\s*{label}\s*\|\s*([^|]+)\|", block, re.I)
        if m:
            return clip(m.group(1))
    return ""


def split_dim_weight(raw: str) -> tuple[str, str]:
    if not raw:
        return "", ""
    m = re.search(r"(.+?)\s+(\d+(?:\.\d+)?\s*kg.*)$", raw, re.I)
    if m:
        dim = clip(m.group(1)).rstrip(" /")
        return dim, clip(m.group(2))
    return clip(raw).rstrip(" /"), ""


def highlight(sku: str, power: str, range_m: str) -> str:
    m = re.search(r"(\d+(?:\.\d+)?)\s*W", power, re.I)
    if m:
        return f"{m.group(1)}W"
    if "REC" in sku.upper():
        return "REC"
    m = re.search(r"(\d+)\s*meters?", range_m, re.I)
    if m:
        return f"{m.group(1)}m"
    if sku.upper() == "PM-99":
        return "12V"
    return ""


def parse_dump() -> list[dict]:
    text = DUMP.read_text(encoding="utf-8", errors="replace")
    matches = list(HEADING.finditer(text))
    products = []
    seen = set()
    for i, m in enumerate(matches):
        sku = normalize_sku(m.group(1))
        key = compact(sku)
        if key in seen:
            continue
        seen.add(key)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end]
        cut = NEXT_CUT.search(block)
        if cut:
            block = block[: cut.start()]
        family = family_for(sku)
        dim_raw = table_val(block, "DIMENSIONS / NET WT", "DIMENSIONS", "Dimensions")
        dims, weight = split_dim_weight(dim_raw)
        power = table_val(block, "PCNVER OUTPUTS", "POWER OUTPUT", "POWER REQUIREMENT")
        if power and "mike" in power.lower() and not re.search(r"\d+\s*W", power, re.I):
            power = table_val(block, "POWER REQUIREMENT")
        if not power and "UM-1" in block:
            power = "UM-1 dry cells / 12V car battery"
        range_m = table_val(block, "VOICE RANGE")
        if not range_m and "long distance" in block.lower():
            range_m = "Long throw"
        inputs = table_val(block, "INPUTS")
        if not inputs and "Additional Speaker" in block:
            inputs = "External speaker out"
        specs = {
            "power": power,
            "type": FAMILY_TYPE[family],
            "range": range_m,
            "inputs": inputs,
            "weight": weight or table_val(block, "NET WT", "Weight"),
            "dimensions": dims,
        }
        specs = {k: v for k, v in specs.items() if v}
        products.append(
            {
                "family": family,
                "sku": sku,
                "slug": slugify(sku),
                "model": sku.replace("-", " "),
                "folder": folder_sku(sku),
                "wattage": highlight(sku, power, range_m) or "—",
                "image_front": "",
                "image_back": "",
                "specs": specs,
            }
        )
    return products


def slug_candidates(sku: str) -> list[str]:
    alts = list(SHOP_SLUGS.get(sku, []))
    alts.append(slugify(sku))
    return list(dict.fromkeys(alts))


def match_shop_image(sku: str, mapping: dict[str, str]) -> str | None:
    want = compact(sku)
    for slug, img in mapping.items():
        if want and want in compact(slug):
            return img
    return None


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
        if min(w, h) < 160 or max(w, h) < 220:
            continue
        if max(w, h) / min(w, h) > 3.2:
            continue
        rects = page.get_image_rects(xref) or []
        rect = rects[0] if rects else pymupdf.Rect(0, 0, w, h)
        found.append({"pix": pix, "w": w, "h": h, "rect": rect, "area": w * h, "xref": xref})
    found.sort(key=lambda x: -x["area"])
    return found


def save_pix(folder: str, name: str, pix: pymupdf.Pixmap) -> None:
    for root in (PUBLIC, STAGING):
        dest = root / folder
        dest.mkdir(parents=True, exist_ok=True)
        tmp = dest / "_tmp.png"
        pix.save(tmp.as_posix())
        Image.open(tmp).convert("RGB").save(dest / name, "JPEG", quality=90)
        tmp.unlink(missing_ok=True)


def shop_product_image(sku: str) -> str | None:
    for slug in slug_candidates(sku):
        html = fetch(f"https://maxx-on.com/shop/{slug}/")
        if not html:
            continue
        text = html.decode("utf-8", errors="replace")
        m = re.search(
            r'<img[^>]+(?:wp-post-image|attachment-woocommerce)[^>]+src=["\']([^"\']+)["\']',
            text,
            re.I,
        )
        if not m:
            m = re.search(r'property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', text, re.I)
        if m:
            return m.group(1).split("?")[0]
    return None


def fill_from_pdf(products: list[dict]) -> None:
    if not PDF.exists():
        print("PDF missing, skip")
        return
    doc = pymupdf.open(PDF)
    missing = [p for p in products if not p["image_front"]]
    print(f"PDF fill for {len(missing)} missing fronts, {doc.page_count} pages")

    page_hits: dict[int, list[dict]] = {}
    for p in missing:
        needles = [compact(p["sku"])]
        if p["sku"].upper().startswith("MEGAPHONE-"):
            needles.append(compact(p["sku"].split("-", 1)[-1]))
        for i in range(doc.page_count):
            text = compact(doc[i].get_text("text"))
            if any(n and n in text for n in needles):
                page_hits.setdefault(i, []).append(p)
                break

    for page_i, items in page_hits.items():
        page = doc[page_i]
        images = [im for im in collect_pdf_images(page, doc) if im["rect"].y1 > 50]
        images.sort(key=lambda x: (round(x["rect"].y0 / 40), round(x["rect"].x0 / 40), -x["area"]))
        if not images:
            continue
        for p in items:
            y = None
            for variant in (p["sku"], p["sku"].replace("-", " "), p["model"]):
                hits = page.search_for(variant)
                if hits:
                    y = hits[0].y0
                    break
            im = images[0] if y is None else min(images, key=lambda img: abs((img["rect"].y0 + img["rect"].y1) / 2 - y))
            save_pix(p["folder"], "front.jpg", im["pix"])
            p["image_front"] = f"/assets/products/pa-systems/{p['folder']}/front.jpg"
            print(f"  {p['sku']} PDF p{page_i + 1} {im['w']}x{im['h']} y={y}")
    doc.close()


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    STAGING.mkdir(parents=True, exist_ok=True)
    products = parse_dump()
    print(f"dump products={len(products)} {[p['sku'] for p in products]}")
    catalog = shop_catalog_map()

    for p in products:
        img_url = match_shop_image(p["sku"], catalog)
        if not img_url:
            continue
        data = fetch(img_url)
        if not data:
            continue
        dest = PUBLIC / p["folder"] / "front.jpg"
        if save_jpeg(dest, data):
            copy_to_both(dest, p["folder"], "front.jpg")
            p["image_front"] = f"/assets/products/pa-systems/{p['folder']}/front.jpg"
            print(f"{p['sku']}: shop front")

    for p in products:
        if p["image_front"]:
            continue
        img_url = shop_product_image(p["sku"])
        if not img_url:
            continue
        data = fetch(img_url)
        if not data:
            continue
        dest = PUBLIC / p["folder"] / "front.jpg"
        if save_jpeg(dest, data):
            copy_to_both(dest, p["folder"], "front.jpg")
            p["image_front"] = f"/assets/products/pa-systems/{p['folder']}/front.jpg"
            print(f"{p['sku']}: product page front")

    fill_from_pdf(products)

    grouped = {name: [] for name in FAMILY_ORDER}
    kept = 0
    for p in products:
        if not p["image_front"]:
            print(f"drop no photo: {p['sku']}")
            continue
        kept += 1
        grouped[p["family"]].append(
            {
                "sku": p["sku"],
                "slug": p["slug"],
                "model": p["model"],
                "wattage": p["wattage"] or "—",
                "image_front": p["image_front"],
                "image_back": p["image_back"],
                "specs": p["specs"],
            }
        )

    grouped = {k: v for k, v in grouped.items() if v}
    JSON_OUT.write_text(json.dumps(grouped, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {JSON_OUT} kept={kept} families={list(grouped)}")


if __name__ == "__main__":
    main()
