import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function ScrollUp({ onScrollUp }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("categories");
    if (!target) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const headerH = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 68;
      setVisible(target.getBoundingClientRect().bottom < headerH + 12);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function scrollToCategories() {
    onScrollUp?.();
  }

  return (
    <button
      type="button"
      className={`scroll-up${visible ? " is-visible" : ""}`}
      onClick={scrollToCategories}
      aria-label={t("a11y.scrollUp")}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <span className="scroll-up-arrow" aria-hidden="true" />
    </button>
  );
}
