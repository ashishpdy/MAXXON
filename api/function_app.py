import base64
import hmac
import json
import os
import re
import uuid
from urllib.parse import unquote, urlparse

import azure.functions as func
from azure.cosmos import CosmosClient, exceptions
from azure.storage.blob import BlobServiceClient, ContentSettings

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

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_IMAGE_BYTES = 8 * 1024 * 1024
EXT_TO_TYPE = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
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


def _clean_slug(value):
    if isinstance(value, (list, tuple)):
        value = value[0] if value else ""
    text = unquote(str(value or "")).strip().strip("/")
    return text


def _requested_slug(req: func.HttpRequest, body):
    body = body or {}
    path = urlparse(req.url).path
    path_slug = ""
    for marker in ("/staff/product/",):
        if marker in path:
            rest = path.split(marker, 1)[-1]
            path_slug = rest.split("/")[0]
            break
    candidates = [
        body.get("slug"),
        body.get("id"),
        path_slug,
        (req.route_params or {}).get("slug"),
    ]
    for raw in candidates:
        slug = _clean_slug(raw)
        if slug:
            return slug
    return ""


def _find_product(slug, category_id):
    container = _products()
    if slug and category_id:
        try:
            return container.read_item(item=slug, partition_key=category_id)
        except exceptions.CosmosResourceNotFoundError:
            pass
    rows = list(
        container.query_items(
            query="SELECT * FROM c WHERE c.id = @slug OR c.slug = @slug",
            parameters=[{"name": "@slug", "value": slug}],
            enable_cross_partition_query=True,
        )
    )
    if category_id:
        for row in rows:
            if row.get("categoryId") == category_id:
                return row
    if len(rows) == 1:
        return rows[0]
    return rows[0] if rows else None


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


def product_image_list(doc):
    extras = doc.get("images") if isinstance(doc.get("images"), list) else []
    urls = [doc.get("image_front"), doc.get("image_back"), *extras]
    cleaned = []
    for item in urls:
        text = str(item or "").strip()
        if text and text not in cleaned:
            cleaned.append(text)
    return cleaned


def apply_image_list(doc, urls):
    cleaned = []
    for item in urls or []:
        text = str(item or "").strip()
        if text and text not in cleaned:
            cleaned.append(text)
    doc["image_front"] = cleaned[0] if cleaned else ""
    doc["image_back"] = cleaned[1] if len(cleaned) > 1 else ""
    doc["images"] = cleaned[2:]
    return doc


def apply_product_patch(doc, body):
    if "sku" in body:
        doc["sku"] = str(body.get("sku") or "").strip()
    if "model" in body:
        doc["model"] = str(body.get("model") or "").strip()
    if "wattage" in body:
        doc["wattage"] = str(body.get("wattage") or "").strip()
    if "description" in body:
        doc["description"] = str(body.get("description") or "").strip()
    if "features" in body:
        doc["features"] = _string_list(body.get("features"))
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
    if "urls" in body and isinstance(body.get("urls"), list):
        apply_image_list(doc, body.get("urls"))
    else:
        if "image_front" in body:
            doc["image_front"] = str(body.get("image_front") or "").strip()
        if "image_back" in body:
            doc["image_back"] = str(body.get("image_back") or "").strip()
        if "images" in body:
            doc["images"] = _string_list(body.get("images"))
    return doc


def _blob_service():
    connection = os.environ.get("BLOB_CONNECTION_STRING") or os.environ.get("AzureWebJobsStorage") or ""
    if not connection or connection == "UseDevelopmentStorage=true":
        raise RuntimeError("BLOB_CONNECTION_STRING is not set on the Function App.")
    return BlobServiceClient.from_connection_string(connection)


def _blob_container_name():
    return os.environ.get("BLOB_CONTAINER") or "products"


def _file_ext(filename):
    name = str(filename or "").strip().lower()
    if "." not in name:
        return ""
    return f".{name.rsplit('.', 1)[-1]}"


def _normalize_content_type(content_type, filename=""):
    raw = str(content_type or "").strip().lower()
    if ";" in raw:
        raw = raw.split(";", 1)[0].strip()
    if raw in {"image/jpg", "image/pjpeg"}:
        return "image/jpeg"
    if raw in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        return raw
    return EXT_TO_TYPE.get(_file_ext(filename), raw)


def _safe_filename(name, content_type):
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", str(name or "").strip()) or "image"
    base = base.strip(".-") or "image"
    ext = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" }.get(
        content_type, _file_ext(base) or ".jpg"
    )
    if "." in base:
        stem, current_ext = base.rsplit(".", 1)
        if f".{current_ext.lower()}" in EXT_TO_TYPE:
            return f"{stem[:48]}-{uuid.uuid4().hex[:8]}.{current_ext.lower()}"
    return f"{base[:48]}-{uuid.uuid4().hex[:8]}{ext}"


def upload_product_image(category_id, slug, filename, content_type, raw_bytes):
    content_type = _normalize_content_type(content_type, filename)
    if content_type not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        raise ValueError(f"Only JPEG, PNG, WebP, or GIF images are allowed (got {content_type or 'unknown'}).")
    if not raw_bytes:
        raise ValueError("Empty image.")
    if len(raw_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Image must be 8MB or smaller.")
    service = _blob_service()
    container_name = _blob_container_name()
    container = service.get_container_client(container_name)
    try:
        container.get_container_properties()
    except Exception:  # noqa: BLE001
        container.create_container(public_access="blob")
    blob_name = f"{category_id}/{slug}/{_safe_filename(filename, content_type)}"
    blob = container.get_blob_client(blob_name)
    blob.upload_blob(
        raw_bytes,
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
    )
    return blob.url


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
    try:
        body = req.get_json()
    except ValueError:
        return _json({"error": "Expected JSON."}, 400)
    body = body or {}
    slug = _requested_slug(req, body)
    category_id = str(body.get("categoryId") or "").strip()
    if not slug:
        return _json({"error": "slug is required."}, 400)
    doc = _find_product(slug, category_id)
    if not doc:
        return _json({"error": f"Product not found ({slug})."}, 404)
    updated = apply_product_patch(doc, body)
    _products().replace_item(item=updated, body=updated)
    return _json({"ok": True, "product": _public_product(updated)})


@app.route(route="staff/product/{slug}/images", methods=["POST", "OPTIONS"])
def admin_product_images(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=CORS_HEADERS)
    if not _authorized(req):
        return _json({"error": "Unauthorized."}, 401)
    try:
        body = req.get_json()
    except ValueError:
        return _json({"error": "Expected JSON."}, 400)
    body = body or {}
    slug = _requested_slug(req, body)
    category_id = str(body.get("categoryId") or "").strip()
    action = str(body.get("action") or "set").strip().lower()
    if not slug:
        return _json({"error": "slug is required."}, 400)
    doc = _find_product(slug, category_id)
    if not doc:
        return _json({"error": f"Product not found ({slug})."}, 404)

    if action == "upload":
        content_type = _normalize_content_type(body.get("contentType"), body.get("filename") or "image.jpg")
        filename = str(body.get("filename") or "image.jpg").strip()
        data = str(body.get("data") or "")
        if "," in data and data.strip().lower().startswith("data:"):
            data = data.split(",", 1)[1]
        data = "".join(data.split())
        try:
            raw = base64.b64decode(data, validate=False)
        except Exception:  # noqa: BLE001
            return _json({"error": "Invalid image data."}, 400)
        try:
            url = upload_product_image(doc.get("categoryId") or category_id, slug, filename, content_type, raw)
        except ValueError as exc:
            return _json({"error": str(exc)}, 400)
        except Exception as exc:  # noqa: BLE001
            return _json({"error": f"Upload failed: {exc}"}, 500)
        urls = product_image_list(doc)
        urls.append(url)
        apply_image_list(doc, urls)
        _products().replace_item(item=doc, body=doc)
        return _json({"ok": True, "url": url, "urls": product_image_list(doc), "product": _public_product(doc)})

    if action == "set":
        apply_image_list(doc, body.get("urls") or [])
        _products().replace_item(item=doc, body=doc)
        return _json({"ok": True, "urls": product_image_list(doc), "product": _public_product(doc)})

    return _json({"error": "action must be upload or set."}, 400)


@app.route(route="staff/reorder", methods=["POST", "OPTIONS"])
def admin_reorder(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=CORS_HEADERS)
    if not _authorized(req):
        return _json({"error": "Unauthorized."}, 401)
    try:
        body = req.get_json()
    except ValueError:
        return _json({"error": "Expected JSON."}, 400)
    body = body or {}
    category_id = str(body.get("categoryId") or "").strip()
    family = str(body.get("family") or "").strip()
    slugs = _string_list(body.get("slugs") or [])
    if not category_id or not family or not slugs:
        return _json({"error": "categoryId, family, and slugs are required."}, 400)
    container = _products()
    updated = []
    for index, slug in enumerate(slugs):
        doc = _find_product(slug, category_id)
        if not doc:
            return _json({"error": f"Product not found ({slug})."}, 404)
        if doc.get("categoryId") != category_id:
            return _json({"error": f"{slug} is not in category {category_id}."}, 400)
        if (doc.get("family") or "") != family:
            return _json({"error": f"{slug} is not in family {family}."}, 400)
        doc["sortIndex"] = index
        container.replace_item(item=doc, body=doc)
        updated.append({"slug": slug, "sortIndex": index})
    return _json({"ok": True, "updated": updated})
