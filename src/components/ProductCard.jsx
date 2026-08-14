import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider.jsx";

const SPEC_KEYS = [
  "power",
  "type",
  "response",
  "range",
  "snr",
  "sensitivity",
  "impedance",
  "weight",
  "inputs",
];

function SpecTable({ specs, t, productName }) {
  const rows = SPEC_KEYS
    .map((key) => ({ key, label: t(`spec.${key}`), value: specs?.[key] }))
    .filter((row) => row.value);

  if (!rows.length) {
    return <p className="card-specs-empty">{t("card.specsEmpty")}</p>;
  }

  return (
    <table className="card-specs">
      <caption className="visually-hidden">{t("a11y.specs", { name: productName })}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function mouseCanHover() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return (
    window.matchMedia("(any-hover: hover)").matches ||
    window.matchMedia("(any-pointer: fine)").matches
  );
}

export default function ProductCard({ product, isFlipped, onFlip }) {
  const { t } = useI18n();
  const [hoverFlip, setHoverFlip] = useState(mouseCanHover);
  const imageSrc = product.image_front || "";
  const hasImage = Boolean(imageSrc);
  const productName = product.model || product.sku || "Product";

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
    if (hoverFlip) return;
    event.preventDefault();
    onFlip?.();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onFlip?.();
    }
  }

  return (
    <article
      id={product.slug}
      className={`product-card${isFlipped ? " is-flipped" : ""}${hoverFlip ? " is-hover-flip" : " is-touch"}`}
    >
      <button
        type="button"
        className="product-card-flip"
        aria-pressed={isFlipped}
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
            <span className="overlay-wattage">{product.wattage || "—"}</span>
          </div>
        </div>

        <div className="product-card-face product-card-back">
          <div className="product-card-back-header">
            <h4 className="product-card-model">{product.model || product.sku || "Model"}</h4>
            <p className="product-card-sku-back">{product.sku}</p>
          </div>
          <SpecTable specs={product.specs} t={t} productName={productName} />
          <p className="product-card-hint">
            {hoverFlip ? t("card.hintHover") : t("card.hintTap")}
          </p>
        </div>
      </div>
    </article>
  );
}
