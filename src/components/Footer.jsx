import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <section className="footer-block">
          <h3>{t("footer.india")}</h3>
          <p>PARI PRO ACOUSTICS INDUSTRIES (MAXX-ON)</p>
          <p>112, Pocket K, Sector 3</p>
          <p>Bawana Industrial Area</p>
          <p>Delhi 110039, India</p>
          <p>
            <a href="mailto:maxx-on@hotmail.com">maxx-on@hotmail.com</a>
          </p>
        </section>

        <section className="footer-block">
          <h3>{t("footer.dubai")}</h3>
          <p>Navanym Electronics Trading (MAXX-ON)</p>
          <p>Deira, Naif, 17A Street, 3</p>
          <p>Dubai, UAE</p>
          <p>
            <a href="tel:+971502559568">+971 50 255 9568</a>
          </p>
          <p>
            <a href="tel:+971581233917">+971 58 123 3917</a>
          </p>
          <p>
            <a href="mailto:Dubai@maxx-on.com">Dubai@maxx-on.com</a>
          </p>
        </section>

        <div className="footer-badges" aria-hidden="true">
          <img src="/assets/badges/catalogue.png" alt="" />
          <img src="/assets/badges/trademark.png" alt="" />
          <img src="/assets/badges/iso.png" alt="" />
          <img src="/assets/badges/trademark-uae.png" alt="" />
        </div>
      </div>
      <p className="footer-note">{t("footer.note")}</p>
    </footer>
  );
}
