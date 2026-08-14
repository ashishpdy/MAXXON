import type { AssistantReply, ChatData } from "./types";

function hasKeyword(text: string, keyword: string): boolean {
  const escaped = keyword
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  if (!escaped) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "iu").test(text);
}

export function matchAssistantReply(message: string, data: ChatData): AssistantReply {
  const text = message.trim().toLowerCase();
  let best: AssistantReply | null = null;
  let bestLength = 0;

  for (const reply of data.replies) {
    for (const keyword of reply.keywords ?? []) {
      const length = keyword.trim().length;
      if (length < bestLength) continue;
      if (hasKeyword(text, keyword) && length > bestLength) {
        best = reply;
        bestLength = length;
      }
    }
  }

  return best ?? data.default;
}
