export default function CategoryBanner({ id, title, subtitle, image }) {
  return (
    <header className={`category-banner${image ? " has-image" : ""}`}>
      {image ? (
        <img
          className="category-banner-photo"
          src={image}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.closest(".category-banner")?.classList.remove("has-image");
          }}
        />
      ) : null}
      <div className="category-banner-content">
        <span className="category-banner-rule" aria-hidden="true" />
        <h2 id={id} className="category-title">
          {title}
        </h2>
        {subtitle ? <p className="category-subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
}
