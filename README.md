# One North America

A bilingual (English / Spanish) website showing **what a united North America would look like**: Canada, Mexico and the United States as a customs union, with one common tariff at the outer edge, free circulation of goods inside, and one voice in the world.

The vision is based on the proposal of Jaime Serra Puche and Pedro Noyola, *A Case for a North American Common Tariff* (Wilson Center, 2025). The academic and data foundations live on a second page.

## Pages

**`index.html` — the vision**

| Section | What it shows |
|---|---|
| Hero | Map of the three countries; on scroll the internal borders fade and a single perimeter remains |
| 01 The union at a glance | Five changes (common tariff, free circulation, shared rules, shared revenue, one voice) and what stays national |
| 02 The common tariff | A sample common tariff schedule: today's rates in CA / US / MX and where the common rate lands, with the rules that set it |
| 03 One perimeter | Ports of entry vs internal crossings, plus a "today vs in the union" journey of one part |
| 04 Demographic advantage | Combined population pyramid (2025 / 2050) and working-age change vs EU, China, Japan, India |
| 05 Built in North America | Nearshoring, shared production, energy, each country's role |
| 06 Neighbors already | Shared faith, languages and families; managed circular mobility |
| 07 One voice in the world | North America vs EU vs China |
| 08 How we get there | The five implementation stages and the timeline |
| 09 Questions | Straight answers to hard questions |
| 10 Built on research | Link to the foundations page |

**`foundations.html` — the evidence**: the proposal in the authors' words, a lineage of proposals (Viner 1950 → CFR 2005 → Noyola & Serra 2025), the evidence behind every claim, data and methods, and a full bibliography.

## Tech

Plain HTML, CSS and vanilla JavaScript. No build step. Fonts: Archivo, Public Sans, IBM Plex Mono (Google Fonts).

```
index.html, foundations.html
assets/css/styles.css
assets/js/data.js     # generated: map geometry + UN population data (see tools/)
assets/js/i18n.js     # Spanish translations (English lives in the HTML)
assets/js/main.js     # map animation, tariff schedule, charts, toggles, language switch
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
