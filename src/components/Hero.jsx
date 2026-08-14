import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Hero() {
  const { t } = useI18n();

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
