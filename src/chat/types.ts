export type CatalogueHit = {
  slug: string;
  sku: string;
  model: string;
  categoryId: string;
  categoryLabel: string;
  family: string;
  image?: string;
  wattage?: string;
  href: string;
  score: number;
  snippet?: string;
};

export type AssistantReply = {
  id: string;
  text: string;
  image?: string;
  tags?: string[];
  keywords?: string[];
  products?: CatalogueHit[];
};

export type ChatData = {
  welcome: AssistantReply;
  default: AssistantReply;
  replies: AssistantReply[];
};

export type ChatRole = "user" | "assistant";

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; reply: AssistantReply };
