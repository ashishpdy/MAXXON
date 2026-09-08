"""Ingest maxxon_calalog_v2.xlsx into Cosmos (canon catalogue).

- Product Name → sku / id / slug
- Details/Features: '|' → features[] + description
- Specifications: ';' label/value pairs → specs{}
- Images: fuzzy-match public/assets/products/{category}/{sku}/

Static src/styles/*.json is left untouched (legacy site fallback).

Usage:
  python scripts/ingest_catalog_v2.py            # upsert v2, replace other products
  python scripts/ingest_catalog_v2.py --dry-run  # print summary only
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "maxxon_calalog_v2.xlsx"
CATEGORIES_PATH = ROOT / "src" / "catalog" / "categories.json"
PUBLIC_PRODUCTS = ROOT / "public" / "assets" / "products"
PREVIEW_PATH = ROOT / "scripts" / "_v2_ingest_preview.json"

SPEC_LABEL_MAP = {
    "power output": "power",
    "power rating": "power",
    "input power": "power",
    "max. rated spl": "spl",
    "max rated spl": "spl",
    "rated spl": "spl",
    "frequency response": "response",
    "signal to noise ratio": "snr",
    "s/n ratio": "snr",
    "input channels": "inputs",
    "input connectors": "inputs",
    "inputs": "inputs",
    "impedance": "impedance",
    "nominal impedance": "impedance",
    "input impedance": "impedance",
    "weight": "weight",
    "dimensions": "dimensions",
    "sensitivity": "sensitivity",
    "tone controls": "type",
    "configuration": "type",
    "speaker outputs": "impedance",
    "power supply": "power",
    "power consumption": "power",
    "power requirement": "power",
}

# Image folder category → catalogue categoryId (nav).
IMAGE_CATEGORY_ALIAS = {
    "driver-units": "useless",
    "diaphragms": "useless",
    "pendulum-speakers": "speakers",
}

PREFIX_CATEGORY = [
    (re.compile(r"^(MBTZ|BTZ|MTZA|TZA|MSSA|MSSB|UTR|MXA|SSA|SPA|UBA|DXA|BR-)", re.I), "amplifiers"),
    (re.compile(r"^(MXM|CTP|AWM)", re.I), "microphones"),
    (re.compile(r"^MU\b|^MU-", re.I), "useless"),
    (re.compile(r"^(UHC|WFA|WFB|SUH|MH-)", re.I), "horns"),
    (re.compile(r"^DIAPH", re.I), "useless"),
    (re.compile(r"^(SCM|MSC|ASC|MCS|MBS|MSRX|MRX|MPX|MSP|MX-\d)", re.I), "speakers"),
    (re.compile(r"^(DGT|DGN|BMS|STA|ATS|CS-)", re.I), "stands"),
    (re.compile(r"^(ZM|PM-|MEGAPHONE)", re.I), "pa-systems"),
]


def load_env():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def normalize_cosmos_key(key: str) -> str:
    key = "".join(key.split())
    pad = (-len(key)) % 4
    if pad:
        key += "=" * pad
    return key


def clean_text(value: str) -> str:
    text = str(value or "")
    replacements = {
        "\u2126": "Ω",
        "\uf0b4": "Ω",
        "�": "",
        "\u00a0": " ",
        "‘": "'",
        "’": "'",
        "“": '"',
        "”": '"',
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def alnum_key_flex(value: str) -> str:
    """Match helper: treat letter O as zero in numeric SKU tails."""
    text = clean_text(value).upper().replace("®", "")
    text = re.sub(r"[^A-Z0-9]+", "", text)
    # SUH4OXT → SUH40XT
    text = re.sub(r"([0-9])O([0-9A-Z])", r"\g<1>0\g<2>", text)
    text = re.sub(r"O([0-9])", r"0\g<1>", text)
    return text


def slugify_sku(sku: str) -> str:
    text = clean_text(sku).lower().replace("®", "")
    text = text.replace('"', "").replace("″", "")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "product"


def display_model(sku: str) -> str:
    text = clean_text(sku).replace("®", "").replace('"', "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def family_from_sku(sku: str) -> str:
    text = clean_text(sku).upper().replace("®", "")
    match = re.match(r"^([A-Z]+)", text.replace(" ", "").replace("-", ""))
    if not match:
        return "MISC"
    fam = match.group(1)
    # Strip leading M from amp families when rest is a known series.
    if fam.startswith("M") and len(fam) > 2 and fam[1:] in {
        "BTZ", "TZA", "SSA", "SSB", "UBA", "XA",
    }:
        return fam[1:]
    if fam in {"MBTZ"}:
        return "BTZ"
    if fam in {"MTZA"}:
        return "MTZA"
    if fam in {"MSSA", "MSSB"}:
        return fam
    return fam


def split_description(raw: str) -> tuple[str, list[str]]:
    text = clean_text(raw)
    if not text or text.upper() == "NA":
        return "", []
    parts = [clean_text(part) for part in text.split("|")]
    parts = [part for part in parts if part and part.upper() != "NA"]
    if not parts:
        return "", []
    description = parts[0]
    features = parts[1:] if len(parts) > 1 else []
    # If only pipe-separated short bullets, use all as features and first as lede.
    if len(description) < 40 and features:
        features = parts
    return description, features


def parse_specs(raw: str) -> dict[str, str]:
    text = clean_text(raw).replace("\t", " ")
    if not text or text.upper() == "N/A":
        return {}
    tokens = [clean_text(tok) for tok in text.split(";")]
    tokens = [tok for tok in tokens if tok and tok != "."]
    specs: dict[str, str] = {}
    extras: dict[str, str] = {}
    i = 0
    while i < len(tokens) - 1:
        label = tokens[i]
        value = tokens[i + 1]
        # Skip if label looks like a value (starts with digit / unit-heavy) and next looks like label.
        label_key = re.sub(r"\s+", " ", label).strip()
        mapped = SPEC_LABEL_MAP.get(label_key.lower())
        if mapped:
            # Prefer first occurrence for canonical keys.
            specs.setdefault(mapped, value)
        else:
            slug = re.sub(r"[^a-z0-9]+", "_", label_key.lower()).strip("_")
            if slug:
                extras[slug] = value
        i += 2
    # Keep unknown labels under specs with original slug keys (UI showAll).
    for key, value in extras.items():
        if key not in specs:
            specs[key] = value
    return specs


def extract_wattage(specs: dict[str, str], description: str, sku: str) -> str:
    blob = " ".join([specs.get("power") or "", description, sku])
    match = re.search(r"(\d{2,5})\s*W\b", blob, re.I)
    if match:
        return f"{match.group(1)}W"
    # From SKU digits e.g. MTZA-7000EUR
    match = re.search(r"(\d{3,5})", sku.replace(" ", ""))
    if match and int(match.group(1)) >= 30:
        return f"{match.group(1)}W"
    return ""


def category_from_sku(sku: str) -> str:
    for pattern, category_id in PREFIX_CATEGORY:
        if pattern.search(sku):
            return category_id
    return "useless"


def build_image_index():
    """Map normalized folder keys → (image_category, folder_name, front, back)."""
    index = []
    if not PUBLIC_PRODUCTS.exists():
        return index
    for cat_dir in PUBLIC_PRODUCTS.iterdir():
        if not cat_dir.is_dir():
            continue
        for sku_dir in cat_dir.iterdir():
            if not sku_dir.is_dir():
                continue
            front = next(iter(sorted(sku_dir.glob("front.*"))), None)
            back = next(iter(sorted(sku_dir.glob("back.*"))), None)
            if not front:
                continue
            index.append(
                {
                    "image_category": cat_dir.name,
                    "folder": sku_dir.name,
                    "key": alnum_key_flex(sku_dir.name),
                    "front": f"/assets/products/{cat_dir.name}/{sku_dir.name}/{front.name}",
                    "back": (
                        f"/assets/products/{cat_dir.name}/{sku_dir.name}/{back.name}"
                        if back
                        else ""
                    ),
                }
            )
    return index


def match_images(sku: str, image_index: list[dict]) -> dict | None:
    keys = []
    base = alnum_key_flex(sku)
    keys.append(base)
    # Drop trailing EUR / FX / DP / XT noise gradually
    for suffix in ("EUR", "FXR", "FX", "DP", "XT", "TEUR"):
        if base.endswith(suffix) and len(base) > len(suffix) + 2:
            keys.append(base[: -len(suffix)])
    # Leading M strip for amp-like codes
    if base.startswith("M") and len(base) > 4:
        keys.append(base[1:])
    # SCM ↔ MSC
    if base.startswith("SCM"):
        keys.append("MSC" + base[3:])
    if base.startswith("MSC"):
        keys.append("SCM" + base[3:])
    # Combined horn folders SUH4040XT
    if base.startswith("SUH") or base.startswith("UHC"):
        keys.append(base + base[-2:] if False else base)
        # UHC30XT → UHC3030XT pattern in folders UHC-30_30XT
        m = re.match(r"^(SUH|UHC)(\d+)(XT)?$", base)
        if m:
            keys.append(f"{m.group(1)}{m.group(2)}{m.group(2)}XT")
            keys.append(f"{m.group(1)}{m.group(2)}{m.group(2)}")

    keys = list(dict.fromkeys(k for k in keys if k))

    by_key = {item["key"]: item for item in image_index}
    for key in keys:
        if key in by_key:
            return by_key[key]

    # Fuzzy: unique containment
    candidates = []
    for item in image_index:
        fk = item["key"]
        for key in keys:
            if len(key) >= 4 and (key in fk or fk in key):
                candidates.append((abs(len(fk) - len(key)), item))
                break
    if not candidates:
        return None
    candidates.sort(key=lambda row: row[0])
    best_score = candidates[0][0]
    best = [item for score, item in candidates if score == best_score]
    if len(best) == 1:
        return best[0]
    return None


def load_xlsx_rows(path: Path) -> list[dict]:
    try:
        import openpyxl
    except ImportError as exc:
        raise SystemExit("Install openpyxl: pip install openpyxl") from exc
    if not path.exists():
        raise SystemExit(f"Missing workbook: {path}")
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(wb.active.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return []
    header = [clean_text(cell or "") for cell in rows[0]]
    # Expect Product Name / Details / Specs — tolerate column order by name.
    name_i = next((i for i, h in enumerate(header) if "product" in h.lower() and "name" in h.lower()), 0)
    desc_i = next((i for i, h in enumerate(header) if "detail" in h.lower() or "feature" in h.lower()), 1)
    spec_i = next((i for i, h in enumerate(header) if "spec" in h.lower()), 2)
    out = []
    for raw in rows[1:]:
        if not raw or raw[name_i] is None:
            continue
        name = clean_text(raw[name_i])
        if not name or name.lower() == "product name":
            continue
        desc = clean_text(raw[desc_i] if len(raw) > desc_i else "")
        specs = clean_text(raw[spec_i] if len(raw) > spec_i else "")
        out.append({"name": name, "details": desc, "specifications": specs})
    return out


def build_products(rows: list[dict], image_index: list[dict]) -> list[dict]:
    by_slug: dict[str, dict] = {}
    sort_counters: dict[str, int] = defaultdict(int)

    for row in rows:
        sku = row["name"]
        slug = slugify_sku(sku)
        description, features = split_description(row["details"])
        specs = parse_specs(row["specifications"])
        wattage = extract_wattage(specs, description, sku)
        family = family_from_sku(sku)
        image = match_images(sku, image_index)
        if image:
            image_category = image["image_category"]
            category_id = IMAGE_CATEGORY_ALIAS.get(image_category, image_category)
            image_front = image["front"]
            image_back = image["back"]
        else:
            category_id = category_from_sku(sku)
            image_front = ""
            image_back = ""

        # Known nav categories only — fall back.
        allowed = {
            "amplifiers",
            "microphones",
            "speakers",
            "mixers",
            "horns",
            "useless",
            "pa-systems",
            "stands",
        }
        if category_id not in allowed:
            category_id = category_from_sku(sku)
            if category_id not in allowed:
                category_id = "useless"

        doc = {
            "id": slug,
            "productId": slug,
            "sku": sku,
            "slug": slug,
            "model": display_model(sku),
            "wattage": wattage,
            "description": description,
            "features": features,
            "specs": specs,
            "image_front": image_front,
            "image_back": image_back,
            "images": [],
            "tags": [],
            "categoryId": category_id,
            "family": family,
            "source": "maxxon_calalog_v2.xlsx",
        }

        existing = by_slug.get(slug)
        if existing:
            # Prefer richer row on duplicate SKUs.
            score_new = len(doc["description"]) + len(json.dumps(doc["specs"])) + len(doc["features"])
            score_old = len(existing["description"]) + len(json.dumps(existing["specs"])) + len(existing["features"])
            if score_new <= score_old:
                continue
            doc["sortIndex"] = existing.get("sortIndex", 0)
        else:
            doc["sortIndex"] = sort_counters[category_id]
            sort_counters[category_id] += 1
        by_slug[slug] = doc

    return sorted(by_slug.values(), key=lambda d: (d["categoryId"], d["family"], d["sortIndex"], d["sku"]))


def upsert_cosmos(products: list[dict], *, replace: bool) -> None:
    from azure.cosmos import CosmosClient, PartitionKey
    from azure.cosmos import exceptions as cosmos_exceptions

    load_env()
    endpoint = os.environ.get("COSMOS_ENDPOINT")
    key = os.environ.get("COSMOS_KEY")
    database_name = os.environ.get("COSMOS_DATABASE", "maxxon")
    if not endpoint or not key:
        raise SystemExit("Set COSMOS_ENDPOINT and COSMOS_KEY in .env")
    key = normalize_cosmos_key(key)

    categories_file = json.loads(CATEGORIES_PATH.read_text(encoding="utf-8"))
    client = CosmosClient(endpoint, credential=key)
    database = client.create_database_if_not_exists(id=database_name)
    # Live container PK is /productId (create_if_not_exists will not change an existing container).
    products_container = database.create_container_if_not_exists(
        id="products",
        partition_key=PartitionKey(path="/productId"),
    )
    meta = database.create_container_if_not_exists(
        id="meta",
        partition_key=PartitionKey(path="/id"),
    )

    nav = {
        "id": "nav",
        "categories": categories_file["categories"],
        "specKeys": categories_file.get("specKeys") or {},
    }
    print("Upserting nav…", flush=True)
    meta.upsert_item(nav)

    keep_ids = {doc["id"] for doc in products}
    print(f"Upserting {len(products)} v2 products…", flush=True)
    for index, doc in enumerate(products, start=1):
        products_container.upsert_item(doc)
        if index % 10 == 0 or index == len(products):
            print(f"  upserted {index}/{len(products)}", flush=True)

    if replace:
        from azure.cosmos.partition_key import NonePartitionKeyValue

        print("Scanning for legacy products to delete…", flush=True)
        existing = list(
            products_container.query_items(
                query="SELECT c.id, c.productId, c.source FROM c",
                enable_cross_partition_query=True,
            )
        )
        deleted = 0
        for item in existing:
            item_id = item.get("id")
            if not item_id:
                continue
            product_id = item.get("productId")
            is_keeper = (
                item_id in keep_ids
                and item.get("source") == "maxxon_calalog_v2.xlsx"
                and product_id == item_id
            )
            if is_keeper:
                continue
            partition_key = product_id if product_id not in (None, "") else NonePartitionKeyValue
            try:
                products_container.delete_item(item=item_id, partition_key=partition_key)
                deleted += 1
                if deleted % 25 == 0:
                    print(f"  deleted {deleted}…", flush=True)
            except cosmos_exceptions.CosmosResourceNotFoundError:
                continue
        print(f"Deleted {deleted} legacy products (scanned {len(existing)}).", flush=True)

    print(f"Done: nav + {len(products)} products in {database_name}.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Parse and summarize only")
    parser.add_argument(
        "--keep-existing",
        action="store_true",
        help="Do not delete products missing from v2 (default replaces catalogue)",
    )
    parser.add_argument("--xlsx", type=Path, default=XLSX)
    args = parser.parse_args()

    rows = load_xlsx_rows(args.xlsx)
    image_index = build_image_index()
    products = build_products(rows, image_index)

    matched = sum(1 for p in products if p["image_front"])
    by_cat: dict[str, int] = defaultdict(int)
    for product in products:
        by_cat[product["categoryId"]] += 1

    preview = {
        "source": str(args.xlsx.name),
        "row_count": len(rows),
        "product_count": len(products),
        "images_matched": matched,
        "by_category": dict(sorted(by_cat.items())),
        "products": products,
    }
    PREVIEW_PATH.write_text(json.dumps(preview, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Rows={len(rows)} products={len(products)} images={matched}/{len(products)}")
    print("By category:", dict(sorted(by_cat.items())))
    print(f"Wrote preview {PREVIEW_PATH.relative_to(ROOT)}")

    unmatched = [p["sku"] for p in products if not p["image_front"]]
    if unmatched:
        print("No image match:", ", ".join(unmatched))

    if args.dry_run:
        return

    upsert_cosmos(products, replace=not args.keep_existing)


if __name__ == "__main__":
    main()
