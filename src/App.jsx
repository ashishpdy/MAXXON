import { useEffect, useState } from "react";
import Hero from "./components/Hero.jsx";
import CategoryIndex from "./components/CategoryIndex.jsx";
import CategoryBanner from "./components/CategoryBanner.jsx";
import FamilyBanner from "./components/FamilyBanner.jsx";
import ProductCard from "./components/ProductCard.jsx";
import Footer from "./components/Footer.jsx";
import ScrollUp from "./components/ScrollUp.jsx";
import LocaleSwitch from "./components/LocaleSwitch.jsx";
import { useI18n } from "./i18n/I18nProvider.jsx";
import JsonLd from "./seo/JsonLd.jsx";
import { MaxxonChat } from "./components/MaxxonChat";
import { CATEGORIES, familyTitle, groupCatalog } from "./catalog/registry.js";

function CategorySection({ category, flippedSku, onFlip, t }) {
  const families = groupCatalog(category.catalog, category.familyGroups);
  return (
    <section id={category.id} className="category-section" aria-labelledby={`${category.id}-title`}>
      <CategoryBanner
        id={`${category.id}-title`}
        title={t(category.titleKey)}
        subtitle={t(category.subtitleKey)}
        image={category.banner}
        eyebrow={t("banner.eyebrow")}
      />
      {Object.entries(families).map(([family, items]) => (
        <section key={family} className="family-section" aria-label={familyTitle(family, t)}>
          <FamilyBanner title={familyTitle(family, t)} />
          <div className="product-grid">
            {items.map((product) => (
              <ProductCard
                key={product.slug}
                product={product}
                specKeys={category.specKeys}
                overlayField={category.overlayField}
                isFlipped={flippedSku === product.slug}
                onFlip={() => onFlip(product.slug)}
              />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

export default function App() {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]?.id || "");
  const [flippedSku, setFlippedSku] = useState(null);

  useEffect(() => {
    const observers = CATEGORIES.map((cat) => {
      const section = document.getElementById(cat.id);
      if (!section) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveCategory(cat.id);
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0.05 }
      );
      observer.observe(section);
      return observer;
    });
    return () => observers.forEach((observer) => observer?.disconnect());
  }, []);

  function scrollToCategory(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveCategory(id);
  }

  function handleCardFlip(sku) {
    setFlippedSku((current) => (current === sku ? null : sku));
  }

  return (
    <div className="app-shell">
      <JsonLd />
      <a className="skip-link" href="#categories">
        {t("a11y.skip")}
      </a>
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark">MX</span>
          <h1 className="brand-name">MAXX-ON</h1>
        </a>
        <nav className="category-bar" aria-label={t("nav.categories")}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-link${activeCategory === cat.id ? " is-active" : ""}`}
              aria-current={activeCategory === cat.id ? "true" : undefined}
              onClick={() => scrollToCategory(cat.id)}
            >
              {t(cat.navKey)}
            </button>
          ))}
        </nav>
        <LocaleSwitch />
      </header>

      <main id="top" className="site-main">
        <Hero />
        <CategoryIndex onSelect={scrollToCategory} />
        <div id="catalogue" className="catalogue">
          {CATEGORIES.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              flippedSku={flippedSku}
              onFlip={handleCardFlip}
              t={t}
            />
          ))}
        </div>
      </main>

      <Footer />
      <ScrollUp />
      <MaxxonChat />
    </div>
  );
}
