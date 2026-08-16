import hmac
import json
import os

import azure.functions as func
from azure.cosmos import CosmosClient, exceptions

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
        "id",
    }
)

CORS_HEADERS = {
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
}


def _client():
    return CosmosClient(os.environ["COSMOS_ENDPOINT"], credential=os.environ["COSMOS_KEY"])


def _products():
    database = _client().get_database_client(os.environ.get("COSMOS_DATABASE", "maxxon"))
    return database.get_container_client("products")


def _meta():
    database = _client().get_database_client(os.environ.get("COSMOS_DATABASE", "maxxon"))
    return database.get_container_client("meta")


def _json(payload, status=200):
    return func.HttpResponse(
        json.dumps(payload),
        status_code=status,
        mimetype="application/json",
        headers=CORS_HEADERS,
    )


def _public_product(doc):
    return {key: value for key, value in doc.items() if key not in META_FIELDS and not key.startswith("_")}


def _authorized(req: func.HttpRequest) -> bool:
    expected = os.environ.get("ADMIN_SECRET") or ""
    got = req.headers.get("x-admin-key") or ""
    if not expected or not got:
        return False
    return hmac.compare_digest(expected, got)


def assemble_catalogue():
    products_container = _products()
    nav = _meta().read_item(item="nav", partition_key="nav")
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


def _string_list(value):
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def apply_product_patch(doc, body):
    if "sku" in body:
        doc["sku"] = str(body.get("sku") or "").strip()
    if "model" in body:
        doc["model"] = str(body.get("model") or "").strip()
    if "wattage" in body:
        doc["wattage"] = str(body.get("wattage") or "").strip()
    if "description" in body:
        doc["description"] = str(body.get("description") or "").strip()
    if "image_front" in body:
        doc["image_front"] = str(body.get("image_front") or "").strip()
    if "image_back" in body:
        doc["image_back"] = str(body.get("image_back") or "").strip()
    if "features" in body:
        doc["features"] = _string_list(body.get("features"))
    if "images" in body:
        doc["images"] = _string_list(body.get("images"))
    if "specs" in body and isinstance(body.get("specs"), dict):
        doc["specs"] = {
            str(key).strip(): "" if value is None else str(value)
            for key, value in body["specs"].items()
            if str(key).strip()
        }
    if "sortIndex" in body:
        try:
            doc["sortIndex"] = int(body.get("sortIndex"))
        except (TypeError, ValueError):
            pass
    if "family" in body:
        family = str(body.get("family") or "").strip()
        if family:
            doc["family"] = family
    return doc


@app.route(route="catalogue", methods=["GET", "OPTIONS"])
def catalogue(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=CORS_HEADERS)
    try:
        payload = assemble_catalogue()
    except Exception as exc:  # noqa: BLE001
        return _json({"error": str(exc)}, 500)
    return _json(payload)


@app.route(route="staff/session", methods=["POST", "OPTIONS"])
def admin_session(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=CORS_HEADERS)
    if not (os.environ.get("ADMIN_SECRET") or ""):
        return _json({"error": "ADMIN_SECRET is not set on the Function App."}, 503)
    try:
        body = req.get_json()
    except ValueError:
        body = {}
    password = str((body or {}).get("password") or "")
    if not hmac.compare_digest(os.environ["ADMIN_SECRET"], password):
        return _json({"error": "Wrong password."}, 401)
    return _json({"ok": True})


@app.route(route="staff/product/{slug}", methods=["PUT", "OPTIONS"])
def admin_product(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=CORS_HEADERS)
    if not _authorized(req):
        return _json({"error": "Unauthorized."}, 401)
    slug = req.route_params.get("slug")
    try:
        body = req.get_json()
    except ValueError:
        return _json({"error": "Expected JSON."}, 400)
    body = body or {}
    category_id = str(body.get("categoryId") or "").strip()
    if not slug or not category_id:
        return _json({"error": "slug and categoryId are required."}, 400)
    try:
        doc = _products().read_item(item=slug, partition_key=category_id)
    except exceptions.CosmosResourceNotFoundError:
        return _json({"error": "Product not found."}, 404)
    updated = apply_product_patch(doc, body)
    _products().replace_item(item=updated, body=updated)
    return _json({"ok": True, "product": _public_product(updated)})
