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

let stagedBootHash;
let initialHashConsumed = false;
const RETURN_CATEGORY_KEY = "maxxon:returnCategory";

function readBootHash() {
  const staged = typeof window !== "undefined" ? window.__maxxonHash : "";
  return String(staged || window.location.hash || "").replace(/^#/, "");
}

function consumeBootHash() {
  if (stagedBootHash === undefined) {
    stagedBootHash = readBootHash();
    if (typeof window !== "undefined") window.__maxxonHash = "";
  }
  return stagedBootHash;
}

function takeReturnCategory() {
  try {
    const id = sessionStorage.getItem(RETURN_CATEGORY_KEY) || "";
    if (id) sessionStorage.removeItem(RETURN_CATEGORY_KEY);
    return id;
  } catch {
    return "";
  }
}

function rememberReturnCategory(id) {
  if (!id) return;
  try {
    sessionStorage.setItem(RETURN_CATEGORY_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

function cssVarPx(name, fallback) {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:var(${name})`;
  document.body.append(probe);
  const value = probe.getBoundingClientRect().height;
  probe.remove();
  return value || fallback;
}

function setCategoryHash(id) {
  const next = id ? `/#${id}` : "/";
  const current = `${window.location.pathname.replace(/\/+$/, "") || "/"}${window.location.search}${window.location.hash}`;
  if (current === next) return;
  window.history.replaceState(null, "", next);
}

function CategorySection({ category, onOpen, flippedSku, onFlip, t }) {
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
                isFlipped={flippedSku === product.slug}
                onFlip={() => onFlip(product.slug)}
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
  const { categories, loading } = useCatalog();
  const [activeCategory, setActiveCategory] = useState("");
  const [heroInView, setHeroInView] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [flippedSku, setFlippedSku] = useState(null);
  const spyLockRef = useRef(null);
  const spyLockTimerRef = useRef(0);
  const homeLockRef = useRef(false);
  const syncHashRef = useRef(false);
  const navOpenRef = useRef(false);

  useEffect(() => {
    setActiveCategory((current) => {
      if (!current) return current;
      if (categories.some((cat) => cat.id === current)) return current;
      return "";
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
      const hero = document.querySelector(".hero");
      const chrome = document.querySelector(".hero-chrome");
      if (!title) return;
      if (homeLockRef.current) {
        setHeroInView(false);
        return;
      }

      const titleTop = title.getBoundingClientRect().top;
      const heroTop = hero?.getBoundingClientRect().top ?? 0;
      const chromeBottom = chrome?.getBoundingClientRect().bottom ?? heroTop;

      setHeroInView((wasInHero) => {
        if (window.scrollY <= 2) return true;
        // Keep sticky hidden while hero chrome still occupies the top of the viewport.
        if (chromeBottom > 8) return true;
        if (titleTop <= 8) return false;
        return wasInHero;
      });
    }

    function updateActive() {
      // Opening the drawer locks body scroll and can scramble section rects —
      // freeze the highlighted menu item while the drawer is open.
      if (navOpenRef.current) return;

      if (spyLockRef.current) {
        const locked = spyLockRef.current;
        if (locked !== "categories" && locked !== "catalogue") {
          setActiveCategory(locked);
        }
        // Keep the intentional target selected until the lock timer ends —
        // early unlock lets layout shift put the spy on the wrong category.
        return;
      }

      const mark = headerMark();
      const hero = document.querySelector(".hero");
      const heroTop = hero?.getBoundingClientRect().top ?? 0;
      const inHero = window.scrollY <= 2 || heroTop > -8;

      if (inHero) {
        setActiveCategory("");
        if (syncHashRef.current) setCategoryHash("");
        return;
      }

      let current = categories[0]?.id || "";
      for (const cat of categories) {
        const section = document.querySelector(`section.category-section#${CSS.escape(cat.id)}`);
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
      if (syncHashRef.current && current) setCategoryHash(current);
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

    navOpenRef.current = navOpen;
    if (navOpen) {
      const y = window.scrollY;
      document.body.dataset.scrollY = String(y);
      document.body.style.top = `-${y}px`;
      document.body.classList.add("nav-open");
    } else if (document.body.classList.contains("nav-open")) {
      const y = Number(document.body.dataset.scrollY || 0);
      document.body.classList.remove("nav-open");
      document.body.style.top = "";
      delete document.body.dataset.scrollY;
      window.scrollTo(0, y);
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      if (document.body.classList.contains("nav-open")) {
        const y = Number(document.body.dataset.scrollY || 0);
        document.body.classList.remove("nav-open");
        document.body.style.top = "";
        delete document.body.dataset.scrollY;
        window.scrollTo(0, y);
      }
      navOpenRef.current = false;
    };
  }, [navOpen]);

  function scrollOffset() {
    // Always reserve sticky header space — category jumps leave the hero,
    // so measuring while the header is "away" undershoots and confuses the spy.
    return cssVarPx("--sticky-offset", 80);
  }

  function unlockNavScroll() {
    if (!document.body.classList.contains("nav-open")) return;
    const y = Number(document.body.dataset.scrollY || 0);
    document.body.classList.remove("nav-open");
    document.body.style.top = "";
    delete document.body.dataset.scrollY;
    navOpenRef.current = false;
    window.scrollTo(0, y);
  }

  function scrollBeneathHeader(id, behavior = "smooth") {
    const el = document.getElementById(id);
    if (!el) return false;
    const top = window.scrollY + el.getBoundingClientRect().top - scrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior });
    return true;
  }

  function clearSpyLock(hash) {
    if (spyLockRef.current === hash) spyLockRef.current = null;
  }

  function goToHash(hash, behavior = "auto") {
    if (!hash) return false;
    const productHit = flattenAllProducts(categories).find((item) => item.slug === hash);
    if (productHit) {
      navigate(productHref(productHit.slug));
      return true;
    }
    if (!categories.some((cat) => cat.id === hash) && hash !== "categories" && hash !== "catalogue") {
      return false;
    }
    spyLockRef.current = hash;
    if (hash !== "categories" && hash !== "catalogue") setActiveCategory(hash);
    setCategoryHash(hash === "categories" || hash === "catalogue" ? "" : hash);

    const pin = (scrollBehavior) => scrollBeneathHeader(hash, scrollBehavior);
    pin(behavior);
    // Re-pin after layout settles (banner/images above can shift the target).
    window.requestAnimationFrame(() => {
      pin("auto");
      window.setTimeout(() => pin("auto"), 120);
      window.setTimeout(() => pin("auto"), 360);
    });

    window.clearTimeout(spyLockTimerRef.current);
    const unlock = () => clearSpyLock(hash);
    if (behavior === "smooth" && "onscrollend" in window) {
      window.addEventListener("scrollend", unlock, { once: true });
      spyLockTimerRef.current = window.setTimeout(unlock, 2000);
    } else {
      spyLockTimerRef.current = window.setTimeout(unlock, behavior === "smooth" ? 1400 : 900);
    }
    return true;
  }

  useEffect(() => {
    if (loading || !categories.length) return;

    let cancelled = false;
    const pending = takeReturnCategory();
    const hash =
      pending ||
      (initialHashConsumed ? window.location.hash.replace(/^#/, "") : consumeBootHash());

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        initialHashConsumed = true;
        if (hash) goToHash(hash, "auto");
        syncHashRef.current = true;
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      syncHashRef.current = false;
    };
  }, [categories, loading]);

  function scrollToCategory(id) {
    unlockNavScroll();
    setNavOpen(false);
    goToHash(id, "smooth");
  }

  function goHome(event) {
    event.preventDefault();
    spyLockRef.current = null;
    unlockNavScroll();
    setNavOpen(false);
    homeLockRef.current = true;
    setHeroInView(false);
    setActiveCategory("");
    setCategoryHash("");
    try {
      sessionStorage.removeItem(RETURN_CATEGORY_KEY);
    } catch {
      /* ignore */
    }
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
    const fromHash = window.location.hash.replace(/^#/, "");
    const category =
      (activeCategory && categories.some((cat) => cat.id === activeCategory) && activeCategory) ||
      (categories.some((cat) => cat.id === fromHash) && fromHash) ||
      "";
    rememberReturnCategory(category);
    navigate(productHref(slug));
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
            <CategorySection
              key={category.id}
              category={category}
              onOpen={openProduct}
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
