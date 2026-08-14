export type AssistantReply = {
  id: string;
  text: string;
  image?: string;
  tags?: string[];
  keywords?: string[];
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
