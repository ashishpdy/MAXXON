import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import CategoryTile from "./CategoryTile.jsx";

export default function CategoryIndex({ onSelect }) {
  const { t } = useI18n();
  const { categories } = useCatalog();
  const [flippedId, setFlippedId] = useState(null);

  function handleFlip(id) {
    setFlippedId((current) => (current === id ? null : id));
  }

  return (
    <section id="categories" className="category-index" aria-label={t("nav.categories")}>
      <div className="category-index-grid">
        {categories.map((category) => (
          <CategoryTile
            key={category.id}
            category={category}
            isFlipped={flippedId === category.id}
            onFlip={() => handleFlip(category.id)}
            onSelect={() => onSelect?.(category.id)}
          />
        ))}
      </div>
    </section>
  );
}
