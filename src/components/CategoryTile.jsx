import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider.jsx";

function mouseCanHover() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return (
    window.matchMedia("(any-hover: hover)").matches ||
    window.matchMedia("(any-pointer: fine)").matches
  );
}

export default function CategoryTile({ category, isFlipped, onFlip, onSelect }) {
  const { t } = useI18n();
  const [hoverFlip, setHoverFlip] = useState(mouseCanHover);
  const title = t(category.titleKey);
  const image = category.banner || "";

  useEffect(() => {
    const hoverMq = window.matchMedia("(any-hover: hover)");
    const fineMq = window.matchMedia("(any-pointer: fine)");
    const update = () => setHoverFlip(hoverMq.matches || fineMq.matches);
    update();
    hoverMq.addEventListener("change", update);
    fineMq.addEventListener("change", update);

    function onPointer(event) {
      if (event.pointerType === "mouse") setHoverFlip(true);
    }
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      hoverMq.removeEventListener("change", update);
      fineMq.removeEventListener("change", update);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  function handleActivate(event) {
    event.preventDefault();
    if (hoverFlip) {
      onSelect?.();
      return;
    }
    if (isFlipped) {
      onSelect?.();
      return;
    }
    onFlip?.();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.();
    }
  }

  return (
    <article
      className={`category-tile${isFlipped ? " is-flipped" : ""}${hoverFlip ? " is-hover-flip" : " is-touch"}`}
    >
      <button
        type="button"
        className="category-tile-flip"
        aria-label={title}
        aria-pressed={isFlipped}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
      />
      <div className="category-tile-inner">
        <div className="category-tile-face category-tile-front">
          {image ? (
            <img className="category-tile-photo is-front" src={image} alt="" />
          ) : null}
        </div>
        <div className="category-tile-face category-tile-back">
          {image ? (
            <img className="category-tile-photo is-back" src={image} alt="" />
          ) : null}
          <div className="category-tile-veil" aria-hidden="true" />
          <h3 className="category-tile-name">{title}</h3>
        </div>
      </div>
    </article>
  );
}
