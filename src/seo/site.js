export const SITE_ORIGIN = "https://yellow-pebble-06cc7ac10.azurestaticapps.net";
export const SITE_NAME = "MAXX-ON";
export const SITE_TITLE = "MAXX-ON | Professional Amplifiers and Microphones";
export const SITE_DESCRIPTION =
  "MAXX-ON professional audio catalogue: amplifiers and microphones for install, stage, and worship. Browse models, power ratings, and specs from PARI PRO ACOUSTICS.";
export const SITE_KEYWORDS =
  "MAXX-ON, amplifiers, microphones, professional audio, PA amplifier, wireless microphone, wired microphone, PARI PRO ACOUSTICS, install audio, stage audio";
export const SITE_IMAGE = `${SITE_ORIGIN}/assets/banners/amplifiers.png`;
export const ORG_NAME = "PARI PRO ACOUSTICS INDUSTRIES (MAXX-ON)";

export function absoluteUrl(path = "/") {
  if (!path) return SITE_ORIGIN;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

export function flattenCatalog(catalog, category) {
  const products = [];
  for (const [family, items] of Object.entries(catalog || {})) {
    for (const product of items || []) {
      products.push({ ...product, family, category });
    }
  }
  return products;
}

export function productDescription(product) {
  const name = product.model || product.sku || "Product";
  const kind = product.category === "microphones" ? "microphone" : "amplifier";
  const power = product.wattage ? `, ${product.wattage}` : "";
  const specBits = [
    product.specs?.power,
    product.specs?.type,
    product.specs?.response,
  ].filter(Boolean);
  const spec = specBits.length ? ` ${specBits.join(". ")}.` : "";
  return `MAXX-ON ${name} ${kind}${power}.${spec}`.trim();
}

export function productSchema(product) {
  const name = product.model || product.sku || "Product";
  const image = product.image_front ? absoluteUrl(product.image_front) : SITE_IMAGE;
  const extra = [];
  if (product.specs) {
    for (const [key, value] of Object.entries(product.specs)) {
      if (!value) continue;
      extra.push({
        "@type": "PropertyValue",
        name: key,
        value: String(value),
      });
    }
  }
  return {
    "@type": "Product",
    "@id": absoluteUrl(`/#${product.slug}`),
    name,
    sku: product.sku || product.slug,
    mpn: product.sku || product.slug,
    image,
    description: productDescription(product),
    url: absoluteUrl(`/#${product.slug}`),
    brand: { "@type": "Brand", name: SITE_NAME },
    manufacturer: { "@type": "Organization", name: ORG_NAME },
    category: product.category === "microphones" ? "Microphone" : "Audio amplifier",
    additionalProperty: extra,
  };
}
