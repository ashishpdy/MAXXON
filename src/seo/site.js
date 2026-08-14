import { CATEGORIES, catalogLabels, flattenCatalog, joinEnglish } from "../catalog/registry.js";

export const SITE_ORIGIN = "https://yellow-pebble-06cc7ac10.azurestaticapps.net";
export const SITE_NAME = "MAXX-ON";
export const ORG_NAME = "PARI PRO ACOUSTICS INDUSTRIES (MAXX-ON)";

const LABEL_LIST = catalogLabels();
const LABEL_PHRASE = joinEnglish(LABEL_LIST.map((label) => label.toLowerCase()));
const LABEL_TITLE = joinEnglish(LABEL_LIST);

export const SITE_TITLE = LABEL_TITLE
  ? `${SITE_NAME} | Professional ${LABEL_TITLE}`
  : `${SITE_NAME} | Professional Audio`;
export const SITE_DESCRIPTION = LABEL_PHRASE
  ? `${SITE_NAME} professional audio catalogue: ${LABEL_PHRASE} for install, stage, and worship. Browse models, ratings, and specs from PARI PRO ACOUSTICS.`
  : `${SITE_NAME} professional audio catalogue from PARI PRO ACOUSTICS.`;
export const SITE_KEYWORDS = [
  SITE_NAME,
  ...LABEL_LIST.map((label) => label.toLowerCase()),
  "professional audio",
  "PA",
  "PARI PRO ACOUSTICS",
  "install audio",
  "stage audio",
].join(", ");
export const SITE_IMAGE = `${SITE_ORIGIN}${CATEGORIES[0]?.banner || "/assets/banners/amplifiers.png"}`;

export { flattenCatalog };

export function absoluteUrl(path = "/") {
  if (!path) return SITE_ORIGIN;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

export function productDescription(product) {
  const name = product.model || product.sku || "Product";
  const kind = product.kind || product.category || "product";
  const highlight = product.wattage ? `, ${product.wattage}` : "";
  const specBits = [
    product.specs?.power,
    product.specs?.type,
    product.specs?.response,
  ].filter(Boolean);
  const spec = specBits.length ? ` ${specBits.join(". ")}.` : "";
  return `MAXX-ON ${name} ${kind}${highlight}.${spec}`.trim();
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
    category: product.schemaCategory || product.category || "Professional audio",
    additionalProperty: extra,
  };
}
