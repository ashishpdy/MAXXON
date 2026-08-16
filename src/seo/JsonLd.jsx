import { flattenCatalog } from "../catalog/registry.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import {
  ORG_NAME,
  SITE_DESCRIPTION,
  SITE_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
  productSchema,
} from "./site.js";

function itemListSchema(id, name, products) {
  return {
    "@type": "ItemList",
    "@id": `${SITE_ORIGIN}/#${id}`,
    name,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_ORIGIN}/p/${product.slug}`,
      item: { "@id": `${SITE_ORIGIN}/p/${product.slug}` },
    })),
  };
}

export default function JsonLd() {
  const { categories } = useCatalog();
  const categoryProducts = categories.map((cat) => ({
    cat,
    products: flattenCatalog(cat.catalog, cat, categories),
  }));

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        url: SITE_ORIGIN,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: ["en", "hi", "fr", "ar"],
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: ORG_NAME,
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/favicon.svg`,
        image: SITE_IMAGE,
        email: "maxx-on@hotmail.com",
        address: [
          {
            "@type": "PostalAddress",
            streetAddress: "112, Pocket K, Sector 3, Bawana Industrial Area",
            addressLocality: "Delhi",
            postalCode: "110039",
            addressCountry: "IN",
          },
          {
            "@type": "PostalAddress",
            streetAddress: "Deira, Naif, 17A Street, 3",
            addressLocality: "Dubai",
            addressCountry: "AE",
          },
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: "maxx-on@hotmail.com",
            areaServed: "IN",
            availableLanguage: ["en", "hi"],
          },
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: "Dubai@maxx-on.com",
            telephone: "+971-50-255-9568",
            areaServed: "AE",
            availableLanguage: ["en", "ar"],
          },
        ],
      },
      ...categoryProducts.flatMap(({ products }) => products.map(productSchema)),
      ...categoryProducts.map(({ cat, products }) =>
        itemListSchema(`${cat.id}-list`, `${SITE_NAME} ${cat.label.toLowerCase()}`, products)
      ),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
