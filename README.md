# One North America

A bilingual (English / Spanish) website making the case for a **North American common external tariff**, the step that would turn the USMCA free trade area into a customs union.

The content is based on *A Case for a North American Common Tariff* by Pedro Noyola and Jaime Serra (Wilson Center, Mexico Institute, 2025) and related writing by the authors. Every figure on the site is attributed; see [`SOURCES.md`](SOURCES.md) for a claim-by-claim source sheet.

## What's on the page

| Section | Purpose |
|---|---|
| Hero | Scroll-driven illustration: three tariff schedules converge into one |
| Thesis | The proposal in the authors' words |
| 01 · Stakes | Key figures and a U.S. trade-by-partner chart |
| 02 · Why | How a free trade area creates rules of origin and border friction; the 2025 paradox |
| 03 · Follow a part | Interactive toggle: a component's journey under today's FTA vs. a customs union |
| 04 · Proposal | Nine design principles from the paper |
| 05 · Ladder | The continuum of integration, and what is *not* proposed |
| 06 · Vision | What a united North America makes possible |
| 07 · Precedents | Customs unions that already work |
| 08 · Timeline | 1965 → 2036, plus the paper's five-stage implementation plan |
| 09 · FAQ | Hard questions, straight answers |
| 10 · Authors / Read | Bios, original sources, share |

## Tech

Plain HTML, CSS and vanilla JavaScript. No build step and no dependencies (fonts load from Google Fonts).

```
index.html            # all English content (source of truth)
assets/css/styles.css
assets/js/i18n.js     # Spanish translations, keyed by data-i18n
assets/js/main.js     # hero animation, reveals, toggle, chart, language switch
assets/img/           # favicon, social share image
```

### Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000  (add ?lang=es for Spanish)
```

### Editing copy

- **English:** edit `index.html` directly.
- **Spanish:** every translatable element has a `data-i18n="key"` attribute; edit the matching key in `assets/js/i18n.js`. Values may contain inline HTML (`<em>`, `<strong>`).
- Language is picked from `?lang=`, then the visitor's saved choice, then the browser language.

### Deploy

- **GitHub Pages:** in the repo's *Settings → Pages*, set *Source* to **GitHub Actions**. `.github/workflows/pages.yml` deploys on every push to `main`.
- **Vercel / Netlify / any static host:** point it at the repo root; no build command.

When a custom domain is set, change `og:image` in `index.html` to an absolute URL so link previews work everywhere.
