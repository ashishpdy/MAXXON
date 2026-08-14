import { useEffect, useState } from "react";
import CategoryBanner from "./components/CategoryBanner.jsx";
import FamilyBanner from "./components/FamilyBanner.jsx";
import ProductCard from "./components/ProductCard.jsx";
import Footer from "./components/Footer.jsx";
import LocaleSwitch from "./components/LocaleSwitch.jsx";
import amplifiers from "./styles/amplifiers.json";
import microphones from "./styles/microphones.json";
import { useI18n } from "./i18n/I18nProvider.jsx";
import JsonLd from "./seo/JsonLd.jsx";

const CATEGORIES = [
  { id: "amplifiers", labelKey: "nav.amplifiers" },
  { id: "microphones", labelKey: "nav.microphones" },
];

function familyTitle(family, t) {
  const nameKey = `family.${family}`;
  const name = t(nameKey);
  return t("family.series", { name: name === nameKey ? family : name });
}

function CategorySection({ id, title, subtitle, image, catalog, flippedSku, onFlip, t }) {
  return (
    <section id={id} className="category-section" aria-labelledby={`${id}-title`}>
      <CategoryBanner
        id={`${id}-title`}
        title={title}
        subtitle={subtitle}
        image={image}
        eyebrow={t("banner.eyebrow")}
      />
      {Object.entries(catalog).map(([family, items]) => (
        <section key={family} className="family-section" aria-label={familyTitle(family, t)}>
          <FamilyBanner title={familyTitle(family, t)} />
          <div className="product-grid">
            {items.map((product) => (
              <ProductCard
                key={product.slug}
                product={product}
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
  const [activeCategory, setActiveCategory] = useState("amplifiers");
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
      <a className="skip-link" href="#catalogue">
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
              {t(cat.labelKey)}
            </button>
          ))}
        </nav>
        <LocaleSwitch />
      </header>

      <main id="top" className="site-main">
        <div id="catalogue">
          <CategorySection
            id="amplifiers"
            title={t("banner.amplifiers.title")}
            subtitle={t("banner.amplifiers.subtitle")}
            image="/assets/banners/amplifiers.png"
            catalog={amplifiers}
            flippedSku={flippedSku}
            onFlip={handleCardFlip}
            t={t}
          />
          <CategorySection
            id="microphones"
            title={t("banner.microphones.title")}
            subtitle={t("banner.microphones.subtitle")}
            image="/assets/banners/microphones.png"
            catalog={microphones}
            flippedSku={flippedSku}
            onFlip={handleCardFlip}
            t={t}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
