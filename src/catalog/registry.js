import categoriesFile from "./categories.json";

const catalogs = import.meta.glob("../styles/*.json", {
  eager: true,
  import: "default",
});

function resolveSpecKeys(ref, specKeysMap = categoriesFile.specKeys) {
  if (Array.isArray(ref)) return ref;
  return specKeysMap[ref] || specKeysMap.default;
}

export const SPEC_KEY_SETS = categoriesFile.specKeys;

export function decorateCategory(cat, specKeysMap = SPEC_KEY_SETS) {
  return {
    ...cat,
    catalog: cat.catalog || {},
    specKeys: resolveSpecKeys(cat.specKeys, specKeysMap),
    overlayField: cat.overlayField || "wattage",
    familyGroups: cat.familyGroups || [],
    navKey: `nav.${cat.id}`,
    titleKey: `banner.${cat.id}.title`,
    subtitleKey: `banner.${cat.id}.subtitle`,
  };
}

export function loadLocalCatalogue() {
  return categoriesFile.categories
    .map((cat) => {
      const catalog = catalogs[`../styles/${cat.id}.json`] || {};
      return decorateCategory({ ...cat, catalog });
    })
    .filter((cat) => Object.keys(cat.catalog).length > 0);
}

export async function loadCatalogue() {
  const url = import.meta.env.DEV ? "/api/catalogue" : import.meta.env.VITE_CATALOGUE_URL;
  if (url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`catalogue ${response.status}`);
      const data = await response.json();
      const specKeys = data.specKeys || SPEC_KEY_SETS;
      const list = Array.isArray(data) ? data : data.categories || [];
      const hydrated = list
        .map((cat) => decorateCategory(cat, specKeys))
        .filter((cat) => Object.keys(cat.catalog || {}).length > 0);
      if (hydrated.length) return hydrated;
    } catch (err) {
      if (import.meta.env.DEV) console.warn("catalogue fetch failed, using bundled JSON", err);
    }
  }
  return loadLocalCatalogue();
}

/** @deprecated use loadCatalogue / useCatalog — kept for modules that still import CATEGORIES at build time */
export const CATEGORIES = loadLocalCatalogue();

export function getCategory(id, categories = CATEGORIES) {
  return categories.find((cat) => cat.id === id);
}

export function familyTitle(family, t) {
  const nameKey = `family.${family}`;
  const name = t(nameKey);
  return t("family.series", { name: name === nameKey ? family : name });
}

export function groupCatalog(catalog, groups = []) {
  const byMember = new Map();
  for (const group of groups) {
    for (const family of group.families) byMember.set(family, group);
  }

  const grouped = {};
  const consumed = new Set();
  for (const [family, items] of Object.entries(catalog || {})) {
    if (consumed.has(family)) continue;
    const group = byMember.get(family);
    if (!group) {
      grouped[family] = items;
      continue;
    }
    grouped[group.id] = group.families.flatMap((name) => catalog[name] || []);
    group.families.forEach((name) => consumed.add(name));
  }
  return grouped;
}

export function flattenCatalog(catalog, category, categories = CATEGORIES) {
  const products = [];
  const categoryId = typeof category === "string" ? category : category?.id;
  const meta = typeof category === "string" ? getCategory(category, categories) : category;
  for (const [family, items] of Object.entries(catalog || {})) {
    for (const product of items || []) {
      products.push({
        ...product,
        family,
        category: categoryId,
        kind: meta?.kind,
        schemaCategory: meta?.schemaCategory,
        overlayField: meta?.overlayField,
        specKeys: meta?.specKeys,
      });
    }
  }
  return products;
}

export function flattenAllProducts(categories = CATEGORIES) {
  return categories.flatMap((cat) => flattenCatalog(cat.catalog, cat, categories));
}

export function joinEnglish(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function catalogLabels(categories = CATEGORIES) {
  return categories.map((cat) => cat.label);
}
