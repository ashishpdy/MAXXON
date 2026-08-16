import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadCatalogue, loadLocalCatalogue } from "./registry.js";

const CatalogContext = createContext({
  categories: loadLocalCatalogue(),
  loading: true,
  reload: async () => {},
});

export function CatalogProvider({ children }) {
  const [categories, setCategories] = useState(() => loadLocalCatalogue());
  const [loading, setLoading] = useState(
    Boolean(import.meta.env.DEV || import.meta.env.VITE_CATALOGUE_URL)
  );

  const reload = useCallback(async () => {
    const list = await loadCatalogue();
    setCategories(list);
    setLoading(false);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCatalogue().then((list) => {
      if (cancelled) return;
      setCategories(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ categories, loading, reload }), [categories, loading, reload]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}
