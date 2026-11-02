# Data tools

`assets/js/data.js` is generated; these scripts rebuild it.

1. **Map** — `npm install` here, then `Q=0.25 node build-map.mjs` writes `map.json`
   (Natural Earth 1:50m via `world-atlas`, conic equal-area projection, simplified with `topojson-simplify`).
2. **Demography** — download `data/popprojAge1dt.rda` (projections) and `data/popAge1dt.rda` (estimates)
   from <https://github.com/PPgp/wpp2024>, then
   `python build-demography.py popprojAge1dt.rda demog.json popAge1dt.rda`
   (the third argument adds `waIndex`, the 2000–2050 working-age index used by the line chart).
3. Combine both into `assets/js/data.js` as `window.NA_MAP` and `window.NA_DEMOG`
   (the site uses `viewBox, CA, US, MX, borders, context, labels, ports` from the map and the full demography object).

## Link-preview images

`og.html` is a 1200×630 template (`?page=home` or `?page=foundations`) that draws the map from `../assets/js/data.js` and copies the monarch and SAI marks from `../index.html`. `node build-og.mjs` (needs Playwright) renders it to `../assets/img/og-home.jpg` and `../assets/img/og-foundations.jpg`.

## Footer stamp

`node build-stamp.mjs` merges Canada, the United States and Mexico from world-atlas (1:110m) into one simplified outline and prints its path (fitted to a 100×100 box) for the `stamp-land` path in both footers. `Q=0.2` gives a lighter path, `Q=0.5` a more detailed one.
