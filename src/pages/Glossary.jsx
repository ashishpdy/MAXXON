import { GLOSSARY_SECTIONS, GLOSSARY_SUBTITLE, GLOSSARY_TITLE } from "./glossary-data.js";

function Entry({ term, icon, definition, footnote, diagram }) {
  return (
    <section className="glossary-entry">
      <h3>
        <span className="glossary-icon" aria-hidden="true">
          {icon}
        </span>
        {term}
      </h3>
      <p>{definition}</p>
      {footnote ? <aside>{footnote}</aside> : null}
      {diagram ? (
        <div className="diagram-placeholder">
          <img src={diagram} alt="" />
        </div>
      ) : null}
      <hr />
    </section>
  );
}

export default function Glossary() {
  return (
    <div className="glossary-page">
      <article className="glossary">
        <header className="glossary-header">
          <h1>{GLOSSARY_TITLE}</h1>
          <p className="glossary-subtitle">{GLOSSARY_SUBTITLE}</p>
        </header>

        {GLOSSARY_SECTIONS.map((section) => (
          <section key={section.letter} className="glossary-letter" aria-labelledby={`glossary-${section.letter}`}>
            <h2 id={`glossary-${section.letter}`}>{section.letter}</h2>
            {section.entries.map((item) => (
              <Entry key={item.term} {...item} />
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
