import json
from pathlib import Path

origin = "https://yellow-pebble-06cc7ac10.azurestaticapps.net"
today = "2026-08-14"
urls = [("/", "1.0", "weekly"), ("/#amplifiers", "0.9", "weekly"), ("/#microphones", "0.9", "weekly")]
root = Path(__file__).resolve().parents[1]
for name in ("amplifiers", "microphones"):
    data = json.loads((root / "src" / "styles" / f"{name}.json").read_text(encoding="utf-8"))
    for items in data.values():
        for product in items:
            urls.append((f"/#{product['slug']}", "0.7", "monthly"))

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
