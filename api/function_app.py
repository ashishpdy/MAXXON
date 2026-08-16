import json
import os

import azure.functions as func
from azure.cosmos import CosmosClient

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

META_FIELDS = frozenset(
    {
        "_rid",
        "_self",
        "_etag",
        "_attachments",
        "_ts",
        "categoryId",
        "family",
        "sortIndex",
        "id",
    }
)


def _client():
    return CosmosClient(os.environ["COSMOS_ENDPOINT"], credential=os.environ["COSMOS_KEY"])


def _public_product(doc):
    return {key: value for key, value in doc.items() if key not in META_FIELDS and not key.startswith("_")}


def assemble_catalogue():
    database = _client().get_database_client(os.environ.get("COSMOS_DATABASE", "maxxon"))
    products_container = database.get_container_client("products")
    meta_container = database.get_container_client("meta")
    nav = meta_container.read_item(item="nav", partition_key="nav")
    spec_keys = nav.get("specKeys") or {}
    categories_meta = nav.get("categories") or []

    by_category = {cat["id"]: {} for cat in categories_meta}
    items = products_container.query_items(
        query="SELECT * FROM c",
        enable_cross_partition_query=True,
    )
    rows = sorted(
        items,
        key=lambda doc: (doc.get("categoryId") or "", doc.get("family") or "", int(doc.get("sortIndex") or 0)),
    )
    for doc in rows:
        category_id = doc.get("categoryId")
        family = doc.get("family")
        if not category_id or not family or category_id not in by_category:
            continue
        by_category[category_id].setdefault(family, []).append(_public_product(doc))

    categories = []
    for cat in categories_meta:
        catalog = by_category.get(cat["id"]) or {}
        if not catalog:
            continue
        categories.append({**cat, "catalog": catalog})

    return {"specKeys": spec_keys, "categories": categories}


CORS_HEADERS = {
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


@app.route(route="catalogue", methods=["GET", "OPTIONS"])
def catalogue(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=CORS_HEADERS)
    try:
        payload = assemble_catalogue()
    except Exception as exc:  # noqa: BLE001 — return a clean 500 to the SWA
        return func.HttpResponse(
            json.dumps({"error": str(exc)}),
            status_code=500,
            mimetype="application/json",
            headers=CORS_HEADERS,
        )
    return func.HttpResponse(
        json.dumps(payload),
        status_code=200,
        mimetype="application/json",
        headers=CORS_HEADERS,
    )
