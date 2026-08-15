import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Glossery from "./pages/glossery.jsx";
import { I18nProvider } from "./i18n/I18nProvider.jsx";
import { CatalogProvider } from "./catalog/CatalogProvider.jsx";
import "./styles/layout.css";
import "./styles/hero.css";
import "./styles/cards.css";
import "./styles/chat.css";
import "./styles/glossary.css";

function Root() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/glossary") {
    window.history.replaceState(null, "", "/glossery");
  }
  if (path === "/glossery" || path === "/glossary") {
    return <Glossery />;
  }
  return (
    <I18nProvider>
      <CatalogProvider>
        <App />
      </CatalogProvider>
    </I18nProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
