import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider.jsx";
import SpecTable from "./SpecTable.jsx";

function mouseCanHover() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return (
    window.matchMedia("(any-hover: hover)").matches ||
    window.matchMedia("(any-pointer: fine)").matches
  );
}

export default function ProductCard({ product, specKeys, overlayField = "wattage", onOpen }) {
  const { t } = useI18n();
  const [hoverFlip, setHoverFlip] = useState(mouseCanHover);
  const imageSrc = product.image_front || "";
  const hasImage = Boolean(imageSrc);
  const productName = product.model || product.sku || "Product";
  const overlayValue = product[overlayField] || product.wattage || "—";

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
    onOpen?.(product.slug);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.(product.slug);
    }
  }

  return (
    <article
      id={product.slug}
      className={`product-card${hoverFlip ? " is-hover-flip" : ""}`}
    >
      <button
        type="button"
        className="product-card-flip"
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
      >
        <span className="visually-hidden">{t("card.details", { name: productName })}</span>
      </button>
      <div className="product-card-inner">
        <div className="product-card-face product-card-front">
          <div className="product-card-media">
            {hasImage ? (
              <img
                className="product-card-image"
                src={imageSrc}
                alt={productName}
                width="640"
                height="640"
                loading="lazy"
              />
            ) : (
              <div className="product-card-placeholder" aria-hidden="true">
                <span>{t("card.imagePending")}</span>
              </div>
            )}
          </div>
          <div className="product-card-overlays">
            <span className="overlay-sku">{product.sku || "SKU"}</span>
            <span className="overlay-wattage">{overlayValue}</span>
          </div>
        </div>

        <div className="product-card-face product-card-back">
          <div className="product-card-back-header">
            <h4 className="product-card-model">{product.model || product.sku || "Model"}</h4>
            <p className="product-card-sku-back">{product.sku}</p>
          </div>
          <SpecTable specs={product.specs} specKeys={specKeys} t={t} productName={productName} />
          <p className="product-card-hint">
            {hoverFlip ? t("card.hintHover") : t("card.hintTap")}
          </p>
        </div>
      </div>
    </article>
  );
}
