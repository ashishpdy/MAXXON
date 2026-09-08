import type { ChatMessage } from "./types";

export const CHAT_SESSION_KEY = "maxxon:chat-session";
/** Conversational turns kept in the dock (excluding the welcome bubble). */
export const CHAT_WINDOW_SIZE = 10;
/** Turns sent to /api/chat (user+assistant pairs fit in this window). */
export const CHAT_API_HISTORY = 10;

export type ChatSessionState = {
  messages: ChatMessage[];
  open: boolean;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const entry = value as ChatMessage;
  if (typeof entry.id !== "string") return false;
  if (entry.role === "user") return typeof entry.text === "string";
  if (entry.role === "assistant") {
    return Boolean(entry.reply && typeof entry.reply.text === "string");
  }
  return false;
}

export function trimChatMessages(messages: ChatMessage[], limit = CHAT_WINDOW_SIZE): ChatMessage[] {
  const welcome = messages.find((entry) => entry.id === "welcome");
  const rest = messages.filter((entry) => entry.id !== "welcome");
  const kept = rest.slice(-Math.max(1, limit));
  return welcome ? [welcome, ...kept] : kept;
}

export function loadChatSession(): ChatSessionState | null {
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChatSessionState>;
    const messages = Array.isArray(parsed.messages) ? parsed.messages.filter(isChatMessage) : [];
    if (!messages.length) return null;
    return {
      messages: trimChatMessages(messages),
      open: Boolean(parsed.open),
    };
  } catch {
    return null;
  }
}

export function saveChatSession(state: ChatSessionState): void {
  try {
    const payload: ChatSessionState = {
      open: Boolean(state.open),
      messages: trimChatMessages(state.messages),
    };
    sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}
