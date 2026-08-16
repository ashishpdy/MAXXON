export function apiUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return normalized;
  const catalogue = import.meta.env.VITE_CATALOGUE_URL || "";
  const origin = catalogue.replace(/\/api\/catalogue\/?$/, "");
  return `${origin}${normalized}`;
}
