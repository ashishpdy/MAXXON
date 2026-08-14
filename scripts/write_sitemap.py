import json
from datetime import date
from pathlib import Path

origin = "https://yellow-pebble-06cc7ac10.azurestaticapps.net"
today = date.today().isoformat()
root = Path(__file__).resolve().parents[1]
registry = json.loads((root / "src" / "catalog" / "categories.json").read_text(encoding="utf-8"))
category_ids = [cat["id"] for cat in registry["categories"]]

urls = [("/", "1.0", "weekly")]
for cat_id in category_ids:
    json_path = root / "src" / "styles" / f"{cat_id}.json"
    if not json_path.exists():
        continue
    urls.append((f"/#{cat_id}", "0.9", "weekly"))
    data = json.loads(json_path.read_text(encoding="utf-8"))
    for items in data.values():
        for product in items:
            slug = product.get("slug")
            if slug:
                urls.append((f"/#{slug}", "0.7", "monthly"))

lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
]
for loc, pri, freq in urls:
    href = f"{origin}/" if loc == "/" else origin + loc
    lines.extend(
        [
            "  <url>",
            f"    <loc>{href}</loc>",
            f"    <lastmod>{today}</lastmod>",
            f"    <changefreq>{freq}</changefreq>",
            f"    <priority>{pri}</priority>",
            "  </url>",
        ]
    )
lines.append("</urlset>")
out = root / "public" / "sitemap.xml"
out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"wrote {len(urls)} urls to {out}")
