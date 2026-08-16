import { useEffect, useRef, useState } from "react";
import Hero from "./components/Hero.jsx";
import CategoryIndex from "./components/CategoryIndex.jsx";
import CategoryBanner from "./components/CategoryBanner.jsx";
import FamilyBanner from "./components/FamilyBanner.jsx";
import ProductCard from "./components/ProductCard.jsx";
import Footer from "./components/Footer.jsx";
import ScrollUp from "./components/ScrollUp.jsx";
import SiteHeader from "./components/SiteHeader.jsx";
import { useI18n } from "./i18n/I18nProvider.jsx";
import JsonLd from "./seo/JsonLd.jsx";
import { MaxxonChat } from "./components/MaxxonChat";
import { useCatalog } from "./catalog/CatalogProvider.jsx";
import { familyTitle, flattenAllProducts, groupCatalog } from "./catalog/registry.js";
import { navigate, productHref } from "./nav.js";

function CategorySection({ category, onOpen, t }) {
  const families = groupCatalog(category.catalog, category.familyGroups);
  return (
    <section id={category.id} className="category-section" aria-labelledby={`${category.id}-title`}>
      <CategoryBanner
        id={`${category.id}-title`}
        title={t(category.titleKey)}
        subtitle={t(category.subtitleKey)}
        image={category.banner}
        hideText={category.hideText}
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
                onOpen={onOpen}
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
  const { categories } = useCatalog();
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || "");
  const [heroInView, setHeroInView] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const spyLockRef = useRef(null);
  const homeLockRef = useRef(false);

  useEffect(() => {
    setActiveCategory((current) => {
      if (categories.some((cat) => cat.id === current)) return current;
      return categories[0]?.id || "";
    });
  }, [categories]);

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

    function updateHeaderPresence() {
      const title = document.getElementById("hero-title");
      if (!title) return;
      if (homeLockRef.current) {
        setHeroInView(false);
        return;
      }
      const titleTop = title.getBoundingClientRect().top;
      setHeroInView((away) => {
        if (window.scrollY <= 2) return true;
        if (titleTop <= 8) return false;
        return away;
      });
    }

    function updateActive() {
      if (spyLockRef.current) {
        const locked = spyLockRef.current;
        const section = document.querySelector(`section.category-section#${locked}`);
        if (section) {
          const mark = headerMark();
          const rect = section.getBoundingClientRect();
          if (rect.top <= mark + 32 && rect.bottom > mark) spyLockRef.current = null;
        }
        return;
      }

      const mark = headerMark();
      let current = categories[0]?.id || "";
      for (const cat of categories) {
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
        current = categories[categories.length - 1]?.id || current;
      }
      setActiveCategory(current);
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateHeaderPresence();
        updateActive();
      });
    }

    updateHeaderPresence();
    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.visualViewport?.addEventListener("scroll", onScroll);
    window.visualViewport?.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.visualViewport?.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [categories]);

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

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !categories.length) return;
    const productHit = flattenAllProducts(categories).find((item) => item.slug === hash);
    if (productHit) {
      navigate(productHref(productHit.slug));
      return;
    }
    const frame = requestAnimationFrame(() => scrollBeneathHeader(hash));
    return () => cancelAnimationFrame(frame);
  }, [categories]);

  function scrollToCategory(id) {
    spyLockRef.current = id;
    setNavOpen(false);
    setActiveCategory(id);
    scrollBeneathHeader(id);
    window.setTimeout(() => {
      if (spyLockRef.current === id) spyLockRef.current = null;
    }, 1400);
  }

  function goHome(event) {
    event.preventDefault();
    spyLockRef.current = null;
    setNavOpen(false);
    homeLockRef.current = true;
    setHeroInView(false);
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);

    const started = performance.now();
    function finishHome() {
      if (window.scrollY > 1 && performance.now() - started < 800) {
        requestAnimationFrame(finishHome);
        return;
      }
      root.style.scrollBehavior = prevBehavior;
      homeLockRef.current = false;
      setHeroInView(true);
    }

    requestAnimationFrame(finishHome);
  }

  function openProduct(slug) {
    navigate(productHref(slug));
  }

  return (
    <div className="app-shell">
      <JsonLd />
      <a className="skip-link" href="#categories">
        {t("a11y.skip")}
      </a>
      <SiteHeader
        away={heroInView}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
        activeCategory={activeCategory}
        onSelect={scrollToCategory}
        onBrandClick={goHome}
      />

      <main id="top" className="site-main">
        <Hero
          activeCategory={activeCategory}
          onSelectCategory={scrollToCategory}
          onGoHome={goHome}
          navOpen={navOpen}
          onToggleNav={() => setNavOpen((open) => !open)}
        />
        <CategoryIndex onSelect={scrollToCategory} />
        <div id="catalogue" className="catalogue">
          {categories.map((category) => (
            <CategorySection key={category.id} category={category} onOpen={openProduct} t={t} />
          ))}
        </div>
      </main>

      <Footer />
      <ScrollUp onScrollUp={() => scrollBeneathHeader("categories")} />
      <MaxxonChat />
    </div>
  );
}
