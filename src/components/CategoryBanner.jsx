export default function CategoryBanner({ id, title, subtitle, image, eyebrow }) {
  return (
    <header
      className={`category-banner${image ? " has-image" : ""}`}
    >
      {image ? (
        <img className="category-banner-photo" src={image} alt={title} />
      ) : null}
      <div className="category-banner-content">
        <p className="category-eyebrow">{eyebrow || "MAXX-ON"}</p>
        <h2 id={id} className="category-title">
          {title}
        </h2>
        {subtitle ? <p className="category-subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
}
