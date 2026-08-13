import { useEffect, useState } from "react";

function SpecTable({ specs }) {
  const rows = [
    { label: "Power", value: specs?.power },
    { label: "Response", value: specs?.response },
    { label: "Weight", value: specs?.weight },
    { label: "Impedance", value: specs?.impedance },
    { label: "Inputs", value: specs?.inputs },
  ].filter((row) => row.value);

  if (!rows.length) {
    return <p className="card-specs-empty">Specs coming soon</p>;
  }

  return (
    <table className="card-specs">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ProductCard({ product, isFlipped, onFlip }) {
  const [coarsePointer, setCoarsePointer] = useState(false);
  const imageSrc = product.image_front || "";
  const hasImage = Boolean(imageSrc);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setCoarsePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  function handleActivate(event) {
    if (!coarsePointer) return;
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
      className={`product-card${isFlipped ? " is-flipped" : ""}${coarsePointer ? " is-touch" : ""}`}
      tabIndex={0}
      role="button"
      aria-pressed={isFlipped}
      aria-label={`${product.model || product.sku || "Product"} details`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <div className="product-card-inner">
        <div className="product-card-face product-card-front">
          {hasImage ? (
            <img
              className="product-card-image"
              src={imageSrc}
              alt={product.model || product.sku || "Amplifier"}
              loading="lazy"
            />
          ) : (
            <div className="product-card-placeholder" aria-hidden="true">
              <span>Image pending</span>
            </div>
          )}
          <div className="product-card-overlays">
            <span className="overlay-sku">{product.sku || "SKU"}</span>
            <span className="overlay-wattage">{product.wattage || "—"}</span>
          </div>
        </div>

        <div className="product-card-face product-card-back">
          <div className="product-card-back-header">
            <h3 className="product-card-model">{product.model || product.sku || "Model"}</h3>
            <p className="product-card-sku-back">{product.sku}</p>
          </div>
          <SpecTable specs={product.specs} />
          <p className="product-card-hint">
            {coarsePointer ? "Tap to flip back" : "Hover off to flip back"}
          </p>
        </div>
      </div>
    </article>
  );
}
