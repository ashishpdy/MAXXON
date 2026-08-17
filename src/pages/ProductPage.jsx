import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader.jsx";
import SpecTable from "../components/SpecTable.jsx";
import Footer from "../components/Footer.jsx";
import { MaxxonChat } from "../components/MaxxonChat";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { familyTitle, findProductBySlug, productImages } from "../catalog/registry.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { navigate } from "../nav.js";
import { SITE_NAME, productSchema } from "../seo/site.js";

export default function ProductPage({ slug }) {
  const { t } = useI18n();
  const { categories, loading } = useCatalog();
  const [navOpen, setNavOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const match = useMemo(() => findProductBySlug(slug, categories), [slug, categories]);
  const product = match?.product;
  const category = match?.category;
  const images = useMemo(() => productImages(product), [product]);
  const productName = product?.model || product?.sku || slug;
  const overlayValue = product?.[product?.overlayField] || product?.wattage || "";

  useEffect(() => {
    setActiveIndex(0);
  }, [slug]);

  useEffect(() => {
    const previous = document.title;
    document.title = product ? `${productName} | ${SITE_NAME}` : SITE_NAME;
    return () => {
      document.title = previous;
    };
  }, [product, productName]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setNavOpen(false);
      if (!images.length) return;
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % images.length);
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => (index - 1 + images.length) % images.length);
      }
    }
    function onResize() {
      if (window.innerWidth > 640) setNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

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
    };
  }, [navOpen, images.length]);

  function unlockNavScroll() {
    if (!document.body.classList.contains("nav-open")) return;
    const y = Number(document.body.dataset.scrollY || 0);
    document.body.classList.remove("nav-open");
    document.body.style.top = "";
    delete document.body.dataset.scrollY;
    window.scrollTo(0, y);
  }

  function goHome(event) {
    event.preventDefault();
    unlockNavScroll();
    setNavOpen(false);
    navigate("/");
  }

  function goToCategory(id) {
    unlockNavScroll();
    setNavOpen(false);
    try {
      sessionStorage.setItem("maxxon:returnCategory", id);
    } catch {
      /* ignore */
    }
    navigate(`/#${id}`);
  }

  const currentImage = images[activeIndex] || "";

  return (
    <div className="app-shell product-shell">
      {product ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema(product)) }}
        />
      ) : null}
      <SiteHeader
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
        activeCategory={category?.id || ""}
        onSelect={goToCategory}
        onBrandClick={goHome}
      />

      <main className="product-page">
        {loading && !product ? (
          <p className="product-status">{t("pdp.loading")}</p>
        ) : !product ? (
          <div className="product-status">
            <p>{t("pdp.missing")}</p>
            <a href="/" onClick={goHome}>
              {t("pdp.home")}
            </a>
          </div>
        ) : (
          <article className="product-layout">
            <p className="product-back-row">
              <a
                className="product-back"
                href={`/#${category.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  goToCategory(category.id);
                }}
              >
                {t("pdp.back", { category: t(category.navKey) })}
              </a>
            </p>

            <div className="product-gallery" aria-label={t("pdp.gallery")}>
              <div className="product-stage">
                {currentImage ? (
                  <img
                    className="product-hero-image"
                    src={currentImage}
                    alt={productName}
                    width="960"
                    height="960"
                  />
                ) : (
                  <div className="product-card-placeholder">
                    <span>{t("card.imagePending")}</span>
                  </div>
                )}
                <div className="product-card-overlays">
                  <span className="overlay-sku">{product.sku || "SKU"}</span>
                  {overlayValue ? <span className="overlay-wattage">{overlayValue}</span> : null}
                </div>
              </div>
              {images.length > 1 ? (
                <ul className="product-thumbs">
                  {images.map((src, index) => (
                    <li key={`${src}-${index}`}>
                      <button
                        type="button"
                        className={`product-thumb${index === activeIndex ? " is-active" : ""}`}
                        onClick={() => setActiveIndex(index)}
                        aria-label={t("pdp.thumb", { n: index + 1, total: images.length })}
                        aria-current={index === activeIndex ? "true" : undefined}
                      >
                        <img src={src} alt="" width="120" height="120" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="product-copy">
              <p className="product-kicker">{familyTitle(product.family, t)}</p>
              <h1 className="product-title">{productName}</h1>
              <p className="product-sku">{product.sku}</p>
              <p className="product-lede">
                {product.description || t(category.subtitleKey)}
              </p>
              {Array.isArray(product.features) && product.features.length ? (
                <ul className="product-features">
                  {product.features.filter(Boolean).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <SpecTable
                specs={product.specs}
                specKeys={product.specKeys || category.specKeys}
                t={t}
                productName={productName}
                showAll
              />
            </div>
          </article>
        )}
      </main>

      <Footer />
      <MaxxonChat />
    </div>
  );
}
