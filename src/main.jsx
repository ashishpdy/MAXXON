import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Glossery from "./pages/glossery.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import { MaxxonChat } from "./components/MaxxonChat";
import { I18nProvider } from "./i18n/I18nProvider.jsx";
import { CatalogProvider } from "./catalog/CatalogProvider.jsx";
import { currentPathname, productSlugFromPath } from "./nav.js";
import "./styles/layout.css";
import "./styles/hero.css";
import "./styles/cards.css";
import "./styles/chat.css";
import "./styles/glossary.css";
import "./styles/product.css";
import "./styles/admin.css";

function Root() {
  const [path, setPath] = useState(currentPathname);

  useEffect(() => {
    function onPop() {
      setPath(currentPathname());
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (path === "/glossary") {
    window.history.replaceState(null, "", "/glossery");
  }
  if (path === "/glossery" || path === "/glossary") {
    return <Glossery />;
  }

  const slug = productSlugFromPath(path);
  const showChat = path !== "/admin";

  return (
    <I18nProvider>
      <CatalogProvider>
        {path === "/admin" ? <AdminPage /> : slug ? <ProductPage slug={slug} /> : <App />}
        {showChat ? <MaxxonChat /> : null}
      </CatalogProvider>
    </I18nProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
