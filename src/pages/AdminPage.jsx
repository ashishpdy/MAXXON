import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../api.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { flattenAllProducts } from "../catalog/registry.js";
import { navigate, productHref } from "../nav.js";

const STORAGE_KEY = "maxxon-admin-key";

function adminProductFromUrl() {
  return new URLSearchParams(window.location.search).get("p") || "";
}

function setAdminProductUrl(slug) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("p", slug);
  else url.searchParams.delete("p");
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === next) return;
  window.history.replaceState(null, "", next);
}

function lines(value) {
  return Array.isArray(value) ? value.join("\n") : value || "";
}

function fromLines(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function specsFromProduct(product) {
  return Object.entries(product?.specs || {}).map(([key, value]) => ({
    key,
    value: value == null ? "" : String(value),
  }));
}

function specsToObject(rows) {
  const specs = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    specs[key] = row.value;
  }
  return specs;
}

function draftFrom(product) {
  return {
    sku: product.sku || "",
    model: product.model || "",
    wattage: product.wattage || "",
    description: product.description || "",
    image_front: product.image_front || "",
    image_back: product.image_back || "",
    features: lines(product.features),
    images: lines(product.images),
    sortIndex: product.sortIndex ?? "",
    family: product.family || "",
    specRows: specsFromProduct(product).length
      ? specsFromProduct(product)
      : [{ key: "", value: "" }],
  };
}

export default function AdminPage() {
  const { categories, loading, reload } = useCatalog();
  const products = useMemo(() => flattenAllProducts(categories), [categories]);
  const [secret, setSecret] = useState(() => sessionStorage.getItem(STORAGE_KEY) || "");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(Boolean(sessionStorage.getItem(STORAGE_KEY)));
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(() => adminProductFromUrl());
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = products.find((item) => item.slug === selectedSlug) || null;
  const visible = products.filter((item) => {
    if (categoryId && item.category !== categoryId) return false;
    const hay = `${item.sku} ${item.model} ${item.slug}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    document.title = "Admin | MAXX-ON";
  }, []);

  useEffect(() => {
    setAdminProductUrl(selectedSlug);
  }, [selectedSlug]);

  useEffect(() => {
    const product = products.find((item) => item.slug === selectedSlug);
    if (product) setDraft(draftFrom(product));
  }, [selectedSlug, products]);

  async function signIn(event) {
    event.preventDefault();
    setStatus("");
    setBusy(true);
    try {
      const response = await fetch(apiUrl("/api/staff/session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Sign-in failed (${response.status})`);
      sessionStorage.setItem(STORAGE_KEY, password);
      setSecret(password);
      setAuthed(true);
      setPassword("");
    } catch (err) {
      setStatus(err.message || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem(STORAGE_KEY);
    setSecret("");
    setAuthed(false);
    setSelectedSlug("");
    setDraft(null);
  }

  async function save(event) {
    event.preventDefault();
    if (!selected || !draft) return;
    setStatus("");
    setBusy(true);
    try {
      const response = await fetch(apiUrl(`/api/staff/product/${encodeURIComponent(selected.slug)}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": secret,
        },
        body: JSON.stringify({
          slug: selected.slug,
          categoryId: selected.category,
          sku: draft.sku,
          model: draft.model,
          wattage: draft.wattage,
          description: draft.description,
          image_front: draft.image_front,
          image_back: draft.image_back,
          features: fromLines(draft.features),
          images: fromLines(draft.images),
          specs: specsToObject(draft.specRows),
          family: draft.family,
          sortIndex: draft.sortIndex === "" ? undefined : Number(draft.sortIndex),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Save failed (${response.status})`);
      await reload();
      setStatus("Saved. Live site will show this on refresh.");
    } catch (err) {
      setStatus(err.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateSpec(index, field, value) {
    setDraft((current) => {
      const specRows = current.specRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      );
      return { ...current, specRows };
    });
  }

  if (!authed) {
    return (
      <div className="admin-shell">
        <form className="admin-login" onSubmit={signIn}>
          <h1>MAXX-ON admin</h1>
          <p>Not linked from the public site. Password is the Function <code>ADMIN_SECRET</code>.</p>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          {status ? <p className="admin-status">{status}</p> : null}
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <a href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>
          MAXX-ON
        </a>
        <span>Sales admin</span>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="admin-layout">
        <aside className="admin-list">
          <input
            type="search"
            placeholder="Search SKU or model"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <ul>
            {loading && !products.length ? <li>Loading catalogue…</li> : null}
            {visible.map((item) => (
              <li key={item.slug}>
                <button
                  type="button"
                  className={item.slug === selectedSlug ? "is-active" : ""}
                  onClick={() => setSelectedSlug(item.slug)}
                >
                  <strong>{item.sku || item.slug}</strong>
                  <span>{item.model}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="admin-editor">
          {!draft || !selected ? (
            <p className="admin-empty">Pick a product. This slice edits live Cosmos fields. Image upload comes later.</p>
          ) : (
            <form onSubmit={save}>
              <div className="admin-editor-head">
                <h1>{selected.sku}</h1>
                <a href={productHref(selected.slug)} target="_blank" rel="noreferrer">
                  View page
                </a>
              </div>
              <label>
                Model
                <input value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
              </label>
              <label>
                SKU label
                <input value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} />
              </label>
              <label>
                Overlay / wattage
                <input value={draft.wattage} onChange={(event) => setDraft({ ...draft, wattage: event.target.value })} />
              </label>
              <label>
                Description
                <textarea
                  rows={5}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </label>
              <label>
                Features (one per line)
                <textarea
                  rows={4}
                  value={draft.features}
                  onChange={(event) => setDraft({ ...draft, features: event.target.value })}
                />
              </label>
              <fieldset>
                <legend>Specs</legend>
                {draft.specRows.map((row, index) => (
                  <div className="admin-spec-row" key={index}>
                    <input
                      placeholder="key"
                      value={row.key}
                      onChange={(event) => updateSpec(index, "key", event.target.value)}
                    />
                    <input
                      placeholder="value"
                      value={row.value}
                      onChange={(event) => updateSpec(index, "value", event.target.value)}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, specRows: [...draft.specRows, { key: "", value: "" }] })}
                >
                  Add spec
                </button>
              </fieldset>
              <label>
                Front image path
                <input
                  value={draft.image_front}
                  onChange={(event) => setDraft({ ...draft, image_front: event.target.value })}
                />
              </label>
              <label>
                Back image path
                <input
                  value={draft.image_back}
                  onChange={(event) => setDraft({ ...draft, image_back: event.target.value })}
                />
              </label>
              <label>
                Extra image paths (one per line)
                <textarea
                  rows={3}
                  value={draft.images}
                  onChange={(event) => setDraft({ ...draft, images: event.target.value })}
                />
              </label>
              <label>
                Family key
                <input value={draft.family} onChange={(event) => setDraft({ ...draft, family: event.target.value })} />
              </label>
              <label>
                Sort index
                <input
                  type="number"
                  value={draft.sortIndex}
                  onChange={(event) => setDraft({ ...draft, sortIndex: event.target.value })}
                />
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save to Cosmos"}
              </button>
              {status ? <p className="admin-status">{status}</p> : null}
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
