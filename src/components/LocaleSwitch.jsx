import { LOCALES } from "../i18n/messages.js";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function LocaleSwitch() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="locale-switch" role="group" aria-label={t("locale.label")}>
      {LOCALES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`locale-btn${locale === item.id ? " is-active" : ""}`}
          onClick={() => setLocale(item.id)}
          lang={item.id}
          aria-pressed={locale === item.id}
          aria-label={t(`locale.${item.id}`)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
