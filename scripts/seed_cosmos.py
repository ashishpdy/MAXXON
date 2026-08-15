"""Upsert the bundled MAXXON catalogue into Cosmos DB.

Reads COSMOS_ENDPOINT, COSMOS_KEY, and COSMOS_DATABASE from the environment
or a repo-root .env file.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from azure.cosmos import CosmosClient, PartitionKey

ROOT = Path(__file__).resolve().parents[1]
STYLES = ROOT / "src" / "styles"
CATEGORIES_PATH = ROOT / "src" / "catalog" / "categories.json"


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


def main():
    load_env()
    endpoint = os.environ.get("COSMOS_ENDPOINT")
    key = os.environ.get("COSMOS_KEY")
    database_name = os.environ.get("COSMOS_DATABASE", "maxxon")
    if not endpoint or not key:
        sys.exit("Set COSMOS_ENDPOINT and COSMOS_KEY (app settings or .env).")
    key = normalize_cosmos_key(key)

    categories_file = json.loads(CATEGORIES_PATH.read_text(encoding="utf-8"))
    client = CosmosClient(endpoint, credential=key)
    database = client.create_database_if_not_exists(id=database_name)
    products = database.create_container_if_not_exists(id="products", partition_key=PartitionKey(path="/categoryId"))
    meta = database.create_container_if_not_exists(id="meta", partition_key=PartitionKey(path="/id"))

    nav = {
        "id": "nav",
        "categories": categories_file["categories"],
        "specKeys": categories_file.get("specKeys") or {},
    }
    meta.upsert_item(nav)

    count = 0
    for cat in categories_file["categories"]:
        style_path = STYLES / f"{cat['id']}.json"
        if not style_path.exists():
            continue
        catalog = json.loads(style_path.read_text(encoding="utf-8"))
        for family, items in catalog.items():
            for index, product in enumerate(items):
                slug = product.get("slug") or str(product.get("sku", "")).lower()
                if not slug:
                    continue
                doc = {
                    **product,
                    "id": slug,
                    "categoryId": cat["id"],
                    "family": family,
                    "sortIndex": index,
                    "images": product.get("images") or [],
                    "tags": product.get("tags") or [],
                }
                products.upsert_item(doc)
                count += 1

    print(f"Upserted nav and {count} products into {database_name}.")


if __name__ == "__main__":
    main()
