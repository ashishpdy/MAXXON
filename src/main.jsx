import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Glossary from "./pages/Glossary.jsx";
import { I18nProvider } from "./i18n/I18nProvider.jsx";
import "./styles/layout.css";
import "./styles/hero.css";
import "./styles/cards.css";
import "./styles/chat.css";
import "./styles/glossary.css";

function Root() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/glossary") {
    return <Glossary />;
  }
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
