import categoriesFile from "./categories.json";

const catalogs = import.meta.glob("../styles/*.json", {
  eager: true,
  import: "default",
});

function resolveSpecKeys(ref) {
  if (Array.isArray(ref)) return ref;
  return categoriesFile.specKeys[ref] || categoriesFile.specKeys.default;
}

export const SPEC_KEY_SETS = categoriesFile.specKeys;

export const CATEGORIES = categoriesFile.categories
  .map((cat) => {
    const catalog = catalogs[`../styles/${cat.id}.json`] || {};
    return {
      ...cat,
      catalog,
      specKeys: resolveSpecKeys(cat.specKeys),
      overlayField: cat.overlayField || "wattage",
      familyGroups: cat.familyGroups || [],
      navKey: `nav.${cat.id}`,
      titleKey: `banner.${cat.id}.title`,
      subtitleKey: `banner.${cat.id}.subtitle`,
    };
  })
  .filter((cat) => Object.keys(cat.catalog).length > 0);

export function getCategory(id) {
  return CATEGORIES.find((cat) => cat.id === id);
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

export function flattenCatalog(catalog, category) {
  const products = [];
  const categoryId = typeof category === "string" ? category : category?.id;
  const meta = typeof category === "string" ? getCategory(category) : category;
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

export function flattenAllProducts() {
  return CATEGORIES.flatMap((cat) => flattenCatalog(cat.catalog, cat));
}

export function joinEnglish(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function catalogLabels() {
  return CATEGORIES.map((cat) => cat.label);
}
