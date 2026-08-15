"""Extract MAXX-ON mixers from shop accessories + the 2026 catalogue."""

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
JSON_OUT = ROOT / "src" / "styles" / "mixers.json"
PUBLIC = ROOT / "public" / "assets" / "products" / "mixers"
STAGING = ROOT / "assets" / "products" / "mixers"
BANNER_OUT = ROOT / "public" / "assets" / "banners" / "mixers.png"

UA = {"User-Agent": "Mozilla/5.0 (compatible; MAXXON-extract/0.3)"}

HEADING = re.compile(r"^ACCESSORIES\s+(\d+\s+CHANNEL MIXER)$", re.M)
NEXT_CUT = re.compile(
    r"\n(?:AMPLIFIER|MICROPHONE|ACCESSORIES|HORN|PORTABLE PA|STANDS|SPEAKER|DIAPHRAGMS)\b"
)

FAMILY_ORDER = ["MJK", "MAJ", "USB", "POWER"]

SHOP_PAGES = [
    "https://maxx-on.com/product-category/accessories/console-mixer/",
]

SHOP_IMAGES = {
    "8-CHANNEL-MIXER": "https://maxx-on.com/wp-content/uploads/2024/10/8-channel-mixer.png",
    "12-CHANNEL-MIXER": "https://maxx-on.com/wp-content/uploads/2024/10/12-channel-mixer.jpg",
    "16-CHANNEL-MIXER": "https://maxx-on.com/wp-content/uploads/2024/10/16-channel-mixer.jpg",
}

PDF_PRODUCTS = [
    {
        "family": "MJK",
        "sku": "MJK-16",
        "search": ["MJK - 16", "MJK-16"],
        "wattage": "16 CH",
        "specs": {
            "type": "Console mixer",
            "inputs": "16 mic + 2 stereo",
            "power": "+48V phantom, USB/SD, Bluetooth, DSP FX",
        },
    },
    {
        "family": "MJK",
        "sku": "MJK-12",
        "search": ["MJK - 12", "MJK-12"],
        "wattage": "12 CH",
        "specs": {
            "type": "Console mixer",
            "inputs": "12 mic + 2 stereo",
            "power": "+48V phantom, USB/SD, Bluetooth, DSP FX",
        },
    },
    {
        "family": "MJK",
        "sku": "MJK-8",
        "search": ["MJK - 8", "MJK-8"],
        "wattage": "8 CH",
        "specs": {
            "type": "Console mixer",
            "inputs": "8 mic + 2 stereo",
            "power": "+48V phantom, USB/SD, Bluetooth, DSP FX",
        },
    },
    {
        "family": "MAJ",
        "sku": "MAJ-12",
        "search": ["MAJ - 12", "MAJ-12"],
        "wattage": "12 CH",
        "specs": {
            "type": "Console mixer",
            "inputs": "12 mic + 2 stereo",
            "power": "+48V phantom, USB, Bluetooth, 7-band EQ",
        },
    },
    {
        "family": "MAJ",
        "sku": "MAJ-8",
        "search": ["MAJ - 8", "MAJ-8"],
        "wattage": "8 CH",
        "specs": {
            "type": "Console mixer",
            "inputs": "8 mic + 2 stereo",
            "power": "+48V phantom, USB, Bluetooth, 7-band EQ",
        },
    },
    {
        "family": "POWER",
        "sku": "MXP-012",
        "search": ["MXP-012"],
        "wattage": "2×500W",
        "specs": {
            "type": "Power mixer",
            "inputs": "12 mic",
            "power": "500W × 2, 99 DSP FX, +48V phantom",
        },
    },
    {
        "family": "POWER",
        "sku": "MXP-08",
        "search": ["MXP-08"],
        "wattage": "2×400W",
        "specs": {
            "type": "Power mixer",
            "inputs": "8 mic",
            "power": "400W × 2, 99 DSP FX, +48V phantom",
        },
    },
    {
        "family": "POWER",
        "sku": "MXP-06",
        "search": ["MXP-06"],
        "wattage": "2×300W",
        "specs": {
            "type": "Power mixer",
            "inputs": "6 mic",
            "power": "300W × 2, 99 DSP FX, +48V phantom",
        },
    },
]


def clip(v: str, n: int = 90) -> str:
    v = re.sub(r"\s+", " ", (v or "")).strip()
    return v if len(v) <= n else v[: n - 1] + "…"


def compact(s: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "", (s or "").upper())


def normalize_sku(raw: str) -> str:
    s = re.sub(r"\s+", " ", raw.strip())
    s = s.replace(" – ", "-").replace("–", "-")
    s = re.sub(r"\s*-\s*", "-", s)
    s = re.sub(r"\s+", "-", s)
    return s.strip("-")


def folder_sku(sku: str) -> str:
    return re.sub(r"[^\w.\-]+", "_", sku)


def slugify(sku: str) -> str:
    s = sku.lower().replace("/", "-").replace(" ", "-")
    s = re.sub(r"[^a-z0-9\-]+", "", s)
    return re.sub(r"-{2,}", "-", s).strip("-")


def channels_from(sku: str) -> str:
    m = re.search(r"(\d+)[\s-]*CHANNEL", sku, re.I)
    return f"{m.group(1)} CH" if m else "—"


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


def product_shell(family: str, sku: str, wattage: str, specs: dict) -> dict:
    return {
        "family": family,
        "sku": sku,
        "slug": slugify(sku),
        "model": sku.replace("-", " "),
        "folder": folder_sku(sku),
        "wattage": wattage,
        "image_front": "",
        "image_back": "",
        "specs": {k: v for k, v in specs.items() if v},
        "search": [],
    }


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
    mapping.update({slugify(sku): url for sku, url in SHOP_IMAGES.items()})
    return mapping


def parse_dump_usb() -> list[dict]:
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
        note = "MP3, digital FX, 48V phantom (4 ch)"
        ch = re.search(r"(\d+)", sku)
        products.append(
            product_shell(
                "USB",
                sku,
                channels_from(sku),
                {
                    "type": "Compact mixer",
                    "inputs": f"{ch.group(1)} channels" if ch else "Channels",
                    "power": note,
                },
            )
        )
    products.sort(key=lambda p: -int(re.search(r"(\d+)", p["sku"]).group(1)))
    return products


def pdf_products() -> list[dict]:
    items = []
    for row in PDF_PRODUCTS:
        p = product_shell(row["family"], row["sku"], row["wattage"], row["specs"])
        p["search"] = row["search"]
        items.append(p)
    return items


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
        if min(w, h) < 250 or max(w, h) < 320:
            continue
        if max(w, h) / min(w, h) > 2.5:
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


def fill_from_pdf(products: list[dict]) -> None:
    if not PDF.exists():
        print("PDF missing, skip")
        return
    doc = pymupdf.open(PDF)
    missing = [p for p in products if not p["image_front"]]
    mixer_pages = range(46, 49)
    print(f"PDF fill for {len(missing)} missing fronts, pages 47-49")

    page_hits: dict[int, list[dict]] = {}
    for p in missing:
        needles = [compact(p["sku"])] + [compact(s) for s in p.get("search") or []]
        for i in mixer_pages:
            text = compact(doc[i].get_text("text"))
            if any(n and n in text for n in needles):
                page_hits.setdefault(i, []).append(p)
                break

    used: set[int] = set()
    for page_i, items in page_hits.items():
        page = doc[page_i]
        images = [im for im in collect_pdf_images(page, doc) if im["rect"].y1 > 50]
        if not images:
            continue
        for p in items:
            y = None
            for variant in [*p.get("search", []), p["sku"], p["sku"].replace("-", " ")]:
                hits = page.search_for(variant)
                if hits:
                    y = hits[0].y0
                    break
            candidates = [im for im in images if im["xref"] not in used] or images
            im = (
                min(candidates, key=lambda img: abs((img["rect"].y0 + img["rect"].y1) / 2 - y))
                if y is not None
                else candidates[0]
            )
            used.add(im["xref"])
            save_pix(p["folder"], "front.jpg", im["pix"])
            p["image_front"] = f"/assets/products/mixers/{p['folder']}/front.jpg"
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


def write_banner(products: list[dict]) -> None:
    BANNER_OUT.parent.mkdir(parents=True, exist_ok=True)
    target_w, target_h = 1600, 720
    preferred = ("MJK-16", "16-CHANNEL-MIXER", "MAJ-12", "MXP-012")
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

    mixer = knock_white(source)
    canvas = Image.new("RGB", (target_w, target_h), (8, 12, 18))
    glow = Image.new("RGB", (target_w, target_h), (22, 34, 48))
    mask = Image.new("L", (target_w, target_h), 0)
    for x in range(int(target_w * 0.35), target_w):
        t = (x - target_w * 0.35) / (target_w * 0.65)
        Image.Image.paste(mask, Image.new("L", (1, target_h), int(90 * t)), (x, 0))
    canvas = Image.composite(glow, canvas, mask)

    max_h = int(target_h * 0.9)
    max_w = int(target_w * 0.62)
    scale = min(max_w / mixer.width, max_h / mixer.height)
    mixer = mixer.resize((int(mixer.width * scale), int(mixer.height * scale)), Image.Resampling.LANCZOS)
    x = target_w - mixer.width - int(target_w * 0.04)
    y = (target_h - mixer.height) // 2
    canvas.paste(mixer, (x, y), mixer)
    canvas.save(BANNER_OUT, "PNG")
    print(f"wrote {BANNER_OUT}")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    STAGING.mkdir(parents=True, exist_ok=True)
    products = pdf_products() + parse_dump_usb()
    print(f"products={len(products)} {[p['sku'] for p in products]}")
    catalog = shop_catalog_map()

    for p in products:
        img_url = SHOP_IMAGES.get(p["sku"]) or catalog.get(p["slug"])
        if not img_url:
            continue
        data = fetch(img_url)
        if not data:
            continue
        dest = PUBLIC / p["folder"] / "front.jpg"
        if save_jpeg(dest, data):
            copy_to_both(dest, p["folder"], "front.jpg")
            p["image_front"] = f"/assets/products/mixers/{p['folder']}/front.jpg"
            print(f"{p['sku']}: shop front")

    fill_from_pdf(products)
    write_banner(products)

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
