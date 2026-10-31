# One North America

A bilingual (English / Spanish) website showing **what a united North America would look like**: Canada, Mexico and the United States as a customs union, with one common tariff at the outer edge, free circulation of goods inside, and one trade policy toward the rest of the world.

The vision is based on Noyola & Serra, *A Case for a North American Common Tariff* (Wilson Center, 2025). The main page presents the logic; authors are credited in source notes and on the foundations page, which holds the academic and data foundations.

## Pages

**`index.html` — the vision**

| Section | What it shows |
|---|---|
| Hero | Plays once on load: "Three tariffs." is struck out and replaced by "One market." while the map's internal borders fade to a single perimeter (with a replay link) |
| The union in one sentence | One large sentence with inline chips (country silhouettes, the perimeter, a truck, a factory, a mini population pyramid, a rising line, a rook): economic gain and competitive weight, in the terms of the 2025 proposal. Each chip reacts on hover, shows the name of the section it stands for, and jumps there on click |
| 01 The union at a glance | Five changes (common tariff, free circulation, shared rules, shared revenue, one trade policy) and what stays national |
| 02 The common tariff | Leads with the clearest case, one Chinese electric car facing three tariffs (102.5% / 106.1% or 6.1% within Canada's quota / 50%), then the tariff book: three labeled bars per product that fold into one common rate when switched to "In the union", and the four rules that set it |
| 03 One perimeter | Ports of entry vs internal crossings. One part travels Asia → Manzanillo → Monterrey → Laredo → Detroit on the map: today it stops at customs in Laredo; in the union it drives through, the internal borders soften and the perimeter carries the weight. A meter (customs stops, certificates, fees) and the step list follow the toggle. Then the rules-of-origin ratchet (1989–2023) and the 2025 stress test |
| 04 Built in North America | The 2015 charts brought up to date (exports, FDI, openness), the 2017→2024 shift in U.S. imports, energy and shipping facts |
| The scrambled egg theorem | Scroll-driven canvas: three eggs (1993) are scrambled into one production system held by supply-chain links (1994–2024); pulling them apart stretches the links, which snap back (2017, 2025); the mix then fills one North American perimeter. Ends with the theorem and its corollary |
| 05 Demographic advantage | Working-age index 2000–2050 (NA vs China, EU, Japan), combined pyramid (2025 / 2050), dependency ratios, median ages |
| 06 Neighbors already | Shared faith, languages and families; managed circular mobility |
| 07 Competing in the world | North America vs EU vs China |
| 08 How we get there | The five stages and the timeline, 1965 → 2027 |
| 09 Questions | Straight answers to hard questions |
| 10 Built on research | Link to the foundations page |

Every section ends its header with a link to its evidence on the foundations page ("The evidence: …"), and each piece of evidence links back.

**`foundations.html` — the evidence**

| Section | What it shows |
|---|---|
| Contents | Counts (claims, questions, figures, sources) and a card for each section |
| 01 The argument | Six numbered steps from a free trade area to a customs union, each linked to its evidence (E1–E10) and to the vision page |
| 02 The proposal | Noyola & Serra (2025) in their own words; author bios |
| 03 Lineage | Viner 1950 → Noyola & Serra 2025, each entry tagged by kind |
| 04 Evidence | Ten claims in the order of the argument (`#ev-…` anchors), each with a key figure, sources tagged Theory / Study / Data / Policy / Proposal, and a link back to the vision page |
| 05 Open questions | Six objections (U.S. tariff control, Mexico's position, trade diversion, revenue, farm goods, Mexico's productivity) and the replies |
| 06 Fact sheet | Every number on the vision page with its value and source; search, section filter, CSV download |
| 07 Data & methods | How each figure was built; links to the scripts on GitHub |
| 08 Bibliography | Sources grouped (proposals, theory, studies, official data and policy) with search, and a copyable citation for the page |

## Tech

Plain HTML, CSS and vanilla JavaScript. No build step. Fonts: Space Grotesk, Inter, JetBrains Mono (Google Fonts), matching julianserra.xyz.

The logo is a monarch butterfly, the one traveler that already crosses all three countries every year. Hovering the footer logo reveals a short note.

**SAI Derecho & Economía.** A quiet "Presented by" signature with the SAI mark sits in the hero, under the buttons, and in both footers; the foundations page carries it as a masthead opposite its kicker, and its "How to cite" text names SAI Derecho & Economía as the author. The mark is inlined once per page as a hidden sprite (source: `assets/img/sai.svg`) and drawn with `<use href="#sai">`: its letters take the text color and its arc is drawn in the monarch orange, warming on hover.

**Phones.** The section links and the language switch live in the menu; wide charts switch to a narrow layout with larger type; no text is set below about 11px; touch screens get "tap" instead of "hover" hints. In the scrambled egg section, upright phones get a full-screen canvas that draws in its upper part while each step arrives as a card sliding over it (phones held sideways keep the side-by-side layout; the query lives in both `styles.css` and `EGG_OVERLAY` in `main.js`). On the perimeter map the toggle sits above the map and minor port labels are hidden.

```
index.html, foundations.html
assets/css/styles.css
assets/js/data.js     # generated: map geometry + UN population data (see tools/)
assets/js/i18n.js     # Spanish translations (English lives in the HTML)
assets/js/main.js     # hero, chips, tariff schedule, charts, scrambled egg canvas, fact sheet, bibliography search, menu, language switch
assets/img/           # favicon, link-preview images (og-*.jpg), SAI mark (sai.svg)
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
- **Fact sheet rows:** `FACTS` in `assets/js/main.js` (labels are i18n keys `fs.f.*`, in both `en` and `es`). Keep it in step with `SOURCES.md`.

### Deploy

- **GitHub Pages:** *Settings → Pages → Source: GitHub Actions*. `.github/workflows/pages.yml` deploys every push to `main`.
- **Vercel / Netlify / any static host:** serve the repo root; no build command.

Link previews (WhatsApp, iMessage, Slack, X) use absolute URLs on **onenorthamerica.org**: `og-home.jpg` for the vision page and `og-foundations.jpg` for the foundations page, 1200×630 JPEGs of about 100 KB (WhatsApp drops preview images over roughly 300 KB). They are rendered from `tools/og.html` by `node tools/build-og.mjs`; if the domain changes, update the `og:`/`twitter:`/canonical URLs in both pages. WhatsApp caches previews per link, so a changed image may take a while to show on links already shared.
