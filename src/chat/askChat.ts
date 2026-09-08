import { apiUrl } from "../api.js";
import { productHref } from "../nav.js";
import type { AssistantReply, CatalogueHit } from "./types";
import { buildSearchReply } from "./searchCatalogue";

export type ChatTurn = { role: "user" | "assistant"; content: string };

function toHit(
  product: Record<string, unknown>,
  categories: Array<{ id: string; label?: string }>
): CatalogueHit | null {
  const slug = String(product.slug || "").trim();
  if (!slug) return null;
  const categoryId = String(product.categoryId || "");
  const categoryLabel =
    categories.find((cat) => cat.id === categoryId)?.label || categoryId;
  return {
    slug,
    sku: String(product.sku || slug),
    model: String(product.model || product.title || product.sku || slug),
    categoryId,
    categoryLabel,
    family: String(product.family || ""),
    image: String(product.image || ""),
    wattage: String(product.wattage || ""),
    href: String(product.url || productHref(slug)),
    score: 0,
    snippet: String(product.match_reason || product.description || ""),
  };
}

export async function askCatalogueChat({
  message,
  history,
  categories,
  loading,
}: {
  message: string;
  history: ChatTurn[];
  categories: Array<{ id: string; label?: string; catalog?: Record<string, unknown[]> }>;
  loading?: boolean;
}): Promise<AssistantReply> {
  const fallback = () => buildSearchReply(message, categories, { loading });

  try {
    const response = await fetch(apiUrl("/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        messages: [...history, { role: "user", content: message }],
        top_k: 6,
      }),
    });
    if (!response.ok) {
      return fallback();
    }
    const data = await response.json();
    const products = Array.isArray(data.products)
      ? data.products.map((item: Record<string, unknown>) => toHit(item, categories)).filter(Boolean)
      : [];
    const text = String(data.summary || data.answer || "").trim();
    if (!text && !products.length) {
      return fallback();
    }
    return {
      id: `chat-${Date.now()}`,
      text: text || fallback().text,
      image: products[0]?.image || "",
      tags: products.slice(0, 4).map((hit) => hit!.sku),
      products: products as CatalogueHit[],
    };
  } catch {
    return fallback();
  }
}
