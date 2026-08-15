import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/I18nProvider.jsx";
import CategoryBar from "./CategoryBar.jsx";
import LocaleSwitch from "./LocaleSwitch.jsx";

export default function Hero({ activeCategory, onSelectCategory, onChromeVisibleChange }) {
  const { t } = useI18n();
  const chromeRef = useRef(null);

  useEffect(() => {
    const chrome = chromeRef.current;
    if (!chrome) return;

    const observer = new IntersectionObserver(
      ([entry]) => onChromeVisibleChange?.(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(chrome);
    return () => observer.disconnect();
  }, [onChromeVisibleChange]);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <img
        className="hero-photo"
        src="/assets/banners/hero.png"
        alt=""
        width="1920"
        height="1080"
        fetchPriority="high"
      />
      <div className="hero-veil" aria-hidden="true" />
      <div className="hero-chrome" ref={chromeRef}>
        <a className="brand" href="#top">
          <img
            className="brand-logo"
            src="/assets/brand/maxx-on-logo.png"
            alt="MAXX-ON"
            width="639"
            height="273"
          />
          <h1 className="visually-hidden">MAXX-ON</h1>
        </a>
        <LocaleSwitch />
        <CategoryBar
          className="category-bar hero-category-bar"
          activeCategory={activeCategory}
          onSelect={onSelectCategory}
        />
      </div>
      <div className="hero-content">
        <h2 id="hero-title" className="hero-title">
          {t("hero.title")}
        </h2>
        <p className="hero-subtitle">{t("hero.subtitle")}</p>
      </div>
      <a className="hero-scroll" href="#categories">
        <span className="visually-hidden">{t("hero.scroll")}</span>
        <span className="hero-scroll-arrow" aria-hidden="true" />
      </a>
    </section>
  );
}
