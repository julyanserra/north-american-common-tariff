# One North America

A bilingual (English / Spanish) website showing **what a united North America would look like**: Canada, Mexico and the United States as a customs union, with one common tariff at the outer edge, free circulation of goods inside, and one trade policy toward the rest of the world.

The vision is based on Noyola & Serra, *A Case for a North American Common Tariff* (Wilson Center, 2025). The main page presents the logic; authors are credited in source notes and on the foundations page, which holds the academic and data foundations.

## Pages

**`index.html` — the vision**

| Section | What it shows |
|---|---|
| Hero | Plays once on load: "Three tariffs." is struck out and replaced by "One market." while the map's internal borders fade to a single perimeter (with a replay link) |
| The union in one sentence | One large sentence with inline chips (country silhouettes, the perimeter, a truck, a factory, a mini population pyramid, a rising line, a rook): economic gain and competitive weight, in the terms of the 2025 proposal |
| 01 The union at a glance | Five changes (common tariff, free circulation, shared rules, shared revenue, one trade policy) and what stays national |
| 02 The common tariff | A sample common tariff schedule (CA / US / MX today and the common rate), the rules that set it, and today's three EV tariffs toward China |
| 03 One perimeter | Ports of entry vs internal crossings, a "today vs in the union" journey, the rules-of-origin ratchet (1989–2023) and the 2025 stress test |
| 04 Built in North America | The 2015 charts brought up to date (exports, FDI, openness), the 2017→2024 shift in U.S. imports, energy and shipping facts |
| The scrambled egg theorem | Scroll-driven canvas: three eggs (1993) are scrambled into one production system held by supply-chain links (1994–2024); pulling them apart stretches the links, which snap back (2017, 2025); the mix then fills one North American perimeter. Ends with the theorem and its corollary |
| 05 Demographic advantage | Working-age index 2000–2050 (NA vs China, EU, Japan), combined pyramid (2025 / 2050), dependency ratios, median ages |
| 06 Neighbors already | Shared faith, languages and families; managed circular mobility |
| 07 Competing in the world | North America vs EU vs China |
| 08 How we get there | 2015's "Customs union (???)" answered in 2025; the five stages and the timeline |
| 09 Questions | Straight answers to hard questions |
| 10 Built on research | Link to the foundations page |

**`foundations.html` — the evidence**: the proposal in the authors' words, a lineage of proposals (Viner 1950 → CFR 2005 → Serra Puche 2015 → Noyola & Serra 2025), the evidence behind every claim, data and methods, and a full bibliography.

## Tech

Plain HTML, CSS and vanilla JavaScript. No build step. Fonts: Space Grotesk, Inter, JetBrains Mono (Google Fonts), matching julianserra.xyz.

The logo is a monarch butterfly, the one traveler that already crosses all three countries every year. Hovering the footer logo reveals a short note. On phones the section links and the language switch live in the menu, and wide charts switch to a narrow layout with larger type.

```
index.html, foundations.html
assets/css/styles.css
assets/js/data.js     # generated: map geometry + UN population data (see tools/)
assets/js/i18n.js     # Spanish translations (English lives in the HTML)
assets/js/main.js     # hero animation, chips, tariff schedule, charts, scrambled egg canvas, menu, language switch
assets/img/           # favicon, social share image
tools/                # scripts that regenerate data.js
SOURCES.md            # every figure and its source
```

### Run locally

```bash
python3 -m http.server 8000
# http://localhost:8000          (add ?lang=es for Spanish)
```

### Editing

- **English copy:** edit the HTML directly.
- **Spanish copy:** each translatable element has `data-i18n="key"`; edit that key in `assets/js/i18n.js`.
- **Tariff schedule rows:** `SCHEDULE` in `assets/js/main.js` (names and rule text are i18n keys `sch.p.*`, `sch.rule.*`).

### Deploy

- **GitHub Pages:** *Settings → Pages → Source: GitHub Actions*. `.github/workflows/pages.yml` deploys every push to `main`.
- **Vercel / Netlify / any static host:** serve the repo root; no build command.

Once a domain is set, make `og:image` an absolute URL so link previews work everywhere.
