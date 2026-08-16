import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../api.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { flattenAllProducts, productImages } from "../catalog/registry.js";
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
    features: lines(product.features),
    sortIndex: product.sortIndex ?? "",
    family: product.family || "",
    gallery: productImages(product),
    specRows: specsFromProduct(product).length
      ? specsFromProduct(product)
      : [{ key: "", value: "" }],
  };
}

async function putBlob(uploadUrl, file, contentType) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-ms-blob-type": "BlockBlob",
    },
    body: file,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Blob upload failed (${response.status})`);
  }
}

function moveItem(list, index, direction) {
  const next = index + direction;
  if (next < 0 || next >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

export default function AdminPage() {
  const { categories, loading, reload } = useCatalog();
  const products = useMemo(() => flattenAllProducts(categories), [categories]);
  const fileInputRef = useRef(null);
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
  const canReorderList = Boolean(categoryId) && !query.trim();
  const visible = useMemo(() => {
    const filtered = products.filter((item) => {
      if (categoryId && item.category !== categoryId) return false;
      const hay = `${item.sku} ${item.model} ${item.slug}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
    return filtered.slice().sort((a, b) => {
      const familyCmp = String(a.family || "").localeCompare(String(b.family || ""));
      if (familyCmp) return familyCmp;
      return Number(a.sortIndex || 0) - Number(b.sortIndex || 0);
    });
  }, [products, categoryId, query]);

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

  async function staffFetch(path, options = {}) {
    const response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": secret,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  }

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
      await staffFetch(`/api/staff/product/${encodeURIComponent(selected.slug)}`, {
        method: "PUT",
        body: JSON.stringify({
          slug: selected.slug,
          categoryId: selected.category,
          sku: draft.sku,
          model: draft.model,
          wattage: draft.wattage,
          description: draft.description,
          features: fromLines(draft.features),
          urls: draft.gallery,
          specs: specsToObject(draft.specRows),
          family: draft.family,
          sortIndex: draft.sortIndex === "" ? undefined : Number(draft.sortIndex),
        }),
      });
      await reload();
      setStatus("Saved. Live site will show this on refresh.");
    } catch (err) {
      setStatus(err.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function persistGallery(urls, message) {
    if (!selected) return;
    setBusy(true);
    setStatus("");
    try {
      const payload = await staffFetch(`/api/staff/product/${encodeURIComponent(selected.slug)}`, {
        method: "PUT",
        body: JSON.stringify({
          slug: selected.slug,
          categoryId: selected.category,
          urls,
        }),
      });
      const nextUrls = productImages(payload.product) || urls;
      setDraft((current) => (current ? { ...current, gallery: nextUrls } : current));
      await reload();
      setStatus(message);
    } catch (err) {
      setStatus(err.message || "Image update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file) {
    if (!selected || !file) return;
    if (file.size > 8 * 1024 * 1024) {
      setStatus("Image must be 8MB or smaller.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const contentType = file.type || "image/jpeg";
      const ticket = await staffFetch(`/api/staff/product/${encodeURIComponent(selected.slug)}/images`, {
        method: "POST",
        body: JSON.stringify({
          slug: selected.slug,
          categoryId: selected.category,
          action: "ticket",
          filename: file.name,
          contentType,
        }),
      });
      await putBlob(ticket.uploadUrl, file, ticket.contentType || contentType);
      const payload = await staffFetch(`/api/staff/product/${encodeURIComponent(selected.slug)}/images`, {
        method: "POST",
        body: JSON.stringify({
          slug: selected.slug,
          categoryId: selected.category,
          action: "attach",
          url: ticket.url,
        }),
      });
      setDraft((current) => (current ? { ...current, gallery: payload.urls || current.gallery } : current));
      await reload();
      setStatus("Image uploaded.");
    } catch (err) {
      setStatus(err.message || "Upload failed.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function moveGallery(index, direction) {
    if (!draft) return;
    const urls = moveItem(draft.gallery, index, direction);
    if (urls === draft.gallery) return;
    setDraft({ ...draft, gallery: urls });
    persistGallery(urls, "Image order saved.");
  }

  function removeGallery(index) {
    if (!draft) return;
    const urls = draft.gallery.filter((_, itemIndex) => itemIndex !== index);
    setDraft({ ...draft, gallery: urls });
    persistGallery(urls, "Image removed from product.");
  }

  async function moveProductInFamily(slug, direction) {
    if (!canReorderList) return;
    const product = products.find((item) => item.slug === slug);
    if (!product) return;
    const siblings = products
      .filter((item) => item.category === product.category && item.family === product.family)
      .slice()
      .sort((a, b) => Number(a.sortIndex || 0) - Number(b.sortIndex || 0));
    const index = siblings.findIndex((item) => item.slug === slug);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return;
    const ordered = siblings.map((item) => item.slug);
    const [moved] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, moved);
    setBusy(true);
    setStatus("");
    try {
      await staffFetch("/api/staff/reorder", {
        method: "POST",
        body: JSON.stringify({
          categoryId: product.category,
          family: product.family,
          slugs: ordered,
        }),
      });
      await reload();
      setStatus(`Order updated in ${product.family}.`);
    } catch (err) {
      setStatus(err.message || "Reorder failed.");
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
          {canReorderList ? (
            <p className="admin-hint">Up / down reorders within a family.</p>
          ) : (
            <p className="admin-hint">Pick one category (clear search) to reorder.</p>
          )}
          <ul>
            {loading && !products.length ? <li>Loading catalogue…</li> : null}
            {visible.map((item) => (
              <li key={item.slug} className="admin-list-row">
                <button
                  type="button"
                  className={item.slug === selectedSlug ? "is-active" : ""}
                  onClick={() => setSelectedSlug(item.slug)}
                >
                  <strong>{item.sku || item.slug}</strong>
                  <span>
                    {item.family} · {item.model}
                  </span>
                </button>
                {canReorderList ? (
                  <div className="admin-list-move">
                    <button
                      type="button"
                      aria-label={`Move ${item.sku} up`}
                      disabled={busy}
                      onClick={() => moveProductInFamily(item.slug, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.sku} down`}
                      disabled={busy}
                      onClick={() => moveProductInFamily(item.slug, 1)}
                    >
                      ↓
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>

        <main className="admin-editor">
          {!draft || !selected ? (
            <p className="admin-empty">Pick a product. Upload photos in the image strip; first image is the card.</p>
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

              <fieldset className="admin-gallery">
                <legend>Images</legend>
                <p className="admin-hint">First image is the product card. Upload, then use ↑ ↓ to order. Changes save immediately.</p>
                <div className="admin-gallery-strip">
                  {draft.gallery.length ? (
                    draft.gallery.map((src, index) => (
                      <figure key={`${src}-${index}`} className="admin-gallery-item">
                        <img src={src} alt="" width="160" height="160" />
                        {index === 0 ? <figcaption>Card</figcaption> : <figcaption>{index + 1}</figcaption>}
                        <div className="admin-gallery-actions">
                          <button type="button" disabled={busy || index === 0} onClick={() => moveGallery(index, -1)}>
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={busy || index === draft.gallery.length - 1}
                            onClick={() => moveGallery(index, 1)}
                          >
                            ↓
                          </button>
                          <button type="button" disabled={busy} onClick={() => removeGallery(index)}>
                            Remove
                          </button>
                        </div>
                      </figure>
                    ))
                  ) : (
                    <p className="admin-empty">No images yet.</p>
                  )}
                </div>
                <div className="admin-gallery-upload">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadImage(file);
                    }}
                  />
                </div>
              </fieldset>

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
                {busy ? "Working…" : "Save to Cosmos"}
              </button>
              {status ? <p className="admin-status">{status}</p> : null}
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
