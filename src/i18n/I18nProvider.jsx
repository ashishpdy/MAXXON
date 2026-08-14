import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { detectLocale, localeMeta, translate } from "./messages.js";

const I18nContext = createContext({
  locale: "en",
  t: (key, vars) => translate("en", key, vars),
  setLocale: () => {},
});

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(detectLocale);

  useEffect(() => {
    const meta = localeMeta(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
    try {
      localStorage.setItem("maxxon-locale", locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      t: (key, vars) => translate(locale, key, vars),
      setLocale: setLocaleState,
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
