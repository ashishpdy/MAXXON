"""Delete Cosmos products that are not from maxxon_calalog_v2.xlsx.

Handles the live /productId partition key, including legacy docs written
without productId (undefined partition key).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from ingest_catalog_v2 import load_env, normalize_cosmos_key  # noqa: E402


def _partition_key(item: dict):
    from azure.cosmos.partition_key import NonePartitionKeyValue

    product_id = item.get("productId")
    if product_id in (None, ""):
        return NonePartitionKeyValue
    return product_id


def main():
    from azure.cosmos import CosmosClient
    from azure.cosmos import exceptions as cosmos_exceptions

    load_env()
    endpoint = os.environ["COSMOS_ENDPOINT"]
    key = normalize_cosmos_key(os.environ["COSMOS_KEY"])
    database_name = os.environ.get("COSMOS_DATABASE", "maxxon")
    client = CosmosClient(endpoint, credential=key)
    container = client.get_database_client(database_name).get_container_client("products")

    rows = list(
        container.query_items(
            query="SELECT c.id, c.productId, c.categoryId, c.sku, c.source FROM c",
            enable_cross_partition_query=True,
        )
    )
    print(f"scanned {len(rows)}", flush=True)
    for item in rows[:5]:
        print("sample", item, flush=True)

    v2 = 0
    legacy = 0
    deleted = 0
    for item in rows:
        src = item.get("source")
        product_id = item.get("productId")
        # Keep only properly partitioned v2 docs.
        if src == "maxxon_calalog_v2.xlsx" and product_id and product_id == item.get("id"):
            v2 += 1
            continue
        legacy += 1
        item_id = item.get("id")
        if not item_id:
            print(f"skip missing id sku={item.get('sku')!r}", flush=True)
            continue
        pk = _partition_key(item)
        try:
            container.delete_item(item=item_id, partition_key=pk)
            deleted += 1
            if deleted % 25 == 0:
                print(f"  deleted {deleted}…", flush=True)
        except cosmos_exceptions.CosmosResourceNotFoundError:
            print(f"not found id={item_id} pk={product_id!r}", flush=True)
    print(f"v2_kept={v2} legacy={legacy} deleted={deleted}", flush=True)


if __name__ == "__main__":
    main()
