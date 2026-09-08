import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { navigate, productHref } from "../nav.js";
import { askCatalogueChat } from "../chat/askChat";
import { buildWelcomeReply } from "../chat/searchCatalogue";
import type { AssistantReply, CatalogueHit, ChatMessage } from "../chat/types";

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function TypingDots() {
  return (
    <div className="maxxon-chat-row is-assistant" aria-label="Assistant is thinking">
      <div className="maxxon-chat-bubble is-assistant is-typing">
        <span className="maxxon-chat-dot" />
        <span className="maxxon-chat-dot" />
        <span className="maxxon-chat-dot" />
      </div>
    </div>
  );
}

function ProductResults({
  products,
  disabled,
  onOpen,
}: {
  products: CatalogueHit[];
  disabled?: boolean;
  onOpen: (hit: CatalogueHit) => void;
}) {
  if (!products.length) return null;
  return (
    <ul className="maxxon-chat-results">
      {products.map((hit) => (
        <li key={hit.slug}>
          <button
            type="button"
            className="maxxon-chat-result"
            disabled={disabled}
            onClick={() => onOpen(hit)}
          >
            {hit.image ? (
              <img className="maxxon-chat-result-image" src={hit.image} alt="" width="72" height="72" />
            ) : (
              <span className="maxxon-chat-result-image is-empty" aria-hidden="true" />
            )}
            <span className="maxxon-chat-result-copy">
              <span className="maxxon-chat-result-sku">{hit.sku}</span>
              <span className="maxxon-chat-result-meta">
                {[hit.wattage, hit.categoryLabel || hit.categoryId, hit.snippet]
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(" · ")}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function AssistantBubble({
  reply,
  disabled,
  onTag,
  onOpenProduct,
}: {
  reply: AssistantReply;
  disabled?: boolean;
  onTag: (tag: string) => void;
  onOpenProduct: (hit: CatalogueHit) => void;
}) {
  const showHeroImage = Boolean(reply.image) && !(reply.products && reply.products.length);
  return (
    <div className="maxxon-chat-row is-assistant">
      <article className="maxxon-chat-bubble is-assistant">
        {showHeroImage ? (
          <img
            className="maxxon-chat-product-image"
            src={reply.image}
            alt=""
            width="640"
            height="360"
          />
        ) : null}
        <p className="maxxon-chat-snippet">{reply.text}</p>
        <ProductResults products={reply.products || []} disabled={disabled} onOpen={onOpenProduct} />
        {reply.tags?.length && !(reply.products && reply.products.length) ? (
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
  const { categories, loading } = useCatalog();
  const threadRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const welcome = useMemo(() => buildWelcomeReply(categories), [categories]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "welcome", role: "assistant", reply: buildWelcomeReply([]) },
  ]);
  const welcomeSeeded = useRef(false);

  useEffect(() => {
    if (welcomeSeeded.current) return;
    if (loading) return;
    welcomeSeeded.current = true;
    setMessages([{ id: "welcome", role: "assistant", reply: welcome }]);
  }, [loading, welcome]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, typing, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  function openProduct(hit: CatalogueHit) {
    setOpen(false);
    navigate(hit.href || productHref(hit.slug));
  }

  async function sendMessage(text: string) {
    const value = text.trim();
    if (!value || typing) return;

    const history = messages
      .filter((entry) => entry.id !== "welcome")
      .flatMap((entry) => {
        if (entry.role === "user") return [{ role: "user" as const, content: entry.text }];
        return [{ role: "assistant" as const, content: entry.reply.text }];
      })
      .slice(-6);

    setMessages((current) => [...current, { id: nextId(), role: "user", text: value }]);
    setDraft("");
    setTyping(true);

    const reply = await askCatalogueChat({
      message: value,
      history,
      categories,
      loading,
    });

    setMessages((current) => [...current, { id: nextId(), role: "assistant", reply }]);
    setTyping(false);
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    void sendMessage(draft);
  }

  return (
    <div className={`maxxon-chat-dock${open ? " is-open" : ""}`}>
      {open ? (
        <section className="maxxon-chat" aria-label="MAXX-ON catalogue assistant">
          <header className="maxxon-chat-header">
            <div>
              <p className="maxxon-chat-kicker">MAXX-ON</p>
              <h2 className="maxxon-chat-title">Catalogue chat</h2>
            </div>
            <button type="button" className="maxxon-chat-close" onClick={() => setOpen(false)}>
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
                  onTag={(tag) => void sendMessage(tag)}
                  onOpenProduct={openProduct}
                />
              )
            )}
            {typing ? <TypingDots /> : null}
          </div>

          <form className="maxxon-chat-composer" onSubmit={send}>
            <label className="visually-hidden" htmlFor={inputId}>
              Ask about the catalogue
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className="maxxon-chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a SKU, wattage, or category"
              autoComplete="off"
              disabled={typing}
            />
            <button type="submit" className="maxxon-chat-send" disabled={typing || !draft.trim()}>
              Ask
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
