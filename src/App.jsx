import { useEffect, useState } from "react";
import Hero from "./components/Hero.jsx";
import CategoryIndex from "./components/CategoryIndex.jsx";
import CategoryBanner from "./components/CategoryBanner.jsx";
import FamilyBanner from "./components/FamilyBanner.jsx";
import ProductCard from "./components/ProductCard.jsx";
import Footer from "./components/Footer.jsx";
import ScrollUp from "./components/ScrollUp.jsx";
import LocaleSwitch from "./components/LocaleSwitch.jsx";
import CategoryBar from "./components/CategoryBar.jsx";
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
  const [heroInView, setHeroInView] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [flippedSku, setFlippedSku] = useState(null);

  useEffect(() => {
    let frame = 0;

    function headerMark() {
      const header = document.querySelector(".site-header");
      const away = header?.classList.contains("is-away");
      if (header && !away) {
        const bottom = header.getBoundingClientRect().bottom;
        if (bottom > 8) return bottom + 8;
      }
      return 48;
    }

    function updateActive() {
      frame = 0;
      const mark = headerMark();
      let current = CATEGORIES[0]?.id || "";
      for (const cat of CATEGORIES) {
        const section = document.querySelector(`section.category-section#${cat.id}`);
        if (!section) continue;
        const rect = section.getBoundingClientRect();
        if (rect.top <= mark && rect.bottom > mark) {
          current = cat.id;
          break;
        }
        if (rect.top <= mark) current = cat.id;
      }
      const doc = document.documentElement;
      if (window.scrollY + window.innerHeight >= doc.scrollHeight - 8) {
        current = CATEGORIES[CATEGORIES.length - 1]?.id || current;
      }
      setActiveCategory(current);
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(updateActive);
    }

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setNavOpen(false);
    }
    function onResize() {
      if (window.innerWidth > 640) setNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.classList.toggle("nav-open", navOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.classList.remove("nav-open");
    };
  }, [navOpen]);

  function scrollOffset() {
    const header = document.querySelector(".site-header");
    const away = header?.classList.contains("is-away");
    if (header && !away) {
      const live = header.getBoundingClientRect().height;
      if (live > 8) return live + 12;
    }
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;height:var(--sticky-offset)";
    document.body.append(probe);
    const reserved = probe.getBoundingClientRect().height;
    probe.remove();
    return reserved || 80;
  }

  function scrollBeneathHeader(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = window.scrollY + el.getBoundingClientRect().top - scrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function scrollToCategory(id) {
    setNavOpen(false);
    scrollBeneathHeader(id);
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
      <header className={`site-header${heroInView ? " is-away" : ""}`}>
        <a className="brand" href="#top">
          <img
            className="brand-logo"
            src="/assets/brand/maxx-on-logo.png"
            alt="MAXX-ON"
            width="639"
            height="273"
          />
        </a>
        <CategoryBar
          className="category-bar header-category-bar"
          activeCategory={activeCategory}
          onSelect={scrollToCategory}
        />
        <div className="header-tools">
          <LocaleSwitch />
          <button
            type="button"
            className={`nav-toggle${navOpen ? " is-open" : ""}`}
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
            aria-label={navOpen ? t("a11y.closeMenu") : t("a11y.menu")}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
      <div
        id="mobile-nav"
        className={`nav-drawer${navOpen ? " is-open" : ""}`}
        aria-hidden={!navOpen}
      >
        <CategoryBar
          className="category-bar nav-drawer-bar"
          activeCategory={activeCategory}
          onSelect={scrollToCategory}
        />
      </div>

      <main id="top" className="site-main">
        <Hero
          activeCategory={activeCategory}
          onSelectCategory={scrollToCategory}
          onChromeVisibleChange={setHeroInView}
        />
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
      <ScrollUp onScrollUp={() => scrollBeneathHeader("categories")} />
      <MaxxonChat />
    </div>
  );
}
