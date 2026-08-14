import { FormEvent, useEffect, useId, useRef, useState } from "react";
import chatData from "../chat/chatData.json";
import { matchAssistantReply } from "../chat/matchReply";
import type { AssistantReply, ChatMessage } from "../chat/types";

const TYPING_DELAY_MS = 700;

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function TypingDots() {
  return (
    <div className="maxxon-chat-row is-assistant" aria-label="Assistant is typing">
      <div className="maxxon-chat-bubble is-assistant is-typing">
        <span className="maxxon-chat-dot" />
        <span className="maxxon-chat-dot" />
        <span className="maxxon-chat-dot" />
      </div>
    </div>
  );
}

function AssistantBubble({
  reply,
  disabled,
  onTag,
}: {
  reply: AssistantReply;
  disabled?: boolean;
  onTag: (tag: string) => void;
}) {
  return (
    <div className="maxxon-chat-row is-assistant">
      <article className="maxxon-chat-bubble is-assistant">
        {reply.image ? (
          <img
            className="maxxon-chat-product-image"
            src={reply.image}
            alt=""
            width="640"
            height="360"
          />
        ) : null}
        <p className="maxxon-chat-snippet">{reply.text}</p>
        {reply.tags?.length ? (
          <ul className="maxxon-chat-tags">
            {reply.tags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  className="maxxon-chat-tag"
                  disabled={disabled}
                  onClick={() => onTag(tag)}
                >
                  {tag}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </div>
  );
}

export function MaxxonChat() {
  const inputId = useId();
  const threadRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "welcome", role: "assistant", reply: chatData.welcome },
  ]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, typing, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    return () => {
      if (typingTimer.current != null) window.clearTimeout(typingTimer.current);
    };
  }, []);

  function sendMessage(text: string) {
    const value = text.trim();
    if (!value || typing) return;

    const userMessage: ChatMessage = { id: nextId(), role: "user", text: value };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setTyping(true);

    const reply = matchAssistantReply(value, chatData);
    typingTimer.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        { id: nextId(), role: "assistant", reply },
      ]);
      setTyping(false);
      typingTimer.current = null;
    }, TYPING_DELAY_MS);
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    sendMessage(draft);
  }

  return (
    <div className={`maxxon-chat-dock${open ? " is-open" : ""}`}>
      {open ? (
        <section className="maxxon-chat" aria-label="MAXX-ON catalogue chat">
          <header className="maxxon-chat-header">
            <div>
              <p className="maxxon-chat-kicker">MAXX-ON</p>
              <h2 className="maxxon-chat-title">Catalogue chat</h2>
            </div>
            <button
              type="button"
              className="maxxon-chat-close"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </header>

          <div className="maxxon-chat-thread" ref={threadRef} role="log" aria-live="polite">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="maxxon-chat-row is-user">
                  <p className="maxxon-chat-bubble is-user">{message.text}</p>
                </div>
              ) : (
                <AssistantBubble
                  key={message.id}
                  reply={message.reply}
                  disabled={typing}
                  onTag={sendMessage}
                />
              )
            )}
            {typing ? <TypingDots /> : null}
          </div>

          <form className="maxxon-chat-composer" onSubmit={send}>
            <label className="visually-hidden" htmlFor={inputId}>
              Message
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className="maxxon-chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about amps or mics"
              autoComplete="off"
              disabled={typing}
            />
            <button type="submit" className="maxxon-chat-send" disabled={typing || !draft.trim()}>
              Send
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="maxxon-chat-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Close chat" : "Chat"}
      </button>
    </div>
  );
}

export default MaxxonChat;
