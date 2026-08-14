export default function CategoryBanner({ id, title, subtitle, image, eyebrow }) {
  return (
    <div
      className={`category-banner${image ? " has-image" : ""}`}
      role="banner"
      style={image ? { "--banner-image": `url("${image}")` } : undefined}
    >
      <div className="category-banner-content">
        <p className="category-eyebrow">{eyebrow || "MAXX-ON"}</p>
        <h2 id={id} className="category-title">
          {title}
        </h2>
        {subtitle ? <p className="category-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}
