import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: false,
    proxy: {
      "/api/catalogue": {
        target: "https://maxxon-cehvcfazbjhhdwbb.eastus-01.azurewebsites.net",
        changeOrigin: true,
      },
    },
  },
});
