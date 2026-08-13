import { useEffect, useState } from "react";
import CategoryBanner from "./components/CategoryBanner.jsx";
import ProductCard from "./components/ProductCard.jsx";
import Footer from "./components/Footer.jsx";
import amplifiers from "./data/amplifiers.json";

const CATEGORIES = [
  { id: "amplifiers", label: "Amplifiers" },
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState("amplifiers");
  const [flippedSku, setFlippedSku] = useState(null);

  useEffect(() => {
    const section = document.getElementById("amplifiers");
    if (!section) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActiveCategory("amplifiers");
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0.05 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  function scrollToCategory(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveCategory(id);
  }

  function handleCardFlip(sku) {
    setFlippedSku((current) => (current === sku ? null : sku));
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark">MX</span>
          <span className="brand-name">MAXX-ON</span>
        </a>
        <nav className="category-bar" aria-label="Product categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-link${activeCategory === cat.id ? " is-active" : ""}`}
              onClick={() => scrollToCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </header>

      <main id="top" className="site-main">
        <section id="amplifiers" className="category-section" aria-labelledby="amplifiers-title">
          <CategoryBanner
            id="amplifiers-title"
            title="Amplifiers"
            subtitle="Power, clarity, and rack-ready performance for install and stage."
          />
          <div className="product-grid">
            {amplifiers.map((product) => (
              <ProductCard
                key={product.sku || product.model}
                product={product}
                isFlipped={flippedSku === product.sku}
                onFlip={() => handleCardFlip(product.sku)}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
