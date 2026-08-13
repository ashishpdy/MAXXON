export default function CategoryBanner({ id, title, subtitle }) {
  return (
    <div className="category-banner" role="banner">
      <div className="category-banner-content">
        <p className="category-eyebrow">MAXX-ON catalogue</p>
        <h2 id={id} className="category-title">
          {title}
        </h2>
        {subtitle ? <p className="category-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}
