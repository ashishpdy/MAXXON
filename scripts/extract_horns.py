"""Extract MAXX-ON horns from the shop dump + catalogue into JSON and image folders."""

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
JSON_OUT = ROOT / "src" / "styles" / "horns.json"
PUBLIC = ROOT / "public" / "assets" / "products" / "horns"
STAGING = ROOT / "assets" / "products" / "horns"
BANNER_OUT = ROOT / "public" / "assets" / "banners" / "horns.png"

UA = {"User-Agent": "Mozilla/5.0 (compatible; MAXXON-extract/0.3)"}

HEADING = re.compile(r"^HORN\s+(.+)$", re.M)
NEXT_CUT = re.compile(r"\n(?:AMPLIFIER|MICROPHONE|ACCESSORIES|HORN|PORTABLE PA|STANDS|SPEAKER)\b")

FAMILY_ORDER = ["TRUMPET", "REFLEX", "HORN SPEAKER"]
FAMILY_TYPE = {
    "TRUMPET": "Aluminium trumpet",
    "REFLEX": "PA reflex horn",
    "HORN SPEAKER": "PA horn speaker",
}

SHOP_PAGES = [
    "https://maxx-on.com/product-category/horn/",
    "https://maxx-on.com/product-category/horn/trumpet-horn/",
    "https://maxx-on.com/product-category/horn/pa-horn-speaker/",
    "https://maxx-on.com/product-category/horn/pa-reflex-horn/",
    "https://maxx-on.com/product-category/accessories/pa-horn-flare/",
]


def clip(v: str, n: int = 90) -> str:
    v = re.sub(r"\s+", " ", (v or "")).strip()
    return v if len(v) <= n else v[: n - 1] + "…"


def compact(s: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "", (s or "").upper())


def normalize_sku(raw: str) -> str:
    s = re.sub(r"\s+", " ", raw.strip())
    s = s.replace(" – ", "-").replace(" –", "-").replace("–", "-")
    s = s.replace(" — ", "-").replace("—", "-")
    s = re.sub(r"\s*/\s*", "/", s)
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
    u = sku.upper()
    if u.startswith("MH"):
        return "TRUMPET"
    if u.startswith("SUH") or u.startswith("UHC"):
        return "HORN SPEAKER"
    return "REFLEX"


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


def trumpet_size(sku: str) -> str:
    m = re.search(r"MH-?(\d+)", sku, re.I)
    return f'{m.group(1)}"' if m else ""


def highlight(sku: str, power: str, diameter: str) -> str:
    m = re.search(r"(\d+(?:\.\d+)?)\s*W", power, re.I)
    if m:
        return f"{m.group(1)}W"
    if diameter:
        return diameter.replace("″", '"').replace("”", '"')
    return trumpet_size(sku)


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
        power = table_val(block, "INPUT POWER", "Input Power", "Power Rating")
        diameter = table_val(block, "Bell Diameter")
        specs = {
            "power": power,
            "type": FAMILY_TYPE[family],
            "response": table_val(
                block,
                "FREQ. RESPONSE",
                "Frequency Response",
                "Cut-off Frequency",
                "Cut of Frequency",
            ),
            "spl": table_val(block, "SPL AT 1KHZ", r"SPL at 1kHz(?:\s*\([^)]*\))?"),
            "impedance": table_val(block, "IMPEDANCE", "Impedance"),
            "weight": table_val(block, "NET/WT", "NET WT", "Net Weight", "Weight"),
            "material": table_val(block, "MATERIAL", "Material Used"),
            "dimensions": table_val(block, "DIMENSIONS", "Bell Diameter", "Dimensions"),
        }
        if family == "TRUMPET" and not specs["dimensions"]:
            size = trumpet_size(sku)
            if size:
                specs["dimensions"] = size
        specs = {k: v for k, v in specs.items() if v}
        products.append(
            {
                "family": family,
                "sku": sku,
                "slug": slugify(sku),
                "model": sku.replace("-", " ").replace("/", " / "),
                "folder": folder_sku(sku),
                "wattage": highlight(sku, power, diameter) or "—",
                "image_front": "",
                "image_back": "",
                "specs": specs,
            }
        )
    return products


def slug_candidates(sku: str) -> list[str]:
    base = slugify(sku)
    alts = [base, base.replace("-", ""), sku.lower()]
    # SUH-15/15XT → suh-15-15xt already; also suh-1515xt
    if "/" in sku:
        alts.append(slugify(sku.replace("/", "-")))
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


def fill_from_pdf(products: list[dict]) -> pymupdf.Document | None:
    if not PDF.exists():
        print("PDF missing, skip")
        return None
    doc = pymupdf.open(PDF)
    missing = [p for p in products if not p["image_front"]]
    print(f"PDF fill for {len(missing)} missing fronts, {doc.page_count} pages")

    page_hits: dict[int, list[dict]] = {}
    for p in missing:
        needle = compact(p["sku"])
        for i in range(doc.page_count):
            text = compact(doc[i].get_text("text"))
            if needle and needle in text:
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
            for variant in (p["sku"], p["sku"].replace("-", " "), p["sku"].replace("/", " ")):
                hits = page.search_for(variant)
                if hits:
                    y = hits[0].y0
                    break
            if y is None:
                im = images[0]
            else:
                im = min(images, key=lambda img: abs((img["rect"].y0 + img["rect"].y1) / 2 - y))
            save_pix(p["folder"], "front.jpg", im["pix"])
            p["image_front"] = f"/assets/products/horns/{p['folder']}/front.jpg"
            print(f"  {p['sku']} PDF p{page_i + 1} {im['w']}x{im['h']} y={y}")
    return doc


def knock_white(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a > 0 and r > 236 and g > 236 and b > 236

    stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    seen = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or x < 0 or y < 0 or x >= w or y >= h:
            continue
        seen.add((x, y))
        if not is_bg(x, y):
            continue
        px[x, y] = (255, 255, 255, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return rgba


def write_banner(products: list[dict], doc: pymupdf.Document | None) -> None:
    BANNER_OUT.parent.mkdir(parents=True, exist_ok=True)
    target_w, target_h = 1600, 720
    preferred = ("BC-16", "UHC-30/30XT", "MH-24", "MH-18")
    by_sku = {p["sku"]: p for p in products}
    source = None
    for sku in preferred:
        p = by_sku.get(sku)
        if not p or not p.get("image_front"):
            continue
        path = ROOT / "public" / p["image_front"].lstrip("/")
        if path.exists():
            source = Image.open(path)
            print(f"banner from {sku} {source.size}")
            break
    if source is None:
        print("no banner source")
        return

    horn = knock_white(source)
    canvas = Image.new("RGB", (target_w, target_h), (8, 12, 18))
    glow = Image.new("RGB", (target_w, target_h), (22, 34, 48))
    mask = Image.new("L", (target_w, target_h), 0)
    for x in range(int(target_w * 0.4), target_w):
        t = (x - target_w * 0.4) / (target_w * 0.6)
        Image.Image.paste(mask, Image.new("L", (1, target_h), int(90 * t)), (x, 0))
    canvas = Image.composite(glow, canvas, mask)

    max_h = int(target_h * 0.88)
    max_w = int(target_w * 0.52)
    scale = min(max_w / horn.width, max_h / horn.height)
    horn = horn.resize((int(horn.width * scale), int(horn.height * scale)), Image.Resampling.LANCZOS)
    x = target_w - horn.width - int(target_w * 0.06)
    y = (target_h - horn.height) // 2
    canvas.paste(horn, (x, y), horn)
    canvas.save(BANNER_OUT, "PNG")
    print(f"wrote {BANNER_OUT}")


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
            p["image_front"] = f"/assets/products/horns/{p['folder']}/front.jpg"
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
            p["image_front"] = f"/assets/products/horns/{p['folder']}/front.jpg"
            print(f"{p['sku']}: product page front")

    doc = fill_from_pdf(products)

    grouped = {name: [] for name in FAMILY_ORDER}
    kept = []
    for p in products:
        if not p["image_front"]:
            print(f"drop no photo: {p['sku']}")
            continue
        kept.append(p)
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
    print(f"wrote {JSON_OUT} kept={len(kept)} families={list(grouped)}")
    write_banner(kept, doc)
    if doc:
        doc.close()


if __name__ == "__main__":
    main()
