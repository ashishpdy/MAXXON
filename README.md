# MAXX-ON Static Web App (prototype)

Vite + React catalogue prototype. Single category first: **Amplifiers**.

## Run locally

```bash
cd MAXXON
npm install
npm run dev
```

## Structure

- `src/data/amplifiers.json` — placeholder SKUs/specs (paste real data later)
- `assets/products/amplifiers/{SKU}/` — drop product images here later (mirror under `public/assets/...` for serving, or update paths)
- `public/assets/products/amplifiers/{SKU}/` — served image paths for `image_front` / `image_back`

## Next

1. Paste extracted amplifier images into SKU folders
2. Fill `amplifiers.json` specs + image filenames
3. Expand categories / merge with maxx-on.com later
