export function currentPathname() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

export function productSlugFromPath(pathname = currentPathname()) {
  const match = pathname.match(/^\/p\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function productHref(slug) {
  return `/p/${encodeURIComponent(slug)}`;
}

export function navigate(to) {
  const url = to.startsWith("/") ? to : `/${to}`;
  window.history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (!url.includes("#")) window.scrollTo(0, 0);
}
