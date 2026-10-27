# Data tools

`assets/js/data.js` is generated; these scripts rebuild it.

1. **Map** — `npm install` here, then `Q=0.25 node build-map.mjs` writes `map.json`
   (Natural Earth 1:50m via `world-atlas`, conic equal-area projection, simplified with `topojson-simplify`).
2. **Demography** — download `data/popprojAge1dt.rda` from <https://github.com/PPgp/wpp2024>, then
   `python build-demography.py popprojAge1dt.rda demog.json`.
3. Combine both into `assets/js/data.js` as `window.NA_MAP` and `window.NA_DEMOG`
   (the site uses `viewBox, CA, US, MX, borders, context, labels, ports` from the map and the full demography object).
