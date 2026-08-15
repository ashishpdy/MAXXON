"""Extract diaphragms, pendulum speakers, and driver units from shop + 2026 catalogue."""

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
UA = {"User-Agent": "Mozilla/5.0 (compatible; MAXXON-extract/0.4)"}

DRIVER_PAGE = 19  # 0-based page 20
DIA_PAGE = 18
PENDULUM_PAGE = 22

CATEGORIES = {
    "driver-units": {
        "json": ROOT / "src" / "styles" / "driver-units.json",
        "public": ROOT / "public" / "assets" / "products" / "driver-units",
        "banner": ROOT / "public" / "assets" / "banners" / "driver-units.png",
        "shop": ["https://maxx-on.com/product-category/accessories/driver-unit/"],
        "families": ["MU", "MU-XT"],
        "banner_skus": ["MU-100", "MU-80", "MU-40XT"],
    },
    "diaphragms": {
        "json": ROOT / "src" / "styles" / "diaphragms.json",
        "public": ROOT / "public" / "assets" / "products" / "diaphragms",
        "banner": ROOT / "public" / "assets" / "banners" / "diaphragms.png",
        "shop": ["https://maxx-on.com/product-category/accessories/diaphragms/"],
        "families": ["DIAPHRAGM"],
        "banner_skus": ["MU-40XT/55XT", "MU-40/60", "SPECIAL-DIA"],
    },
    "pendulum-speakers": {
        "json": ROOT / "src" / "styles" / "pendulum-speakers.json",
        "public": ROOT / "public" / "assets" / "products" / "pendulum-speakers",
        "banner": ROOT / "public" / "assets" / "banners" / "pendulum-speakers.png",
        "shop": [],
        "families": ["PENDULUM"],
        "banner_skus": ["MX-650", "MXP-06", "MXP-04"],
    },
}

PRODUCTS = [
    {
        "category": "driver-units",
        "family": "MU",
        "sku": "MU-40",
        "wattage": "40W",
        "shop_slug": "mu-40",
        "specs": {
            "type": "Horn driver unit",
            "power": "40W RMS / 60W max",
            "response": "160-7000Hz",
            "impedance": "16Ω",
            "weight": "1.60 Kg",
            "material": "Die Cast Aluminium",
            "dimensions": "113×98 mm",
        },
    },
    {
        "category": "driver-units",
        "family": "MU",
        "sku": "MU-60",
        "wattage": "60W",
        "shop_slug": "mu-60",
        "specs": {
            "type": "Horn driver unit",
            "power": "60W RMS / 90W max",
            "response": "160-7000Hz",
            "impedance": "16Ω",
            "weight": "1.90 Kg",
            "material": "Die Cast Aluminium",
            "dimensions": "125×100 mm",
        },
    },
    {
        "category": "driver-units",
        "family": "MU",
        "sku": "MU-80",
        "wattage": "80W",
        "shop_slug": "mu-80",
        "specs": {
            "type": "Horn driver unit",
            "power": "80W RMS / 105W max",
            "response": "160-7000Hz",
            "impedance": "16Ω",
            "weight": "2.10 Kg",
            "material": "Die Cast Aluminium",
            "dimensions": "135×100 mm",
        },
    },
    {
        "category": "driver-units",
        "family": "MU",
        "sku": "MU-100",
        "wattage": "100W",
        "shop_slug": "mu-100",
        "specs": {
            "type": "Horn driver unit",
            "power": "100W RMS / 120W max",
            "response": "160-7000Hz",
            "impedance": "16Ω",
            "weight": "2.30 Kg",
            "material": "Die Cast Aluminium",
            "dimensions": "135×98 mm",
        },
    },
    {
        "category": "driver-units",
        "family": "MU-XT",
        "sku": "MU-40XT",
        "wattage": "40W",
        "shop_slug": "mu-40xt",
        "specs": {
            "type": "100V driver unit",
            "power": "40W RMS / 60W max",
            "response": "160-7000Hz",
            "impedance": "100V 40/30/20/10/5W",
            "weight": "2.20 Kg",
            "material": "Die Cast Aluminium",
            "dimensions": "150×137 mm",
        },
    },
    {
        "category": "driver-units",
        "family": "MU-XT",
        "sku": "MU-55XT",
        "wattage": "55W",
        "shop_slug": "mu-55xt",
        "specs": {
            "type": "100V driver unit",
            "power": "55W RMS / 90W max",
            "response": "160-7000Hz",
            "impedance": "100V 50/40/30/20/10W",
            "weight": "2.50 Kg",
            "material": "Die Cast Aluminium",
            "dimensions": "150×137 mm",
        },
    },
    {
        "category": "driver-units",
        "family": "MU-XT",
        "sku": "MU-60XT-FG",
        "wattage": "65W",
        "search": ["MU-60XT FG", "MU-60XT"],
        "pdf_page": DRIVER_PAGE,
        "specs": {
            "type": "100V driver unit",
            "power": "65W RMS / 100W max",
            "response": "160-7000Hz",
            "impedance": "100V 65/55/40/25/10W",
            "weight": "2.75 Kg",
            "material": "Die Cast Aluminium",
            "dimensions": "150×137 mm",
        },
    },
    {
        "category": "diaphragms",
        "family": "DIAPHRAGM",
        "sku": "MU-40/60",
        "wattage": "40/60W",
        "shop_slug": "mu-40-mu60",
        "specs": {
            "type": "Phenolic diaphragm",
            "power": "Fits MU-40 / MU-60",
            "material": "Reinforced phenolic, aluminium bobbin",
        },
    },
    {
        "category": "diaphragms",
        "family": "DIAPHRAGM",
        "sku": "MU-40XT/55XT",
        "wattage": "XT",
        "shop_slug": "mu40xt-mu55xt",
        "specs": {
            "type": "Phenolic diaphragm",
            "power": "Fits MU-40XT / MU-55XT",
            "material": "Reinforced phenolic, aluminium bobbin",
        },
    },
    {
        "category": "diaphragms",
        "family": "DIAPHRAGM",
        "sku": "SPECIAL-DIA",
        "wattage": "SPECIAL",
        "shop_slug": "speacial-dia",
        "specs": {
            "type": "Phenolic diaphragm",
            "power": "Special replacement diaphragm",
            "material": "Reinforced phenolic, aluminium bobbin",
        },
    },
    {
        "category": "pendulum-speakers",
        "family": "PENDULUM",
        "sku": "MX-650",
        "wattage": "75W",
        "pdf_page": PENDULUM_PAGE,
        "search": ["MX-650"],
        "specs": {
            "type": "Pendulum speaker",
            "power": "75W continuous / 150W program",
            "response": "58Hz – 18kHz",
            "spl": "~90dB SPL (1W/1m)",
            "impedance": "8Ω or 70V/100V",
        },
    },
    {
        "category": "pendulum-speakers",
        "family": "PENDULUM",
        "sku": "MXP-06",
        "slug": "mxp-06-pendulum",
        "wattage": "Active",
        "pdf_page": PENDULUM_PAGE,
        "search": ["MXP - 06", "MXP-06"],
        "specs": {
            "type": "Pendulum speaker",
            "power": "Active + passive",
            "material": "Black / white",
        },
    },
    {
        "category": "pendulum-speakers",
        "family": "PENDULUM",
        "sku": "MXP-04",
        "wattage": "LMT",
        "pdf_page": PENDULUM_PAGE,
        "search": ["MXP - 04", "MXP-04"],
        "specs": {
            "type": "Pendulum speaker",
            "power": "With LMT",
            "material": "Black / white",
        },
    },
]


def compact(s: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "", (s or "").upper())


def folder_sku(sku: str) -> str:
    return re.sub(r"[^\w.\-]+", "_", sku)


def slugify(sku: str) -> str:
    s = sku.lower().replace("/", "-").replace(" ", "-")
    s = re.sub(r"[^a-z0-9\-]+", "", s)
    return re.sub(r"-{2,}", "-", s).strip("-")


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


def shop_catalog_map(urls: list[str]) -> dict[str, str]:
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


def shop_product_image(slug: str) -> str | None:
    html = fetch(f"https://maxx-on.com/shop/{slug}/")
    if not html:
        return None
    text = html.decode("utf-8", errors="replace")
    m = re.search(
        r'<img[^>]+(?:wp-post-image|attachment-woocommerce)[^>]+src=["\']([^"\']+)["\']',
        text,
        re.I,
    )
    if not m:
        m = re.search(r'property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', text, re.I)
    if not m:
        return None
    return m.group(1).split("?")[0]


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
        if min(w, h) < 140 or max(w, h) < 180:
            continue
        if max(w, h) / min(w, h) > 3.4:
            continue
        rects = page.get_image_rects(xref) or []
        if not rects:
            continue
        rect = rects[0]
        found.append({"pix": pix, "w": w, "h": h, "rect": rect, "area": w * h, "xref": xref})
    found.sort(key=lambda x: -x["area"])
    return found


def save_pix(public: Path, folder: str, name: str, pix: pymupdf.Pixmap) -> None:
    dest = public / folder
    dest.mkdir(parents=True, exist_ok=True)
    tmp = dest / "_tmp.png"
    pix.save(tmp.as_posix())
    Image.open(tmp).convert("RGB").save(dest / name, "JPEG", quality=90)
    tmp.unlink(missing_ok=True)


def fill_from_pdf(products: list[dict]) -> None:
    if not PDF.exists():
        print("PDF missing, skip")
        return
    doc = pymupdf.open(PDF)
    missing = [p for p in products if not p["image_front"] and p.get("pdf_page") is not None]
    print(f"PDF fill for {len(missing)} missing fronts")
    used: set[int] = set()
    by_page: dict[int, list[dict]] = {}
    for p in missing:
        by_page.setdefault(p["pdf_page"], []).append(p)
    for page_i, items in by_page.items():
        page = doc[page_i]
        images = [im for im in collect_pdf_images(page, doc) if im["rect"].y1 > 50]
        for p in items:
            y = None
            for variant in [*p.get("search", []), p["sku"], p["sku"].replace("-", " ")]:
                hits = page.search_for(variant)
                if hits:
                    y = hits[0].y0
                    break
            candidates = [im for im in images if im["xref"] not in used] or images
            if not candidates:
                continue
            im = (
                min(candidates, key=lambda img: abs((img["rect"].y0 + img["rect"].y1) / 2 - y))
                if y is not None
                else candidates[0]
            )
            used.add(im["xref"])
            cat = CATEGORIES[p["category"]]
            save_pix(cat["public"], p["folder"], "front.jpg", im["pix"])
            p["image_front"] = f"/assets/products/{p['category']}/{p['folder']}/front.jpg"
            print(f"  {p['sku']} PDF p{page_i + 1} {im['w']}x{im['h']} y={y}")
    doc.close()


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


def write_banner(cat_id: str, products: list[dict]) -> None:
    meta = CATEGORIES[cat_id]
    BANNER_OUT = meta["banner"]
    BANNER_OUT.parent.mkdir(parents=True, exist_ok=True)
    target_w, target_h = 1600, 720
    by_sku = {p["sku"]: p for p in products}
    source = None
    for sku in meta["banner_skus"]:
        p = by_sku.get(sku)
        if not p or not p.get("image_front"):
            continue
        path = ROOT / "public" / p["image_front"].lstrip("/")
        if path.exists():
            source = Image.open(path)
            print(f"banner {cat_id} from {sku} {source.size}")
            break
    if source is None:
        print(f"no banner source for {cat_id}")
        return

    subject = knock_white(source)
    canvas = Image.new("RGB", (target_w, target_h), (8, 12, 18))
    glow = Image.new("RGB", (target_w, target_h), (22, 34, 48))
    mask = Image.new("L", (target_w, target_h), 0)
    for x in range(int(target_w * 0.35), target_w):
        t = (x - target_w * 0.35) / (target_w * 0.65)
        Image.Image.paste(mask, Image.new("L", (1, target_h), int(90 * t)), (x, 0))
    canvas = Image.composite(glow, canvas, mask)

    max_h = int(target_h * 0.9)
    max_w = int(target_w * 0.55)
    scale = min(max_w / subject.width, max_h / subject.height)
    subject = subject.resize(
        (int(subject.width * scale), int(subject.height * scale)), Image.Resampling.LANCZOS
    )
    x = target_w - subject.width - int(target_w * 0.05)
    y = (target_h - subject.height) // 2
    canvas.paste(subject, (x, y), subject)
    canvas.save(BANNER_OUT, "PNG")
    print(f"wrote {BANNER_OUT}")


def product_shell(row: dict) -> dict:
    sku = row["sku"]
    return {
        **row,
        "slug": row.get("slug") or slugify(sku),
        "model": sku.replace("-", " "),
        "folder": folder_sku(sku),
        "image_front": "",
        "image_back": "",
        "search": row.get("search") or [],
    }


def main() -> None:
    products = [product_shell(row) for row in PRODUCTS]
    shop_urls = []
    for meta in CATEGORIES.values():
        meta["public"].mkdir(parents=True, exist_ok=True)
        shop_urls.extend(meta["shop"])
    catalog = shop_catalog_map(shop_urls)

    for p in products:
        slug = p.get("shop_slug")
        if not slug:
            continue
        img_url = catalog.get(slug) or shop_product_image(slug)
        if not img_url:
            continue
        data = fetch(img_url)
        if not data:
            continue
        dest = CATEGORIES[p["category"]]["public"] / p["folder"] / "front.jpg"
        if save_jpeg(dest, data):
            p["image_front"] = f"/assets/products/{p['category']}/{p['folder']}/front.jpg"
            print(f"{p['sku']}: shop front")

    fill_from_pdf(products)

    by_cat: dict[str, list[dict]] = {cid: [] for cid in CATEGORIES}
    for p in products:
        if not p["image_front"]:
            print(f"drop no photo: {p['sku']}")
            continue
        by_cat[p["category"]].append(p)

    for cat_id, items in by_cat.items():
        write_banner(cat_id, items)
        grouped = {name: [] for name in CATEGORIES[cat_id]["families"]}
        for p in items:
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
        out = CATEGORIES[cat_id]["json"]
        out.write_text(json.dumps(grouped, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {out} kept={sum(len(v) for v in grouped.values())} families={list(grouped)}")


if __name__ == "__main__":
    main()
