import { CATEGORIES } from "../catalog/registry.js";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function CategoryBar({ className, activeCategory, onSelect }) {
  const { t } = useI18n();

  return (
    <nav className={className} aria-label={t("nav.categories")}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`category-link${activeCategory === cat.id ? " is-active" : ""}`}
          aria-current={activeCategory === cat.id ? "true" : undefined}
          onClick={() => onSelect(cat.id)}
        >
          {t(cat.navKey)}
        </button>
      ))}
    </nav>
  );
}
