import CategoryBar from "./CategoryBar.jsx";
import LocaleSwitch from "./LocaleSwitch.jsx";
import NavToggle from "./NavToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function SiteHeader({
  away = false,
  navOpen,
  onToggleNav,
  activeCategory,
  onSelect,
  onBrandClick,
}) {
  const { t } = useI18n();

  return (
    <>
      <header className={`site-header${away ? " is-away" : ""}`}>
        <a className="brand" href="/" onClick={onBrandClick}>
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
          onSelect={onSelect}
        />
        <div className="header-tools">
          <LocaleSwitch />
          <NavToggle
            open={navOpen}
            onToggle={onToggleNav}
            openLabel={t("a11y.menu")}
            closeLabel={t("a11y.closeMenu")}
          />
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
          onSelect={onSelect}
        />
      </div>
    </>
  );
}
