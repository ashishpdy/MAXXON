import { flattenAllProducts, productImages } from "../catalog/registry.js";
import { productHref } from "../nav.js";
import type { AssistantReply, CatalogueHit } from "./types";

const STOP = new Set(["a", "an", "the", "for", "of", "and", "or", "with", "to", "in", "on", "me", "show", "find", "get"]);

const CATEGORY_ALIASES: Record<string, string[]> = {
  amplifiers: ["amp", "amps", "amplifier", "amplifiers", "power amp", "poweramps"],
  microphones: ["mic", "mics", "microphone", "microphones", "wireless"],
  speakers: ["speaker", "speakers", "cabinet", "cabinets", "loudspeaker"],
  mixers: ["mixer", "mixers", "console", "consoles"],
  horns: ["horn", "horns", "driver", "drivers"],
  "pa-systems": ["pa", "pasystem", "pa system", "pa-systems", "portable pa", "megaphone"],
  stands: ["stand", "stands", "mic stand", "tripod"],
  useless: ["useless", "diaphragm", "diaphragms", "driver unit", "driver units"],
};

function normalize(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[^a-z0-9.\-\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string): string {
  return value.replace(/[\s.\-]+/g, "");
}

function tokens(query: string): string[] {
  return normalize(query)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && !STOP.has(part));
}

function fieldBlob(product: Record<string, unknown>): string {
  const specs = product.specs && typeof product.specs === "object" ? product.specs : {};
  const features = Array.isArray(product.features) ? product.features : [];
  const tags = Array.isArray(product.tags) ? product.tags : [];
  return normalize(
    [
      product.sku,
      product.model,
      product.slug,
      product.wattage,
      product.description,
      product.family,
      product.category,
      ...features,
      ...tags,
      ...Object.values(specs as Record<string, unknown>),
    ].join(" ")
  );
}

function resolveCategoryIds(query: string): string[] {
  const text = normalize(query);
  const packed = compact(text);
  const hits: string[] = [];
  for (const [categoryId, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      const aliasNorm = normalize(alias);
      if (text === aliasNorm || text.includes(aliasNorm) || packed.includes(compact(aliasNorm))) {
        hits.push(categoryId);
        break;
      }
    }
  }
  return hits;
}

function scoreProduct(query: string, parts: string[], product: Record<string, unknown>, categoryBoost: Set<string>): number {
  const sku = normalize(product.sku);
  const model = normalize(product.model);
  const slug = normalize(product.slug);
  const packedSku = compact(sku);
  const packedQuery = compact(query);
  const blob = fieldBlob(product);
  const categoryId = String(product.category || "");

  let score = 0;
  if (categoryBoost.has(categoryId)) score += 40;

  if (packedQuery && (packedSku === packedQuery || compact(slug) === packedQuery || compact(model) === packedQuery)) {
    score += 200;
  } else if (packedQuery.length >= 3 && (packedSku.includes(packedQuery) || packedQuery.includes(packedSku))) {
    score += 120;
  }

  if (sku && query.includes(sku)) score += 80;
  if (model && query.includes(model)) score += 60;

  for (const token of parts) {
    const packedToken = compact(token);
    if (!packedToken) continue;
    if (packedSku === packedToken) score += 90;
    else if (packedSku.includes(packedToken)) score += 55;
    else if (compact(model).includes(packedToken)) score += 40;
    else if (blob.includes(token)) score += 12;
    else if (packedToken.length >= 3 && compact(blob).includes(packedToken)) score += 8;
  }

  if (parts.length > 1) {
    const matched = parts.filter((token) => {
      const packedToken = compact(token);
      return packedSku.includes(packedToken) || compact(blob).includes(packedToken);
    }).length;
    score += matched * 6;
    if (matched === parts.length) score += 20;
  }

  return score;
}

function toHit(product: Record<string, unknown>, categories: Array<{ id: string; label?: string }>, score: number): CatalogueHit {
  const slug = String(product.slug || product.id || "");
  const categoryId = String(product.category || "");
  const category = categories.find((cat) => cat.id === categoryId);
  const images = productImages(product);
  const description = String(product.description || "").trim();
  return {
    slug,
    sku: String(product.sku || slug),
    model: String(product.model || product.sku || slug),
    categoryId,
    categoryLabel: category?.label || categoryId,
    family: String(product.family || ""),
    image: images[0] || "",
    wattage: String(product.wattage || ""),
    href: productHref(slug),
    score,
    snippet: description ? description.slice(0, 140) : "",
  };
}

export function searchCatalogue(
  query: string,
  categories: Array<{ id: string; label?: string; catalog?: Record<string, unknown[]> }>,
  limit = 6
): CatalogueHit[] {
  const text = normalize(query);
  if (!text) return [];

  const parts = tokens(text);
  const categoryBoost = new Set(resolveCategoryIds(text));
  const products = flattenAllProducts(categories) as Record<string, unknown>[];

  const ranked = products
    .map((product) => ({ product, score: scoreProduct(text, parts, product, categoryBoost) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || String(a.product.sku).localeCompare(String(b.product.sku)));

  return ranked.slice(0, limit).map((row) => toHit(row.product, categories, row.score));
}

export function buildSearchReply(
  query: string,
  categories: Array<{ id: string; label?: string; catalog?: Record<string, unknown[]> }>,
  options?: { loading?: boolean }
): AssistantReply {
  if (options?.loading) {
    return {
      id: "loading",
      text: "Catalogue is still loading — try again in a moment.",
      tags: [],
      products: [],
    };
  }

  const categoryTags = categories
    .map((cat) => cat.label)
    .filter(Boolean)
    .slice(0, 6) as string[];

  const hits = searchCatalogue(query, categories, 6);
  if (!hits.length) {
    return {
      id: "empty",
      text: `No products matched “${query.trim()}”. Try a SKU (MSSA-160EUR) or a category.`,
      tags: categoryTags,
      products: [],
    };
  }

  const categoryOnly = resolveCategoryIds(query);
  const totalInCategory =
    categoryOnly.length === 1
      ? (flattenAllProducts(categories) as Record<string, unknown>[]).filter((p) => p.category === categoryOnly[0]).length
      : 0;

  let text: string;
  if (hits.length === 1) {
    const hit = hits[0];
    const bits = [hit.model, hit.wattage, hit.categoryLabel].filter(Boolean);
    text = `${bits.join(" · ")}.${hit.snippet ? ` ${hit.snippet}` : ""}`;
  } else if (totalInCategory > hits.length) {
    text = `Showing ${hits.length} of ${totalInCategory} in ${categories.find((c) => c.id === categoryOnly[0])?.label || categoryOnly[0]}. Narrow with a model or wattage.`;
  } else {
    text = `Found ${hits.length} products for “${query.trim()}”.`;
  }

  return {
    id: `search-${compact(normalize(query)) || "q"}`,
    text,
    image: hits[0]?.image || "",
    tags: hits.slice(0, 4).map((hit) => hit.sku),
    products: hits,
  };
}

export function buildWelcomeReply(
  categories: Array<{ id: string; label?: string; catalog?: Record<string, unknown[]> }>
): AssistantReply {
  const count = flattenAllProducts(categories).length;
  const tags = categories.map((cat) => cat.label).filter(Boolean).slice(0, 6) as string[];
  const firstBanner = categories.find((cat) => (cat as { banner?: string }).banner)?.banner;
  return {
    id: "welcome",
    text: count
      ? `Ask about the live MAXX-ON catalogue (${count} products). Try a SKU, wattage, use case, or category.`
      : "Ask about the MAXX-ON catalogue by SKU, wattage, use case, or category.",
    image: typeof firstBanner === "string" ? firstBanner : "/assets/banners/amplifiers.png",
    tags,
    products: [],
  };
}
