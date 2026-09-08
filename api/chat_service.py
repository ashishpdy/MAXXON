"""Catalogue-grounded chat helpers for the MAXXON Function App."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any


STOP = frozenset(
    {"a", "an", "the", "for", "of", "and", "or", "with", "to", "in", "on", "me", "show", "find", "get"}
)

CATEGORY_ALIASES = {
    "amplifiers": ["amp", "amps", "amplifier", "amplifiers", "power amp", "poweramps"],
    "microphones": ["mic", "mics", "microphone", "microphones", "wireless"],
    "speakers": ["speaker", "speakers", "cabinet", "cabinets", "loudspeaker"],
    "mixers": ["mixer", "mixers", "console", "consoles"],
    "horns": ["horn", "horns", "driver", "drivers"],
    "pa-systems": ["pa", "pasystem", "pa system", "pa-systems", "portable pa", "megaphone"],
    "stands": ["stand", "stands", "mic stand", "tripod"],
    "useless": ["useless", "diaphragm", "diaphragms", "driver unit", "driver units"],
}


def _normalize(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"[_/]+", " ", text)
    text = re.sub(r"[^a-z0-9.\-\s]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _compact(value: str) -> str:
    return re.sub(r"[\s.\-]+", "", value)


def _tokens(query: str) -> list[str]:
    return [part for part in _normalize(query).split(" ") if len(part) >= 2 and part not in STOP]


def _blob(product: dict[str, Any]) -> str:
    specs = product.get("specs") if isinstance(product.get("specs"), dict) else {}
    features = product.get("features") if isinstance(product.get("features"), list) else []
    tags = product.get("tags") if isinstance(product.get("tags"), list) else []
    return _normalize(
        " ".join(
            [
                str(product.get("sku") or ""),
                str(product.get("model") or ""),
                str(product.get("slug") or ""),
                str(product.get("wattage") or ""),
                str(product.get("description") or ""),
                str(product.get("family") or ""),
                str(product.get("categoryId") or ""),
                " ".join(str(item) for item in features),
                " ".join(str(item) for item in tags),
                " ".join(str(value) for value in specs.values()),
            ]
        )
    )


def _category_boosts(query: str) -> set[str]:
    text = _normalize(query)
    packed = _compact(text)
    hits: set[str] = set()
    for category_id, aliases in CATEGORY_ALIASES.items():
        for alias in aliases:
            alias_norm = _normalize(alias)
            if text == alias_norm or alias_norm in text or _compact(alias_norm) in packed:
                hits.add(category_id)
                break
    return hits


def _score(query: str, parts: list[str], product: dict[str, Any], boosts: set[str]) -> int:
    sku = _normalize(product.get("sku"))
    model = _normalize(product.get("model"))
    slug = _normalize(product.get("slug") or product.get("id"))
    packed_sku = _compact(sku)
    packed_query = _compact(query)
    blob = _blob(product)
    category_id = str(product.get("categoryId") or "")
    score = 40 if category_id in boosts else 0

    if packed_query and packed_query in {packed_sku, _compact(slug), _compact(model)}:
        score += 200
    elif packed_query and len(packed_query) >= 3 and (
        packed_query in packed_sku or packed_sku in packed_query
    ):
        score += 120

    if sku and sku in query:
        score += 80
    if model and model in query:
        score += 60

    matched = 0
    for token in parts:
        packed_token = _compact(token)
        if not packed_token:
            continue
        if packed_sku == packed_token:
            score += 90
            matched += 1
        elif packed_token in packed_sku:
            score += 55
            matched += 1
        elif packed_token in _compact(model):
            score += 40
            matched += 1
        elif token in blob:
            score += 12
            matched += 1
        elif len(packed_token) >= 3 and packed_token in _compact(blob):
            score += 8
            matched += 1

    if parts and matched == len(parts):
        score += 20
    return score


def search_products(docs: list[dict[str, Any]], query: str, limit: int = 6) -> list[dict[str, Any]]:
    text = _normalize(query)
    if not text:
        return []
    parts = _tokens(text)
    boosts = _category_boosts(text)
    ranked = []
    for doc in docs:
        score = _score(text, parts, doc, boosts)
        if score > 0:
            ranked.append((score, doc))
    ranked.sort(key=lambda row: (-row[0], str(row[1].get("sku") or "")))
    return [doc for _, doc in ranked[:limit]]


def product_card(doc: dict[str, Any], match_reason: str = "") -> dict[str, str]:
    images = []
    for key in ("image_front", "image_back"):
        value = str(doc.get(key) or "").strip()
        if value and value not in images:
            images.append(value)
    extras = doc.get("images") if isinstance(doc.get("images"), list) else []
    for item in extras:
        value = str(item or "").strip()
        if value and value not in images:
            images.append(value)
    slug = str(doc.get("slug") or doc.get("id") or "")
    sku = str(doc.get("sku") or slug)
    model = str(doc.get("model") or sku)
    wattage = str(doc.get("wattage") or "")
    description = str(doc.get("description") or "").strip()
    return {
        "slug": slug,
        "sku": sku,
        "model": model,
        "title": model,
        "wattage": wattage,
        "categoryId": str(doc.get("categoryId") or ""),
        "family": str(doc.get("family") or ""),
        "image": images[0] if images else "",
        "url": f"/p/{slug}" if slug else "",
        "description": description[:220],
        "match_reason": match_reason or "Matches your request.",
        "specs": json.dumps(doc.get("specs") or {}, ensure_ascii=False)[:400],
        "features": " | ".join(str(item) for item in (doc.get("features") or [])[:6]),
    }


def fallback_answer(query: str, cards: list[dict[str, str]]) -> dict[str, Any]:
    if not cards:
        summary = (
            f"I could not find catalogue products for “{query.strip()}”. "
            "Try a SKU like MSSA-160EUR, or a category like amplifiers."
        )
    elif len(cards) == 1:
        card = cards[0]
        bits = [card.get("model") or card.get("sku"), card.get("wattage"), card.get("categoryId")]
        summary = " · ".join(bit for bit in bits if bit)
        if card.get("description"):
            summary = f"{summary}. {card['description']}"
    else:
        titles = [card.get("sku") or card.get("title") for card in cards[:3] if card.get("sku") or card.get("title")]
        summary = f"Here are catalogue matches for “{query.strip()}”: {', '.join(titles)}."
    return {"summary": summary, "products": cards, "source": "fallback"}


def parse_structured_answer(raw_text: str, cards: list[dict[str, str]]) -> dict[str, Any]:
    text = str(raw_text or "").strip()
    summary_match = re.search(r"<summary>\s*([\s\S]*?)\s*</summary>", text, re.I)
    products_match = re.search(r"<products>\s*([\s\S]*?)\s*</products>", text, re.I)
    summary = (summary_match.group(1).strip() if summary_match else text) or "Here are the closest catalogue matches."
    summary = re.sub(r"<[^>]+>", "", summary).strip()

    by_slug = {card["slug"]: card for card in cards if card.get("slug")}
    by_sku = {_normalize(card.get("sku")): card for card in cards if card.get("sku")}
    selected: list[dict[str, str]] = []

    if products_match:
        try:
            parsed = json.loads(products_match.group(1).strip())
        except json.JSONDecodeError:
            parsed = []
        if isinstance(parsed, list):
            for item in parsed:
                if not isinstance(item, dict):
                    continue
                slug = str(item.get("slug") or item.get("url") or "").replace("/p/", "").strip("/")
                sku = _normalize(item.get("sku") or item.get("title") or item.get("model"))
                base = by_slug.get(slug) or by_sku.get(sku)
                if not base:
                    continue
                reason = str(item.get("match_reason") or item.get("description") or base.get("match_reason") or "")
                card = dict(base)
                if reason:
                    card["match_reason"] = reason[:180]
                if card["slug"] not in {row["slug"] for row in selected}:
                    selected.append(card)

    if not selected:
        selected = cards
    return {"summary": summary, "products": selected[:6], "source": "azure-openai"}


def normalize_messages(message: str | None, messages: list[Any] | None) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    if isinstance(messages, list):
        for item in messages:
            if not isinstance(item, dict):
                continue
            role = str(item.get("role") or "").strip().lower()
            content = str(item.get("content") or item.get("text") or "").strip()
            if role in {"user", "assistant"} and content:
                out.append({"role": role, "content": content})
    if out:
        return out[-8:]
    text = str(message or "").strip()
    return [{"role": "user", "content": text}] if text else []


def latest_user(messages: list[dict[str, str]], fallback: str = "") -> str:
    for entry in reversed(messages):
        if entry.get("role") == "user":
            return str(entry.get("content") or "").strip()
    return str(fallback or "").strip()


def azure_chat(messages: list[dict[str, str]], cards: list[dict[str, str]]) -> dict[str, Any]:
    endpoint = (os.environ.get("AZURE_OPENAI_ENDPOINT") or "").rstrip("/")
    api_key = os.environ.get("AZURE_OPENAI_KEY") or os.environ.get("AZURE_OPENAI_API_KEY") or ""
    deployment = os.environ.get("AZURE_OPENAI_CHAT_MODEL") or os.environ.get("AZURE_OPENAI_DEPLOYMENT") or "gpt-4.1-mini"
    api_version = os.environ.get("AZURE_OPENAI_CHAT_API_VERSION") or "2024-08-01-preview"
    if not endpoint or not api_key:
        raise RuntimeError("Azure OpenAI is not configured.")

    system_prompt = (
        "You are MAXX-ON's B2B catalogue assistant for PARI PRO ACOUSTICS professional audio. "
        "Answer only from retrievedProducts. Never invent SKUs, wattage, specs, or stock. "
        "If retrievedProducts is empty, say you could not find a match and suggest a SKU or category. "
        "Prefer concise, practical guidance for installers and dealers. "
        "Never output HTML or markdown. "
        "Output exactly: <summary>plain text</summary> then <products>JSON array</products>. "
        "Each product object must include slug, sku, title, match_reason. "
        "Only include products from retrievedProducts. Never omit the <products> block."
    )
    context = json.dumps({"retrievedProducts": cards}, ensure_ascii=False)
    llm_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": f"Product data:\n{context}"},
        *messages,
    ]
    if not any(item.get("role") == "user" for item in llm_messages):
        llm_messages.append({"role": "user", "content": latest_user(messages) or "Hello"})

    url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
    payload = {
        "messages": llm_messages,
        "temperature": 0.2,
        "max_tokens": 700,
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "api-key": api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:400]
        raise RuntimeError(f"Azure OpenAI error ({exc.code}): {detail}") from exc

    answer = (((body.get("choices") or [{}])[0].get("message") or {}).get("content")) or ""
    return parse_structured_answer(answer, cards)


def run_chat(
    *,
    docs: list[dict[str, Any]],
    message: str | None = None,
    messages: list[Any] | None = None,
    top_k: int = 6,
) -> dict[str, Any]:
    history = normalize_messages(message, messages)
    query = latest_user(history, str(message or ""))
    if not query:
        raise ValueError("message is required.")
    hits = search_products(docs, query, limit=max(1, min(int(top_k or 6), 8)))
    cards = [product_card(doc) for doc in hits]
    try:
        parsed = azure_chat(history, cards)
    except Exception:  # noqa: BLE001
        parsed = fallback_answer(query, cards)
        parsed["warning"] = "model_unavailable"
    return {
        "answer": parsed.get("summary") or "",
        "summary": parsed.get("summary") or "",
        "products": parsed.get("products") or [],
        "retrievedCount": len(cards),
        "source": parsed.get("source") or "fallback",
    }
