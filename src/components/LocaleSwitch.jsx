import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LOCALES } from "../i18n/messages.js";
import { useI18n } from "../i18n/I18nProvider.jsx";

function GlobeIcon() {
  return (
    <svg className="locale-globe" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 12h18M12 3c3 3.6 3 14.4 0 18M12 3c-3 3.6-3 14.4 0 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function LocaleSwitch() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const current = LOCALES.find((item) => item.id === locale) || LOCALES[0];

  function placeMenu() {
    const btn = rootRef.current?.querySelector(".locale-toggle");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const rtl = document.documentElement.dir === "rtl";
    const width = 168;
    const left = rtl
      ? Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
      : Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setMenuPos({ top: rect.bottom + 6, left });
  }

  useLayoutEffect(() => {
    if (!open) return undefined;
    placeMenu();
    window.addEventListener("resize", placeMenu);
    return () => window.removeEventListener("resize", placeMenu);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function onPointer(event) {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu = (
    <ul
      ref={menuRef}
      className="locale-menu"
      role="listbox"
      aria-label={t("locale.label")}
      style={{ top: menuPos.top, left: menuPos.left }}
    >
      {LOCALES.map((item) => (
        <li key={item.id} role="none">
          <button
            type="button"
            role="option"
            className={`locale-btn${locale === item.id ? " is-active" : ""}`}
            aria-selected={locale === item.id}
            lang={item.id}
            onClick={() => {
              setLocale(item.id);
              setOpen(false);
            }}
          >
            {t(`locale.${item.id}`)}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`locale-switch${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="locale-toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("locale.label")}
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon />
        <span lang={current.id}>{current.label}</span>
      </button>
      {open ? createPortal(menu, document.body) : null}
    </div>
  );
}
