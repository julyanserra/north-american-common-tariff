/* One North America — interactions
   No dependencies. Data comes from data.js (map + UN population figures)
   and the sourced tables below; copy lives in the HTML and i18n.js. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MAP = window.NA_MAP;
  var DEMOG = window.NA_DEMOG;

  var C = { CA: "#9f3960", US: "#248fcc", MX: "#56a76a", NA: "#d9731c", GRAY: "#8a8378", GRAY2: "#b5ada0" };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function txt(parent, x, y, s, attrs) {
    var a = { x: x, y: y };
    for (var k in attrs) a[k] = attrs[k];
    var n = el("text", a, parent);
    n.textContent = s;
    return n;
  }
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function mix(c1, c2, k) {
    return "rgb(" + Math.round(lerp(c1[0], c2[0], k)) + "," + Math.round(lerp(c1[1], c2[1], k)) + "," + Math.round(lerp(c1[2], c2[2], k)) + ")";
  }
  function fmt(n, d) { return n.toLocaleString(current === "es" ? "es-MX" : "en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  // Smooth path through points (Catmull-Rom → cubic Bézier).
  /* ───────────────────────── i18n ───────────────────────── */
  var DICT = window.I18N || {};
  var current = "en";
  var originals = new Map();
  $$("[data-i18n],[data-i18n-html]").forEach(function (n) { originals.set(n, n.innerHTML); });
  var metaDesc = $('meta[name="description"]');
  var originalMeta = { title: document.title, desc: metaDesc ? metaDesc.content : "" };
  var pageKey = doc.getAttribute("data-page") || "home";
  var langListeners = [];

  function t(key) {
    var d = DICT[current];
    return (d && d[key]) || (DICT.en && DICT.en[key]) || "";
  }

  function setLang(lang) {
    current = lang === "es" ? "es" : "en";
    var dict = DICT[current] || {};
    originals.forEach(function (html, n) {
      var key = n.getAttribute("data-i18n") || n.getAttribute("data-i18n-html");
      n.innerHTML = current === "en" || !dict[key] ? html : dict[key];
    });
    doc.lang = current;
    document.title = current === "en" ? originalMeta.title : dict["meta.title." + pageKey] || originalMeta.title;
    if (metaDesc) metaDesc.content = current === "en" ? originalMeta.desc : dict["meta.desc." + pageKey] || originalMeta.desc;
    $$(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === current)); });
    try { localStorage.setItem("ona-lang", current); } catch (e) { /* storage unavailable */ }
    var url = new URL(window.location.href);
    if (current === "es") url.searchParams.set("lang", "es"); else url.searchParams.delete("lang");
    history.replaceState(null, "", url);
    // Keep cross-page links in the chosen language.
    $$('a[href*=".html"]').forEach(function (a) {
      var u = new URL(a.getAttribute("href"), window.location.href);
      if (current === "es") u.searchParams.set("lang", "es"); else u.searchParams.delete("lang");
      a.setAttribute("href", u.pathname.split("/").pop() + u.search + u.hash);
    });
    langListeners.forEach(function (fn) { fn(); });
  }
  $$(".lang button").forEach(function (b) { b.addEventListener("click", function () { setLang(b.dataset.lang); }); });

  /* ───────────────────────── Hero: three tariffs → one market, played on load ───────────────────────── */
  var hero = $(".hero");
  var heroSvg = $("#hero-map");
  var RGB = { CA: [159, 57, 96], US: [36, 143, 204], MX: [86, 167, 106] };
  var UNIFIED = [234, 229, 218];
  var INK = [20, 19, 17];
  var SIGNAL = [240, 138, 36];
  var heroParts = null;

  function buildHeroMap() {
    if (!heroSvg || !MAP) return;
    heroSvg.setAttribute("viewBox", MAP.viewBox);
    el("path", { d: MAP.context, fill: "#221f1b" }, heroSvg);
    var countries = {};
    ["CA", "US", "MX"].forEach(function (k) { countries[k] = el("path", { d: MAP[k], "stroke-linejoin": "round" }, heroSvg); });
    var mask = el("path", { d: MAP.borders, fill: "none", "stroke-linecap": "round", stroke: mix(UNIFIED, UNIFIED, 1) }, heroSvg);
    var borders = el("path", { d: MAP.borders, fill: "none", stroke: "#ffffff", "stroke-width": 2, "stroke-linecap": "round" }, heroSvg);
    var labels = {};
    ["CA", "US", "MX"].forEach(function (k) {
      var p = MAP.labels[k];
      labels[k] = el("text", { x: p[0], y: p[1], "text-anchor": "middle", "class": "map-label" }, heroSvg);
    });
    var c = MAP.labels.US;
    var na = el("text", { x: c[0], y: c[1] - 40, "text-anchor": "middle", "class": "map-label na" }, heroSvg);
    heroParts = { countries: countries, mask: mask, borders: borders, labels: labels, na: na };
    labelHeroMap();
  }
  function labelHeroMap() {
    if (!heroParts) return;
    heroParts.labels.CA.textContent = "Canada";
    heroParts.labels.US.textContent = t("map.us");
    heroParts.labels.MX.textContent = t("map.mx");
    heroParts.na.textContent = t("map.na");
  }
  langListeners.push(labelHeroMap);

  var heroK = -1;
  function renderHero(k) {
    if (!heroParts || Math.abs(k - heroK) < 0.001) return;
    heroK = k;
    var e = ease(k);
    var width = lerp(0.6, 2.4, e);
    ["CA", "US", "MX"].forEach(function (key) {
      var p = heroParts.countries[key];
      p.setAttribute("fill", mix(RGB[key], UNIFIED, e));
      p.setAttribute("stroke", mix(INK, SIGNAL, e));
      p.setAttribute("stroke-width", width.toFixed(2));
    });
    // Cover the internal edges once the fills have merged, so only the perimeter stays lit.
    heroParts.mask.setAttribute("stroke-width", (width * 2 + 1.5).toFixed(2));
    heroParts.mask.setAttribute("opacity", Math.pow(e, 4).toFixed(3));
    heroParts.borders.setAttribute("opacity", (1 - e).toFixed(3));
    heroParts.borders.setAttribute("stroke-dasharray", e > 0.02 ? (6 * (1 - e) + 0.5).toFixed(2) + " " + (10 * e).toFixed(2) : "0");
    var lab = clamp(1 - e * 1.8);
    ["CA", "US", "MX"].forEach(function (key) { heroParts.labels[key].setAttribute("opacity", lab.toFixed(3)); });
    heroParts.na.setAttribute("opacity", clamp((k - 0.55) * 3).toFixed(3));
    if (hero) {
      hero.classList.toggle("struck", k > 0.18);
      hero.classList.toggle("converged", k > 0.6);
    }
  }
  var heroRun = 0;
  function playHero() {
    if (!heroParts) return;
    if (reduceMotion) { renderHero(1); return; }
    var run = ++heroRun, start = null, delay = 1000, dur = 2600;
    heroK = -1; renderHero(0);
    requestAnimationFrame(function step(now) {
      if (run !== heroRun) return;
      if (start === null) start = now;
      var k = clamp((now - start - delay) / dur);
      renderHero(k);
      if (k < 1) requestAnimationFrame(step);
    });
  }
  var heroReplay = $("#hero-replay");
  if (heroReplay) heroReplay.addEventListener("click", function () { playHero(); });

  /* ───────────────────────── The union in one sentence: inline chips ───────────────────────── */
  // Square viewBoxes around each silhouette (the U.S. one frames the lower 48).
  var CHIP_VB = { CA: "277 -71 650 650", US: "311 284 520 520", MX: "361 547 350 350", NA: "60 -10 880 880" };
  function pyramidIcon() {
    var rows = [10, 18, 25, 31, 35, 38], out = "";
    rows.forEach(function (w, i) {
      var y = 9 + i * 5.2, half = w / 2, x = 24;
      [[0.55, C.US], [0.12, C.CA], [0.33, C.MX]].forEach(function (seg) {
        var sw = half * seg[0];
        out += '<rect x="' + (x - sw).toFixed(2) + '" y="' + y + '" width="' + sw.toFixed(2) + '" height="4.2" fill="' + seg[1] + '"/>' +
               '<rect x="' + (48 - x).toFixed(2) + '" y="' + y + '" width="' + sw.toFixed(2) + '" height="4.2" fill="' + seg[1] + '"/>';
        x -= sw;
      });
    });
    return '<svg viewBox="4 6 40 38">' + out + "</svg>";
  }
  var CHIP_ICON = {
    truck: '<svg viewBox="0 0 48 48" class="line"><path d="M4 30h28V14H4zM32 20h7l5 6v4H32z"/><circle cx="12" cy="34" r="4"/><circle cx="36" cy="34" r="4"/></svg>',
    factory: '<svg viewBox="0 0 48 48" class="line"><path d="M6 40V21l9 6v-6l9 6v-6l9 6V8h8v32zM4 40h40"/></svg>',
    growth: '<svg viewBox="0 0 48 48" class="line"><path d="M6 37l11-11 8 7 15-16M31 17h9v9"/></svg>',
    rook: '<svg viewBox="0 0 48 48"><path d="M13 42h22v-5H13zM17.5 35h13l-1.8-13h-9.4zM15 20h18V10h-4.4v4.4h-3.4V10h-2.4v4.4h-3.4V10H15z"/></svg>'
  };
  function buildChips() {
    var chips = $$(".chip[data-chip]");
    var revealed = !!$(".statement-text.in");
    chips.forEach(function (c, i) {
      c.style.transitionDelay = revealed ? "" : (0.15 + i * 0.09).toFixed(2) + "s";
      c.setAttribute("aria-label", chipLabel(c));
      if (c.firstChild) return;
      var k = c.dataset.chip;
      c.classList.add("chip-" + k.toLowerCase());
      if (CHIP_VB[k]) {
        if (!MAP) return;
        c.innerHTML = '<svg viewBox="' + CHIP_VB[k] + '">' + (k === "NA" ? ["CA", "US", "MX"] : [k]).map(function (p) { return '<path d="' + MAP[p] + '"/>'; }).join("") + "</svg>";
      } else if (k === "pyramid") c.innerHTML = pyramidIcon();
      else c.innerHTML = CHIP_ICON[k] || "";
    });
  }
  langListeners.push(buildChips);
  // Each chip links to the part of the page it stands for; its label is that part's kicker.
  function chipLabel(c) {
    var target = $(c.getAttribute("href") || "");
    if (!target) return "";
    var k = $(".kicker", target) || $("h3", target);
    return k ? k.textContent.trim() : "";
  }
  var chipTip = null;
  function showChipTip(c) {
    var host = c.closest(".wrap");
    if (!host) return;
    if (!chipTip) {
      chipTip = document.createElement("span");
      chipTip.className = "chip-tip mono";
      chipTip.setAttribute("aria-hidden", "true");
    }
    if (chipTip.parentNode !== host) host.appendChild(chipTip);
    chipTip.textContent = chipLabel(c) + " →";
    var r = c.getBoundingClientRect(), h = host.getBoundingClientRect();
    chipTip.style.left = (r.left + r.width / 2 - h.left) + "px";
    chipTip.style.top = (r.top - h.top) + "px";
    chipTip.classList.add("on");
  }
  function hideChipTip() { if (chipTip) chipTip.classList.remove("on"); }
  var statementText = $(".statement-text");
  if (statementText) {
    ["mouseover", "focusin"].forEach(function (ev) {
      statementText.addEventListener(ev, function (e) { var c = e.target.closest(".chip"); if (c) showChipTip(c); });
    });
    ["mouseout", "focusout"].forEach(function (ev) {
      statementText.addEventListener(ev, function (e) { if (e.target.closest(".chip") && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".chip") === e.target.closest(".chip"))) hideChipTip(); });
    });
    window.addEventListener("scroll", hideChipTip, { passive: true });
  }

  /* ───────────────────────── Perimeter map ───────────────────────── */
  function buildPerimeterMap() {
    var svg = $("#per-map");
    if (!svg || !MAP) return;
    svg.setAttribute("viewBox", MAP.viewBox);
    el("path", { d: MAP.context, fill: "#e3ddd0" }, svg);
    ["CA", "US", "MX"].forEach(function (k) {
      el("path", { d: MAP[k], fill: "#fbfaf6", stroke: "#a84b0a", "stroke-width": 1.6, "stroke-linejoin": "round" }, svg);
    });
    el("path", { d: MAP.borders, fill: "none", stroke: "#fbfaf6", "stroke-width": 4 }, svg);
    el("path", { d: MAP.borders, fill: "none", stroke: "#9a948a", "stroke-width": 1.2, "stroke-dasharray": "4 5" }, svg);
    var P = MAP.ports;
    [["vancouver", "Vancouver", -16, -6, "end"], ["la", "Los Angeles", -16, 7, "end"], ["houston", "Houston", 14, 26, "start"],
     ["savannah", "Savannah", 16, 7, "start"], ["ny", "New York", 16, 12, "start"], ["halifax", "Halifax", 16, 7, "start"],
     ["manzanillo", "Manzanillo", -16, 7, "end"], ["veracruz", "Veracruz", 16, 7, "start"]].forEach(function (p) {
      var xy = P[p[0]];
      el("circle", { cx: xy[0], cy: xy[1], r: 15, fill: "rgba(168,75,10,0.16)" }, svg);
      el("circle", { cx: xy[0], cy: xy[1], r: 7, fill: "#a84b0a" }, svg);
      txt(svg, xy[0] + p[2], xy[1] + p[3], p[1], { "text-anchor": p[4], "class": "port-label" });
    });
    [["laredo", "Laredo", -16, 2, "end"], ["detroit", "Detroit", -14, -12, "end"]].forEach(function (p) {
      var xy = P[p[0]];
      el("circle", { cx: xy[0], cy: xy[1], r: 8, fill: "#f2efe8", stroke: "#191714", "stroke-width": 3 }, svg);
      txt(svg, xy[0] + p[2], xy[1] + p[3], p[1], { "text-anchor": p[4], "class": "port-label" });
    });
  }

  /* ───────────────────────── Common tariff schedule ───────────────────────── */
  // MFN rates for imports from countries without a trade agreement (see SOURCES.md).
  var SCHEDULE = [
    { key: "laptops", hs: "8471.30", ca: 0, us: 0, mx: 0, na: 0, rule: "A" },
    { key: "phones", hs: "8517.13", ca: 0, us: 0, mx: 0, na: 0, rule: "A" },
    { key: "tshirts", hs: "6109.10", ca: 18, us: 16.5, mx: 35, na: 16.5, rule: "B" },
    { key: "cars", hs: "8703", ca: 6.1, us: 2.5, mx: 50, na: null, rule: "C" },
    { key: "trucks", hs: "8704", ca: 6.1, us: 25, mx: 50, na: null, rule: "C" },
    { key: "avg", hs: "", ca: 3.8, us: 3.4, mx: 11.1, na: null, rule: "X", avg: true }
  ];
  var SCALE_MAX = 50;
  function pct(v) { return (v === Math.round(v) ? v : v.toFixed(1)) + "%"; }

  function buildSchedule() {
    var host = $("#schedule-rows");
    if (!host) return;
    host.innerHTML = "";
    SCHEDULE.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "sch-row" + (r.avg ? " avg" : "");
      var naCell = r.na === null
        ? '<span class="sch-na">' + t(r.avg ? "sch.lower" : "sch.calibrated") + "<small>" + t(r.avg ? "sch.lower.s" : "sch.calibrated.s") + "</small></span>"
        : '<span class="sch-na">' + pct(r.na) + "</span>";
      row.innerHTML =
        '<span class="sch-prod"><b>' + t("sch.p." + r.key) + "</b>" + (r.hs ? "<span>HS " + r.hs + "</span>" : "<span>" + t("sch.avg.s") + "</span>") + "</span>" +
        '<span class="sch-rate c-ca" data-c="CA">' + pct(r.ca) + "</span>" +
        '<span class="sch-rate c-us" data-c="US">' + pct(r.us) + "</span>" +
        '<span class="sch-rate c-mx" data-c="MX">' + pct(r.mx) + "</span>" +
        naCell +
        '<span class="strip" aria-hidden="true"><span class="strip-axis"></span><span class="strip-range"></span>' +
          '<span class="strip-dot ca"></span><span class="strip-dot us"></span><span class="strip-dot mx"></span>' +
          (r.na !== null ? '<span class="strip-ring"></span>' : "") +
          '<span class="strip-tick" style="left:0">0%</span><span class="strip-tick" style="left:100%">50%</span>' +
        "</span>" +
        '<span class="sch-rule"><b>' + t("sch.rule." + r.rule + ".t") + "</b> " + t("sch.rule." + r.rule) + "</span>";
      host.appendChild(row);
      placeStrip(row, r, false);
    });
    var sched = $(".schedule");
    if (sched && sched.classList.contains("in")) $$(".sch-row", host).forEach(function (row, i) { placeStrip(row, SCHEDULE[i], true); });
  }
  function placeStrip(row, r, final) {
    var x = function (v) { return (v / SCALE_MAX * 100).toFixed(2) + "%"; };
    var lo = Math.min(r.ca, r.us, r.mx), hi = Math.max(r.ca, r.us, r.mx);
    var range = $(".strip-range", row);
    range.style.left = x(lo); range.style.width = ((hi - lo) / SCALE_MAX * 100).toFixed(2) + "%";
    $(".strip-dot.ca", row).style.left = x(r.ca);
    $(".strip-dot.us", row).style.left = x(r.us);
    $(".strip-dot.mx", row).style.left = x(r.mx);
    var ring = $(".strip-ring", row);
    if (ring) { ring.style.left = final ? x(r.na) : x(hi); ring.style.opacity = final ? 1 : 0; }
  }
  langListeners.push(buildSchedule);

  /* ───────────────────────── EV tariffs: three policies toward China ───────────────────────── */
  var EV = [["ev.us", "", 102.5, C.US], ["ev.ca1", "ev.ca1s", 106.1, C.CA], ["ev.ca2", "ev.ca2s", 6.1, C.CA], ["ev.mx", "", 50, C.MX]];
  function buildEV() {
    var host = $("#ev-bars");
    if (!host) return;
    host.innerHTML = EV.map(function (r) {
      return '<div class="hbar"><span class="hbar-name">' + t(r[0]) + (r[1] ? "<small>" + t(r[1]) + "</small>" : "") + '</span>' +
        '<span class="hbar-track"><span class="hbar-fill" style="background:' + r[3] + '" data-w="' + (r[2] / 110 * 100).toFixed(1) + '%"></span></span>' +
        '<span class="hbar-val">' + fmt(r[2], r[2] % 1 ? 1 : 0) + "%</span></div>";
    }).join("");
    if (host.closest(".in")) growFills(host);
  }
  function growFills(root) { $$("[data-w]", root).forEach(function (n) { n.style.width = n.dataset.w; }); }
  langListeners.push(buildEV);

  /* ───────────────────────── Rules of origin: the ratchet ───────────────────────── */
  // Phones get a narrower viewBox with larger type instead of a shrunken desktop chart.
  function isNarrow(svg) { var w = svg.parentNode.clientWidth; return w > 0 && w < 540; }

  function buildROO() {
    var svg = $("#roo-chart");
    if (!svg) return;
    svg.innerHTML = "";
    var nr = isNarrow(svg);
    svg.setAttribute("class", "svgc" + (nr ? " narrow" : ""));
    svg.setAttribute("viewBox", nr ? "0 0 400 300" : "0 0 560 300");
    var x0 = nr ? 40 : 48, x1 = nr ? 318 : 470, y0 = 260, y1 = 30, Y0 = 1988, Y1 = 2026;
    var X = function (y) { return x0 + (y - Y0) / (Y1 - Y0) * (x1 - x0); };
    var Yv = function (v) { return y0 - v / 80 * (y0 - y1); };
    [0, 20, 40, 60, 80].forEach(function (v) {
      el("line", { x1: x0, x2: x1, y1: Yv(v), y2: Yv(v), "class": "grid" }, svg);
      txt(svg, x0 - 8, Yv(v) + 4, v + "%", { "text-anchor": "end" });
    });
    [1990, 2000, 2010, 2020].forEach(function (y) { txt(svg, X(y), y0 + 20, String(y), { "text-anchor": "middle" }); });
    var solid = [[1989, 50], [1994, 50]], steps = [[2002, 62.5], [2020, 62.5], [2020, 66], [2021, 66], [2021, 69], [2022, 69], [2022, 72], [2023, 72], [2023, 75], [2026, 75]];
    var d1 = "M" + X(1989) + "," + Yv(50) + " H" + X(1994);
    el("path", { d: d1, fill: "none", stroke: "#a84b0a", "stroke-width": 3 }, svg);
    el("path", { d: "M" + X(1994) + "," + Yv(50) + " L" + X(2002) + "," + Yv(62.5), fill: "none", stroke: "#a84b0a", "stroke-width": 2, "stroke-dasharray": "4 4" }, svg);
    el("path", { d: "M" + steps.map(function (p) { return X(p[0]) + "," + Yv(p[1]); }).join(" L"), fill: "none", stroke: "#a84b0a", "stroke-width": 3, "stroke-linejoin": "round" }, svg);
    [[1989, 50, "50%", t("roo.cusfta"), "start"], [2002, 62.5, "62.5%", t("roo.nafta"), "middle"], [2023, 75, "75%", t("roo.usmca"), "end"]].forEach(function (p) {
      el("circle", { cx: X(p[0]), cy: Yv(p[1]), r: 5, fill: "#a84b0a" }, svg);
      var below = p[4] === "start", lx = X(p[0]) + (below ? -4 : 0);
      txt(svg, lx, Yv(p[1]) + (below ? 24 : -26) + (nr && below ? 2 : 0), p[2], { "text-anchor": p[4], "class": "lbl" });
      txt(svg, lx, Yv(p[1]) + (below ? 38 : -12) + (nr && below ? 4 : 0), p[3], { "text-anchor": p[4] });
    });
    // The union: no internal origin rule at all.
    el("line", { x1: x1 + 26, x2: x1 + 26, y1: Yv(75), y2: Yv(0) - 8, stroke: "#d9731c", "stroke-width": 1.5, "stroke-dasharray": "3 4", "marker-end": "" }, svg);
    el("circle", { cx: x1 + 26, cy: Yv(0), r: 7, fill: "#d9731c" }, svg);
    txt(svg, x1 + 14, Yv(0) - (nr ? 34 : 30), t("roo.cu1"), { "text-anchor": "end", "class": "acc" });
    txt(svg, x1 + 14, Yv(0) - 16, t("roo.cu2"), { "text-anchor": "end", "class": "acc" });
    if (nr) {
      var qp = t("roo.quote").split(" — ");
      txt(svg, (x0 + x1) / 2, Yv(28), qp[0], { "text-anchor": "middle", "class": "lbl" });
      if (qp[1]) txt(svg, (x0 + x1) / 2, Yv(28) + 20, "— " + qp[1], { "text-anchor": "middle" });
    } else {
      txt(svg, X(2008), Yv(24), t("roo.quote"), { "text-anchor": "middle", "class": "lbl" });
    }
  }
  langListeners.push(buildROO);

  /* ───────────────────────── Dumbbells (utilization, dependency) ───────────────────────── */
  function dumbbells(host, rows, lo, hi, fmtv) {
    if (!host) return;
    host.innerHTML = rows.map(function (r) {
      var a = (r.from - lo) / (hi - lo) * 100, b = (r.to - lo) / (hi - lo) * 100;
      return '<div class="db" style="color:' + r.color + '"><span class="db-name" style="color:inherit">' + r.name + '</span><span class="db-track">' +
        '<span class="db-axis"></span>' +
        (r.from !== null ? '<span class="db-line" data-l="' + Math.min(a, b) + '" data-w="' + Math.abs(b - a) + '" style="left:' + a + '%;width:0"></span>' +
        '<span class="db-dot from" style="left:' + a + '%"></span><span class="db-lab from" style="left:' + a + '%">' + (r.fromLabel || fmtv(r.from)) + "</span>" : "") +
        '<span class="db-dot to" data-l="' + b + '" style="left:' + (r.from !== null ? a : b) + '%"></span><span class="db-lab to" style="left:' + b + '%">' + (r.toLabel || fmtv(r.to)) + "</span>" +
        "</span></div>";
    }).join("");
    if (host.closest(".in")) growDumbbells(host);
  }
  function growDumbbells(host) {
    $$(".db-line", host).forEach(function (n) { n.style.left = n.dataset.l + "%"; n.style.width = n.dataset.w + "%"; });
    $$(".db-dot.to", host).forEach(function (n) { n.style.left = n.dataset.l + "%"; });
  }
  function buildUtilization() {
    dumbbells($("#ut-chart"), [
      { name: t("map.mx"), from: 50, to: 80, color: C.MX, fromLabel: "≈50%", toLabel: "≈80%" },
      { name: "Canada", from: 38, to: 80, color: C.CA, fromLabel: "<40%", toLabel: "≈80%" },
      { name: t("ut.veh"), from: null, to: 94.7, color: "#a84b0a", toLabel: "94.7%" }
    ], 0, 100, function (v) { return v + "%"; });
  }
  langListeners.push(buildUtilization);
  function buildDependency() {
    if (!DEMOG) return;
    var dep = function (y, k) { var w = DEMOG[y][k].wa; return (100 - w) / w; };
    dumbbells($("#dep-chart"), [
      { name: t("map.mx"), from: dep("2025", "MX"), to: dep("2050", "MX"), color: C.MX },
      { name: t("map.us"), from: dep("2025", "US"), to: dep("2050", "US"), color: C.US },
      { name: "Canada", from: dep("2025", "CA"), to: dep("2050", "CA"), color: C.CA },
      { name: t("map.na"), from: dep("2025", "NA"), to: dep("2050", "NA"), color: "#a84b0a" },
      { name: "China", from: dep("2025", "CN"), to: dep("2050", "CN"), color: "#6f6a61" }
    ], 0.35, 0.75, function (v) { return fmt(v, 2); });
  }
  langListeners.push(buildDependency);

  /* ───────────────────────── Then and now: step bars ───────────────────────── */
  function growSteps(root) {
    $$(".steps", root).forEach(function (s) {
      var max = parseFloat(s.dataset.max);
      $$(".step", s).forEach(function (st) { $(".step-bar", st).style.height = (parseFloat(st.dataset.v) / max * 72).toFixed(1) + "%"; });
    });
  }

  /* ───────────────────────── Slope: the great rerouting ───────────────────────── */
  var SLOPE = [["China", 505.6, 438.9, C.GRAY2], ["MX", 314, 505.9, C.MX], ["Canada", 300, 412.7, C.CA]];
  function buildSlope() {
    var svg = $("#slope");
    if (!svg) return;
    svg.innerHTML = "";
    var nr = isNarrow(svg);
    svg.setAttribute("class", "svgc" + (nr ? " narrow" : ""));
    svg.setAttribute("viewBox", nr ? "0 0 452 340" : "0 0 640 340");
    var xl = nr ? 128 : 170, xr = nr ? 280 : 470, top = 40, bot = 300, lo = 280, hi = 530, gap = nr ? " " : "  ";
    var Y = function (v) { return bot - (v - lo) / (hi - lo) * (bot - top); };
    txt(svg, xl, 18, "2017", { "text-anchor": "middle", "class": "lbl" });
    txt(svg, xr, 18, "2024", { "text-anchor": "middle", "class": "lbl" });
    el("line", { x1: xl, x2: xl, y1: top, y2: bot, "class": "grid" }, svg);
    el("line", { x1: xr, x2: xr, y1: top, y2: bot, "class": "grid" }, svg);
    SLOPE.forEach(function (s) {
      var name = s[0] === "MX" ? t("map.mx") : s[0];
      var line = el("line", { x1: xl, y1: Y(s[1]), x2: xl, y2: Y(s[1]), stroke: s[3], "stroke-width": s[0] === "China" ? 3 : 4, "stroke-linecap": "round", "class": "slope-line" }, svg);
      line.dataset.x2 = xr; line.dataset.y2 = Y(s[2]);
      el("circle", { cx: xl, cy: Y(s[1]), r: 6, fill: s[3] }, svg);
      var end = el("circle", { cx: xr, cy: Y(s[2]), r: 6, fill: s[3], opacity: 0, "class": "slope-end" }, svg);
      var dy = s[0] === "MX" ? -6 : (s[0] === "Canada" ? 12 : 4);
      txt(svg, xl - 12, Y(s[1]) + dy, name + gap + "$" + fmt(s[1]) + "B", { "text-anchor": "end", "class": "lbl" });
      var lbl = txt(svg, xr + 12, Y(s[2]) + 4, "$" + fmt(s[2]) + "B" + gap + name + gap + (s[2] > s[1] ? "+" : "−") + Math.abs(Math.round((s[2] / s[1] - 1) * 100)) + "%", { "class": "lbl slope-end", opacity: 0 });
      if (s[0] !== "China") lbl.setAttribute("style", "fill:" + s[3]);
    });
    if (svg.closest(".in")) growSlope();
  }
  function growSlope() {
    $$("#slope .slope-line").forEach(function (l) {
      if (reduceMotion) { l.setAttribute("x2", l.dataset.x2); l.setAttribute("y2", l.dataset.y2); return; }
      var x1 = +l.getAttribute("x1"), y1 = +l.getAttribute("y1"), x2 = +l.dataset.x2, y2 = +l.dataset.y2, t0 = performance.now();
      (function step(now) {
        var k = ease(clamp((now - t0) / 1100));
        l.setAttribute("x2", lerp(x1, x2, k)); l.setAttribute("y2", lerp(y1, y2, k));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
    setTimeout(function () { $$("#slope .slope-end").forEach(function (n) { n.setAttribute("opacity", 1); }); }, reduceMotion ? 0 : 1000);
  }
  langListeners.push(buildSlope);

  /* ───────────────────────── Working-age index, 2000–2050 ───────────────────────── */
  var WA_SERIES = [["NA", "#d9731c", 4], ["CN", "#191714", 2.5], ["EU", "#8a8378", 2.5], ["JP", "#b5ada0", 2.5]];
  function buildWALine() {
    var svg = $("#wa-line");
    if (!svg || !DEMOG || !DEMOG.waIndex) return;
    svg.innerHTML = "";
    var nr = isNarrow(svg), VW = nr ? 440 : 720;
    svg.setAttribute("class", "svgc" + (nr ? " narrow" : ""));
    svg.setAttribute("viewBox", "0 0 " + VW + " 360");
    var x0 = nr ? 36 : 44, x1 = nr ? 280 : 572, y0 = 330, y1 = 20, lo = 55, hi = 140;
    var X = function (y) { return x0 + (y - 2000) / 50 * (x1 - x0); };
    var Y = function (v) { return y0 - (v - lo) / (hi - lo) * (y0 - y1); };
    [60, 80, 100, 120, 140].forEach(function (v) {
      el("line", { x1: x0, x2: x1, y1: Y(v), y2: Y(v), "class": "grid" }, svg);
      txt(svg, x0 - 8, Y(v) + 4, String(v), { "text-anchor": "end" });
    });
    (nr ? [2000, 2025, 2050] : [2000, 2010, 2020, 2030, 2040, 2050]).forEach(function (y) { txt(svg, X(y), y0 + 20, String(y), { "text-anchor": "middle" }); });
    el("rect", { x: X(2024), y: y1, width: x1 - X(2024), height: y0 - y1, fill: "rgba(25,23,20,0.035)" }, svg);
    txt(svg, X(2024) + 8, nr ? y0 - 10 : y1 + 16, t(nr ? "wal.projS" : "wal.proj"), {});
    WA_SERIES.slice().reverse().forEach(function (s) {
      var data = DEMOG.waIndex[s[0]];
      var d = "";
      for (var y = 2000; y <= 2050; y++) d += (y === 2000 ? "M" : " L") + X(y).toFixed(1) + "," + Y(data[y]).toFixed(1);
      var p = el("path", { d: d, fill: "none", stroke: s[1], "stroke-width": s[2], "stroke-linejoin": "round", "stroke-linecap": "round", "class": "wa-path" }, svg);
      var end = data[2050];
      var nudge = { CN: -6, EU: 12 }[s[0]] || 4;
      // Short names where the full one would not fit beside the plot.
      var nm = t("wa." + s[0]);
      if (s[0] === "EU" || (s[0] === "NA" && (nr || nm.length > 13))) nm = t("wa." + s[0] + "s");
      txt(svg, x1 + 10, Y(end) + nudge, nm + " " + Math.round(end), { "class": "lbl", style: "fill:" + s[1] });
    });
    // China's peak, as Serra Puche anticipated.
    var cp = DEMOG.waIndex.CN[2014];
    // Label sits in the empty upper-left corner, with a leader down to the peak.
    var py = Y(nr ? 137 : 131);
    el("line", { x1: X(2014), x2: X(2014), y1: py + 8, y2: Y(cp) - 8, stroke: "#191714", "stroke-width": 1 }, svg);
    el("circle", { cx: X(2014), cy: Y(cp), r: 6, fill: "#191714" }, svg);
    txt(svg, x0 + 8, py, t("wal.peak"), { "class": "lbl" });
    // Hover crosshair
    var cross = el("line", { x1: 0, x2: 0, y1: y1, y2: y0, stroke: "#6f6a61", "stroke-dasharray": "3 3", opacity: 0 }, svg);
    var hit = el("rect", { x: x0, y: y1, width: x1 - x0, height: y0 - y1, fill: "transparent" }, svg);
    var tip = $("#wal-tip");
    function show(evt) {
      var r = svg.getBoundingClientRect();
      var vx = (evt.clientX - r.left) / r.width * VW;
      var yr = Math.round(2000 + (vx - x0) / (x1 - x0) * 50);
      yr = Math.max(2000, Math.min(2050, yr));
      cross.setAttribute("x1", X(yr)); cross.setAttribute("x2", X(yr)); cross.setAttribute("opacity", 1);
      if (tip) tip.textContent = yr + " · " + WA_SERIES.map(function (s) { return t("wa." + s[0]) + " " + Math.round(DEMOG.waIndex[s[0]][yr]); }).join(" · ");
    }
    hit.addEventListener("mousemove", show);
    hit.addEventListener("click", show);
    hit.addEventListener("mouseleave", function () { cross.setAttribute("opacity", 0); if (tip) tip.textContent = t("wal.hint"); });
    if (tip) tip.textContent = t("wal.hint");
    if (svg.closest(".in")) drawPaths(svg);
  }
  function drawPaths(svg) {
    $$(".wa-path", svg).forEach(function (p) {
      if (reduceMotion) return;
      var L = p.getTotalLength();
      p.style.strokeDasharray = L + " " + L;
      p.style.strokeDashoffset = L;
      p.getBoundingClientRect();
      p.style.transition = "stroke-dashoffset 1.8s cubic-bezier(0.2,0.7,0.1,1)";
      p.style.strokeDashoffset = 0;
    });
  }
  langListeners.push(buildWALine);

  /* ───────────────────────── Demography: pyramid ───────────────────────── */
  var pyrYear = "2025";
  var PYR_ORDER = ["US", "CA", "MX"]; // centre → outside
  function groups(arr) {
    // 21 five-year groups (0–4 … 95–99, 100+) → 18 rows, 85+ collapsed.
    var out = arr.slice(0, 17).map(function (g) { return [g[0], g[1]]; });
    var tail = [0, 0];
    arr.slice(17).forEach(function (g) { tail[0] += g[0]; tail[1] += g[1]; });
    out.push(tail);
    return out;
  }
  function ageLabel(i) { return i === 17 ? "85+" : i * 5 + "–" + (i * 5 + 4); }

  function buildPyramid() {
    var svg = $("#pyramid");
    if (!svg || !DEMOG) return;
    var nr = isNarrow(svg);
    var W = nr ? 400 : 600, rowH = nr ? 22 : 20, top = 8, n = 18, mid = W / 2, gapC = nr ? 28 : 26, H = top + n * rowH + (nr ? 32 : 28);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", nr ? "narrow" : "");
    svg.innerHTML = "";
    var maxSide = 0;
    ["2025", "2050"].forEach(function (y) {
      for (var i = 0; i < n; i++) for (var s = 0; s < 2; s++) {
        var tot = 0;
        ["CA", "US", "MX"].forEach(function (c) { tot += groups(DEMOG[y][c].pyr)[i][s]; });
        maxSide = Math.max(maxSide, tot);
      }
    });
    var scale = (mid - gapC - 24) / maxSide;
    var data = {};
    ["CA", "US", "MX"].forEach(function (c) { data[c] = groups(DEMOG[pyrYear][c].pyr); });
    var tip = $("#pyr-tip");
    for (var m = nr ? 10000 : 5000; m <= maxSide; m += nr ? 10000 : 5000) {
      [mid - gapC - m * scale, mid + gapC + m * scale].forEach(function (gx) {
        el("line", { x1: gx, x2: gx, y1: top, y2: top + n * rowH, "class": "gridl" }, svg);
        txt(svg, gx, top + n * rowH + (nr ? 20 : 16), (m / 1000) + "M", { "text-anchor": "middle" });
      });
    }
    if (nr) {
      // Narrow: name the sides in the empty top corners, away from the tick labels.
      txt(svg, 0, top + 14, t("pyr.men"), { "text-anchor": "start", "class": "axis-label" });
      txt(svg, W, top + 14, t("pyr.women"), { "text-anchor": "end", "class": "axis-label" });
    } else {
      txt(svg, mid - gapC, top + n * rowH + 16, t("pyr.men"), { "text-anchor": "end", "class": "axis-label" });
      txt(svg, mid + gapC, top + n * rowH + 16, t("pyr.women"), { "text-anchor": "start", "class": "axis-label" });
    }

    for (var i = 0; i < n; i++) {
      var y = top + (n - 1 - i) * rowH;
      var hit = el("rect", { x: 0, y: y, width: W, height: rowH, "class": "row-hit" }, svg);
      txt(svg, mid, y + rowH / 2 + (nr ? 5 : 4), ageLabel(i), { "text-anchor": "middle" });
      [0, 1].forEach(function (s) {
        var offset = gapC;
        PYR_ORDER.forEach(function (c) {
          var v = data[c][i][s] * scale;
          if (v <= 0) return;
          var bx = s === 0 ? mid - offset - v : mid + offset;
          el("rect", { x: bx.toFixed(2), y: y + 2, width: Math.max(0, v - 1.5).toFixed(2), height: rowH - 4, fill: C[c] }, svg);
          offset += v;
        });
      });
      (function (i, hit) {
        var show = function () {
          var tot = 0, parts = [];
          ["MX", "US", "CA"].forEach(function (c) {
            var v = data[c][i][0] + data[c][i][1]; tot += v;
            parts.push((c === "CA" ? "Canada" : t("map." + c.toLowerCase())) + " " + fmt(v / 1000, 1) + "M");
          });
          $$(".row-hit", svg).forEach(function (h) { h.classList.remove("on"); });
          hit.classList.add("on");
          if (tip) tip.textContent = t("pyr.ages") + " " + ageLabel(i) + " · " + fmt(tot / 1000, 1) + "M · " + parts.join(" · ");
        };
        hit.addEventListener("mouseenter", show);
        hit.addEventListener("click", show);
      })(i, hit);
    }
    svg.addEventListener("mouseleave", function () {
      $$(".row-hit", svg).forEach(function (h) { h.classList.remove("on"); });
      if (tip) tip.textContent = pyrSummary();
    });
    if (tip) tip.textContent = pyrSummary();
  }
  function pyrSummary() {
    var d = DEMOG[pyrYear].NA;
    return t("pyr.sum").replace("{y}", pyrYear).replace("{p}", Math.round(d.total / 1000)).replace("{m}", fmt(d.median, 1));
  }
  $$(".seg button").forEach(function (b) {
    b.addEventListener("click", function () {
      pyrYear = b.dataset.year;
      $$(".seg button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      buildPyramid();
    });
  });
  langListeners.push(buildPyramid);

  /* ───────────────────────── The scrambled egg theorem ───────────────────────── */
  // One set of dots moves through four states: three eggs (1993), one scramble held
  // together by supply-chain links, a pull back toward the eggs that snaps back, and one
  // perimeter. Everything is seeded, so a resize redraws the same picture.
  var egg = null;
  var EGG_LAYERS = [
    { egg: 1, cloud: 0, link: 0, ghost: 0, map: 0 },
    { egg: 0, cloud: 1, link: 1, ghost: 0, map: 0 },
    { egg: 0, cloud: 1, link: 1, ghost: 1, map: 0 },
    { egg: 0, cloud: 0, link: 0.6, ghost: 0, map: 1 }
  ];
  var EGG_LOOP = 3600; // ms per pull-and-snap cycle
  function seeded(seed) { return function () { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }; }
  function blobR(a, ph) { return 1 + 0.07 * Math.sin(3 * a + ph) + 0.045 * Math.sin(5 * a + 2 * ph) + 0.03 * Math.sin(8 * a + 3 * ph); }
  // 0 at rest → pulled out → trembles → snaps back past the start and settles.
  function pullShape(t) {
    if (t < 0.12) return 0;
    if (t < 0.5) return ease((t - 0.12) / 0.38);
    if (t < 0.6) return 1 + 0.02 * Math.sin((t - 0.5) * 140);
    var u = (t - 0.6) / 0.4;
    return Math.exp(-5 * u) * Math.cos(10 * u);
  }
  // Orders points in horizontal bands, left to right, so two clouds can be paired by rank.
  function bandOrder(xy) {
    var idx = xy.map(function (_, i) { return i; }).sort(function (a, b) { return xy[a][1] - xy[b][1]; });
    var nb = Math.max(1, Math.round(Math.sqrt(xy.length / 1.4))), out = [];
    for (var b = 0; b < nb; b++) {
      var band = idx.slice(Math.round(b * idx.length / nb), Math.round((b + 1) * idx.length / nb));
      band.sort(function (a, c) { return xy[a][0] - xy[c][0]; });
      out = out.concat(band);
    }
    return out;
  }

  function buildEgg() {
    var cv = $("#egg-canvas");
    if (!cv || !MAP || !cv.getContext || !window.Path2D) return;
    var stage = cv.parentNode;
    var N = stage.clientWidth < 520 ? 540 : 960;
    var R = seeded(19941993);
    var parts = [];
    for (var i = 0; i < N; i++) {
      var a = R() * Math.PI * 2, r = blobR(a, 0.7) * Math.sqrt(R());
      parts.push({ k: i % 3, ya: R(), yb: R(), ux: Math.cos(a) * r, uy: Math.sin(a) * r, d: R() * 0.3, amp: 0.7 + R() * 0.14, sw: 0.6 + R() * 0.4, x: 0, y: 0, fx: 0, fy: 0 });
    }
    // Points on land, from a small raster of the three countries (map units).
    var vb = MAP.viewBox.split(" ").map(Number), q = 0.5;
    var probe = document.createElement("canvas");
    probe.width = Math.ceil(vb[2] * q); probe.height = Math.ceil(vb[3] * q);
    var pc = probe.getContext("2d");
    pc.setTransform(q, 0, 0, q, -vb[0] * q, -vb[1] * q);
    var land = ["CA", "US", "MX"].map(function (k) { return new Path2D(MAP[k]); });
    land.forEach(function (l) { pc.fill(l); });
    var px = pc.getImageData(0, 0, probe.width, probe.height).data, pts = [];
    while (pts.length < N) {
      var mx = R() * vb[2], my = R() * vb[3];
      if (px[((my * q | 0) * probe.width + (mx * q | 0)) * 4 + 3] > 128) pts.push([vb[0] + mx, vb[1] + my]);
    }
    // Neighbours in the scramble stay neighbours on the map, so the links stay short.
    var co = bandOrder(parts.map(function (p) { return [p.ux, p.uy]; })), mo = bandOrder(pts);
    co.forEach(function (pi, j) { parts[pi].mx = pts[mo[j]][0]; parts[pi].my = pts[mo[j]][1]; });
    // Supply chains: each dot is tied to its two nearest dots from the other countries.
    var links = [], seen = {};
    parts.forEach(function (p, i) {
      var best = [[Infinity, -1], [Infinity, -1]];
      parts.forEach(function (o, j) {
        if (o.k === p.k) return;
        var dd = (o.ux - p.ux) * (o.ux - p.ux) + (o.uy - p.uy) * (o.uy - p.uy);
        if (dd < best[0][0]) { best[1] = best[0]; best[0] = [dd, j]; } else if (dd < best[1][0]) best[1] = [dd, j];
      });
      best.forEach(function (b) {
        var key = Math.min(i, b[1]) + "-" + Math.max(i, b[1]);
        if (b[1] < 0 || seen[key]) return;
        seen[key] = 1; links.push([i, b[1], 1]);
      });
    });
    egg = {
      cv: cv, ctx: cv.getContext("2d"), stage: stage, parts: parts, links: links, vb: vb,
      land: land, borders: new Path2D(MAP.borders),
      state: 0, swirl: 0, t0: 0, dur: 0, raf: 0, visible: false,
      from: Object.assign({}, EGG_LAYERS[0]), to: EGG_LAYERS[0]
    };
    layoutEgg();
    if ("ResizeObserver" in window) new ResizeObserver(function () { layoutEgg(); drawEgg(performance.now()); }).observe(stage);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { egg.visible = en[0].isIntersecting; if (egg.visible) kickEgg(); }).observe(stage);
    } else egg.visible = true;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawEgg(performance.now()); });
    drawEgg(performance.now());
  }

  function eggTarget(p, s) { return s === 0 ? [p.p0x, p.p0y] : s === 3 ? [p.p3x, p.p3y] : [p.p1x, p.p1y]; }

  function layoutEgg() {
    var e = egg, W = e.stage.clientWidth, H = e.stage.clientHeight;
    if (!W || !H) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    e.cv.width = Math.round(W * dpr); e.cv.height = Math.round(H * dpr);
    e.W = W; e.H = H; e.dpr = dpr; e.rd = W < 520 ? 1.7 : 2.2;
    var Rw = Math.min(W / 6 * 0.84, H * 0.27);
    e.eggs = [0, 1, 2].map(function (i) { return { x: W * (2 * i + 1) / 6, y: H * 0.5, r: Rw, ph: i * 1.9 + 0.4 }; });
    e.cloud = { x: W / 2, y: H * 0.52, r: Math.min(W * 0.42, H * 0.42) };
    var s = Math.min(W * 0.98 / e.vb[2], H * 0.94 / e.vb[3]);
    e.map = { s: s, x: (W - e.vb[2] * s) / 2 - e.vb[0] * s, y: (H - e.vb[3] * s) / 2 - e.vb[1] * s };
    e.parts.forEach(function (p) {
      var g = e.eggs[p.k], a = p.yb * Math.PI * 2, r = g.r * 0.5 * Math.sqrt(p.ya);
      p.p0x = g.x + g.r * 0.06 + Math.cos(a) * r; p.p0y = g.y - g.r * 0.06 + Math.sin(a) * r;
      p.p1x = e.cloud.x + p.ux * e.cloud.r; p.p1y = e.cloud.y + p.uy * e.cloud.r;
      p.p3x = e.map.x + p.mx * s; p.p3y = e.map.y + p.my * s;
      var t0 = eggTarget(p, e.state);
      p.x = p.fx = t0[0]; p.y = p.fy = t0[1];
    });
    e.links.forEach(function (l) {
      var a = e.parts[l[0]], b = e.parts[l[1]];
      l[2] = Math.max(1, Math.hypot(a.p1x - b.p1x, a.p1y - b.p1y));
    });
    // Snap to the current state; a resize mid-transition just finishes it.
    e.dur = 0; e.swirl = 0;
  }

  function eggBlob(ctx, g, scale) {
    ctx.beginPath();
    for (var i = 0; i <= 72; i++) {
      var a = i / 72 * Math.PI * 2, r = g.r * scale * blobR(a, g.ph);
      ctx[i ? "lineTo" : "moveTo"](g.x + Math.cos(a) * r, g.y + Math.sin(a) * r * 0.92);
    }
    ctx.closePath();
  }

  function drawEgg(now) {
    var e = egg;
    if (!e || !e.W) return;
    var ctx = e.ctx, W = e.W, H = e.H, s = e.state;
    ctx.setTransform(e.dpr, 0, 0, e.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var T = e.dur ? clamp((now - e.t0) / e.dur) : 1;
    var LT = ease(clamp(T * 1.6)), L = {};
    for (var key in e.to) L[key] = lerp(e.from[key], e.to[key], LT);

    // Positions. The pull loop starts once the dots have reached the scramble.
    var pull = 0;
    if (s === 2) {
      var tl = now - (e.t0 + e.dur);
      pull = reduceMotion ? 1 : tl < 0 ? 0 : pullShape((tl % EGG_LOOP) / EGG_LOOP);
    }
    var cx = e.cloud.x, cy = e.cloud.y;
    e.parts.forEach(function (p) {
      var tg = eggTarget(p, s), k = ease(clamp((T - p.d) / 0.7));
      var x = lerp(p.fx, tg[0], k), y = lerp(p.fy, tg[1], k);
      if (e.swirl) {
        var ang = e.swirl * p.sw * Math.sin(Math.PI * k), ca = Math.cos(ang), sa = Math.sin(ang);
        var dx = x - cx, dy = y - cy;
        x = cx + dx * ca - dy * sa; y = cy + dx * sa + dy * ca;
      }
      if (pull) { x += (p.p0x - p.p1x) * p.amp * pull; y += (p.p0y - p.p1y) * p.amp * pull; }
      p.x = x; p.y = y;
    });

    // One perimeter: land, an orange outer edge, internal borders dashed.
    if (L.map > 0.01) {
      ctx.save();
      ctx.setTransform(e.dpr * e.map.s, 0, 0, e.dpr * e.map.s, e.dpr * e.map.x, e.dpr * e.map.y);
      ctx.globalAlpha = L.map;
      ctx.fillStyle = "rgba(236,232,223,0.06)";
      e.land.forEach(function (l) { ctx.fill(l); });
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.2 / e.map.s; ctx.strokeStyle = C.NA;
      e.land.forEach(function (l) { ctx.stroke(l); });
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1; ctx.lineWidth = 5.4 / e.map.s;
      ctx.stroke(e.borders);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = L.map;
      ctx.setLineDash([4 / e.map.s, 5 / e.map.s]);
      ctx.lineWidth = 1 / e.map.s; ctx.strokeStyle = "rgba(236,232,223,0.4)";
      ctx.stroke(e.borders);
      ctx.restore();
    }
    // A warm glow under the scramble.
    if (L.cloud > 0.01) {
      var gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, e.cloud.r * 1.35);
      gr.addColorStop(0, "rgba(240,138,36," + (0.11 * L.cloud).toFixed(3) + ")");
      gr.addColorStop(1, "rgba(240,138,36,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
    }
    // Egg whites and yolks; they swell and fade as the shells crack.
    if (L.egg > 0.01) {
      e.eggs.forEach(function (g, i) {
        eggBlob(ctx, g, 1 + 0.18 * (1 - L.egg));
        ctx.fillStyle = "rgba(236,232,223," + (0.92 * L.egg).toFixed(3) + ")";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(g.x + g.r * 0.06, g.y - g.r * 0.06, g.r * 0.53, 0, Math.PI * 2);
        ctx.fillStyle = C[["CA", "US", "MX"][i]];
        ctx.globalAlpha = 0.45 * L.egg; ctx.fill(); ctx.globalAlpha = 1;
      });
    }
    // Where the dots would have to go: the eggs they came from.
    if (L.ghost > 0.01) {
      ctx.save();
      ctx.setLineDash([3, 5]); ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(236,232,223," + (0.3 * L.ghost).toFixed(3) + ")";
      e.eggs.forEach(function (g) { eggBlob(ctx, g, 1); ctx.stroke(); });
      ctx.restore();
    }
    // Supply-chain links: stretched ones turn orange, then red.
    if (L.link > 0.01) {
      var cap = s === 3 ? Math.min(W, H) * 0.09 : Infinity, buckets = [[], [], []];
      e.links.forEach(function (l) {
        var a = e.parts[l[0]], b = e.parts[l[1]];
        var len = Math.hypot(a.x - b.x, a.y - b.y);
        if (len > cap) return;
        var st = len / l[2];
        buckets[s === 2 && st > 3.2 ? 2 : s === 2 && st > 1.7 ? 1 : 0].push(a, b);
      });
      [["rgba(236,232,223,0.17)", 0.8], ["rgba(240,138,36,0.3)", 0.7], ["rgba(229,72,77,0.22)", 0.6]].forEach(function (st, i) {
        var seg = buckets[i];
        if (!seg.length) return;
        ctx.beginPath();
        for (var j = 0; j < seg.length; j += 2) { ctx.moveTo(seg[j].x, seg[j].y); ctx.lineTo(seg[j + 1].x, seg[j + 1].y); }
        ctx.strokeStyle = st[0]; ctx.lineWidth = st[1]; ctx.globalAlpha = L.link;
        ctx.stroke(); ctx.globalAlpha = 1;
      });
    }
    // The dots.
    var rd = e.rd;
    ["CA", "US", "MX"].forEach(function (c, k) {
      ctx.beginPath();
      e.parts.forEach(function (p) { if (p.k === k) { ctx.moveTo(p.x + rd, p.y); ctx.arc(p.x, p.y, rd, 0, Math.PI * 2); } });
      ctx.fillStyle = C[c]; ctx.fill();
    });
    // Country names under the eggs; under the ghosts they sit at the foot of the stage.
    var la = Math.max(L.egg, 0.8 * L.ghost);
    if (la > 0.01) {
      ctx.font = "500 " + (W < 520 ? 11 : 12) + "px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(236,232,223," + la.toFixed(3) + ")";
      [t("wa.CA"), t("map.us"), t("map.mx")].forEach(function (n, i) {
        var g = e.eggs[i];
        ctx.fillText(n.toUpperCase(), g.x, L.ghost > L.egg ? H - 8 : g.y + g.r * 1.2 + 16);
      });
    }
  }

  function eggTick(now) {
    egg.raf = 0;
    drawEgg(now);
    var busy = now < egg.t0 + egg.dur || (egg.state === 2 && !reduceMotion);
    if (busy && egg.visible) egg.raf = requestAnimationFrame(eggTick);
  }
  function kickEgg() { if (egg && !egg.raf) egg.raf = requestAnimationFrame(eggTick); }

  function setEggState(s) {
    var e = egg;
    if (!e || s === e.state) return;
    var now = performance.now();
    var LT = ease(clamp((e.dur ? clamp((now - e.t0) / e.dur) : 1) * 1.6));
    for (var key in e.to) e.from[key] = lerp(e.from[key], e.to[key], LT);
    e.parts.forEach(function (p) { p.fx = p.x; p.fy = p.y; });
    e.swirl = e.state === 0 && s === 1 ? 2.4 : e.state === 1 && s === 0 ? -2.4 : 0;
    e.state = s; e.to = EGG_LAYERS[s];
    e.t0 = now; e.dur = reduceMotion ? 0 : e.swirl ? 2400 : 1500;
    eggReadout(true);
    kickEgg();
    if (reduceMotion) drawEgg(now);
  }

  var eggSteps = $$(".egg-step");
  function eggReadout(swap) {
    var step = eggSteps.filter(function (st) { return +st.dataset.state === (egg ? egg.state : 0); })[0];
    var box = $(".egg-readout");
    if (!box || !step) return;
    $("#egg-year").textContent = $(".step-k", step).textContent;
    $("#egg-state").textContent = t("se.r" + (egg ? egg.state : 0));
    if (swap) { box.classList.remove("swap"); box.getBoundingClientRect(); box.classList.add("swap"); }
  }
  langListeners.push(function () { eggReadout(false); if (egg) drawEgg(performance.now()); });
  // The step whose heading has crossed the trigger line drives the canvas.
  function trackEggSteps() {
    if (!eggSteps.length) return;
    var line = window.innerHeight * (window.innerWidth <= 900 ? 0.8 : 0.62), active = 0;
    eggSteps.forEach(function (st, i) { if ($("h3", st).getBoundingClientRect().top < line) active = i; });
    eggSteps.forEach(function (st, i) { st.classList.toggle("is-active", i === active); });
    setEggState(+eggSteps[active].dataset.state);
  }

  /* ───────────────────────── Foundations: fact sheet ───────────────────────── */
  // Every figure on the vision page: [section, key (label is t("fs.f." + key)), value, source, link].
  // A source given as [en, es] is translated; links point to the primary source where one exists.
  var FS_SECTIONS = { world: "#world", tariff: "#tariff", perimeter: "#perimeter", economy: "#economy", theorem: "#theorem", people: "#demography" };
  var NS_URL = "https://www.wilsoncenter.org/article/case-north-american-common-tariff";
  var FACTS = [
    ["world", "w1", "521M", "UN WPP 2024"],
    ["world", "w2", "≈$33T · ≈$19T · ≈$19T", ["IMF; national accounts", "FMI; cuentas nacionales"]],
    ["world", "w3", "≈30%", ["IMF", "FMI"]],
    ["world", "w4", "37.3 · 45.5 · 41.4", "UN WPP 2024"],
    ["world", "w5", "+5% · −17% · −25%", "UN WPP 2024"],
    ["tariff", "t1", "2,278 (40.6%)", "Noyola & Serra (2025)", NS_URL],
    ["tariff", "t2", "61% · 66%", "Noyola & Serra (2025)", NS_URL],
    ["tariff", "t3", "≈$500B · ≈$400B", "Noyola & Serra (2025)", NS_URL],
    ["tariff", "t4", "30–50%", "Noyola & Serra (2025)", NS_URL],
    ["tariff", "t5", "3.8% · 3.4% · 11.1%", "WTO Tariff & Trade Data"],
    ["tariff", "t6", "102.5% · 106.1% · 6.1% · 50%", ["USTR; Government of Canada; DOF", "USTR; Gobierno de Canadá; DOF"]],
    ["tariff", "t7", "49,000", ["Government of Canada (2026)", "Gobierno de Canadá (2026)"]],
    ["perimeter", "p1", "1–3%", "Noyola & Serra (2025)", NS_URL],
    ["perimeter", "p2", "50% · 62.5% · 75%", ["USMCA Ch. 4; CRS", "T-MEC cap. 4; CRS"]],
    ["perimeter", "p3", "≈50% · <40%", "Federal Reserve Bank of Dallas (2026)", "https://www.dallasfed.org/research/economics/2026/0804"],
    ["perimeter", "p4", "≈80%", "Federal Reserve Bank of Dallas (2026)", "https://www.dallasfed.org/research/economics/2026/0804"],
    ["perimeter", "p5", "94.7%", "USTR (2026)", "https://ustr.gov/sites/default/files/files/agreements/FTA/USMCA/2026%20USMCA%20Autos%20Report%20to%20Congress_070126.pdf"],
    ["economy", "e1", "$0.12B · $0.92B · $1.76B", "Serra Puche (2015); INEGI"],
    ["economy", "e2", "$2.9B · $19.3B · $40.9B", "Serra Puche (2015); Secretaría de Economía", "https://www.gob.mx/se/prensa/mexico-alcanza-cifra-historica-de-inversion-extranjera-directa-en-2025-40-871-millones-de-dolares-crecio-un-10-8-anual"],
    ["economy", "e3", "74%", ["World Bank", "Banco Mundial"]],
    ["economy", "e4", "$505.6B → $438.9B", "U.S. Census Bureau; BLS"],
    ["economy", "e5", "$314.0B → $505.9B", "U.S. Census Bureau; BLS"],
    ["economy", "e6", "$300.0B → $412.7B", "U.S. Census Bureau; BLS"],
    ["economy", "e7", "$1.6T · 2.7×", "U.S. Census Bureau"],
    ["economy", "e8", "$10,166", "Drewry World Container Index", "https://www.drewry.co.uk/supply-chain-advisors/world-container-index-weekly-update"],
    ["economy", "e9", "60%", "U.S. EIA"],
    ["economy", "e10", "6.4 Bcf/d", "U.S. EIA"],
    ["theorem", "s1", "$293B · $1.6T", "U.S. Census Bureau", "https://www.census.gov/foreign-trade/balance/c2010.html"],
    ["theorem", "s2", "7–8", "CRS IF11387 (2021)", "https://www.congress.gov/crs-product/IF11387"],
    ["theorem", "s3", "≈40¢", "Koopman, Wang & Wei (2014)"],
    ["people", "h1", "30.8 · 39.6 · 41.7", "UN WPP 2024"],
    ["people", "h2", "2014", "UN WPP 2024"],
    ["people", "h3", "0.53 → 0.61", "UN WPP 2024"],
    ["people", "h4", "89% · 62% · 53%", "INEGI 2020; Pew 2023–24; StatCan 2021"],
    ["people", "h5", "43M", "ACS 2023"],
    ["people", "h6", "37M", ["Pew Research Center (2021 data)", "Pew Research Center (datos de 2021)"]],
    ["people", "h7", "≈800,000", ["INEGI, 2020 census", "INEGI, censo 2020"]]
  ];
  var fsSec = "all";
  function fold(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function factSource(f) { return Array.isArray(f[3]) ? f[3][current === "es" ? 1 : 0] : f[3]; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function visibleFacts() {
    var q = fold(($("#fs-q") || {}).value || "");
    return FACTS.filter(function (f) {
      if (fsSec !== "all" && f[0] !== fsSec) return false;
      return !q || fold([t("fs.sec." + f[0]), t("fs.f." + f[1]), f[2], factSource(f)].join(" ")).indexOf(q) >= 0;
    });
  }
  function renderFacts() {
    var body = $("#fs-rows");
    if (!body) return;
    var rows = visibleFacts();
    body.innerHTML = rows.map(function (f) {
      var src = esc(factSource(f));
      return '<tr><td class="fs-sec"><a href="index.html' + FS_SECTIONS[f[0]] + '">' + esc(t("fs.sec." + f[0])) + "</a></td>" +
        "<td>" + esc(t("fs.f." + f[1])) + '</td><td class="fs-val">' + esc(f[2]) + "</td>" +
        '<td class="fs-src">' + (f[4] ? '<a href="' + f[4] + '" target="_blank" rel="noopener">' + src + " ↗</a>" : src) + "</td></tr>";
    }).join("");
    var n = $("#fs-count");
    if (n) n.textContent = t("fs.count").replace("{n}", rows.length).replace("{m}", FACTS.length);
    // The section links keep the chosen language.
    if (current === "es") $$("a", body).forEach(function (a) { if (a.getAttribute("href").indexOf("index.html") === 0) a.setAttribute("href", a.getAttribute("href").replace("index.html", "index.html?lang=es")); });
  }
  function buildFactSheet() {
    var chips = $("#fs-chips");
    if (!chips) return;
    chips.innerHTML = ["all"].concat(Object.keys(FS_SECTIONS)).map(function (k) {
      return '<button type="button" data-sec="' + k + '" aria-pressed="' + (k === fsSec) + '">' + esc(k === "all" ? t("fs.all") : t("fs.sec." + k)) + "</button>";
    }).join("");
    $("#fs-q").placeholder = t("fs.ph");
    renderFacts();
  }
  if ($("#fs-chips")) {
    $("#fs-chips").addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      fsSec = b.dataset.sec;
      $$("#fs-chips button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      renderFacts();
    });
    $("#fs-q").addEventListener("input", renderFacts);
    $("#fs-csv").addEventListener("click", function () {
      var cell = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
      var lines = [$$(".fs-table th").map(function (th) { return th.textContent; }).concat("URL").map(cell).join(",")];
      visibleFacts().forEach(function (f) { lines.push([t("fs.sec." + f[0]), t("fs.f." + f[1]), f[2], factSource(f), f[4] || ""].map(cell).join(",")); });
      var url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
      var a = document.createElement("a");
      a.href = url; a.download = t("fs.file") + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    langListeners.push(buildFactSheet);
  }

  /* ───────────────────────── Foundations: bibliography search, counts, citation ───────────────────────── */
  function filterBiblio() {
    var input = $("#b-q");
    if (!input) return;
    var q = fold(input.value), shown = 0, all = $$(".biblio li");
    $$(".biblio-group").forEach(function (g) {
      var n = 0;
      $$("li", g).forEach(function (li) { var on = !q || fold(li.textContent).indexOf(q) >= 0; li.hidden = !on; if (on) n++; });
      g.hidden = n === 0;
      $(".bg-n", g).textContent = n;
      shown += n;
    });
    $("#b-count").textContent = t("b.count").replace("{n}", shown).replace("{m}", all.length);
  }
  if ($("#b-q")) {
    $("#b-q").addEventListener("input", filterBiblio);
    langListeners.push(function () { $("#b-q").placeholder = t("b.ph"); filterBiblio(); });
  }
  $$("[data-count]").forEach(function (n) {
    var c = { claims: $$(".theme").length, questions: $$(".oq").length, facts: FACTS.length, sources: $$(".biblio li").length }[n.dataset.count];
    if (c) n.textContent = c;
  });
  var citeText = $("#cite-text");
  if (citeText) {
    var setCite = function () { citeText.textContent = t("cite.text").replace("{url}", window.location.origin + window.location.pathname); };
    langListeners.push(setCite);
    $("#cite-copy").addEventListener("click", function () {
      var b = this;
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(citeText.textContent).then(function () {
        b.textContent = t("cite.copied");
        setTimeout(function () { b.textContent = t("cite.copy"); }, 2000);
      });
    });
  }

  /* ───────────────────────── Footer easter egg ───────────────────────── */
  // Hover or focus reveals it; a tap toggles it on touch screens.
  $$(".egg").forEach(function (b) { b.addEventListener("click", function () { b.classList.toggle("on"); }); });

  /* ───────────────────────── Reveal on scroll ───────────────────────── */
  function onReveal(node) {
    if (node.classList.contains("schedule")) $$(".sch-row", node).forEach(function (row, i) { placeStrip(row, SCHEDULE[i], true); });
    if ($("#ev-bars", node)) growFills($("#ev-bars", node));
    $$(".dumbbells", node).forEach(growDumbbells);
    if ($(".steps", node)) growSteps(node);
    if ($("#slope", node)) growSlope();
    if ($("#wa-line", node)) drawPaths($("#wa-line", node));
    // Once the chips have popped in, hovering them should react without the stagger.
    if (node.classList.contains("statement-text")) setTimeout(function () { $$(".chip", node).forEach(function (c) { c.style.transitionDelay = ""; }); }, reduceMotion ? 0 : 1500);
  }
  var revealables = $$(".reveal");
  revealables.forEach(function (n) {
    var sib = n.parentElement ? Array.prototype.indexOf.call(n.parentElement.children, n) : 0;
    n.style.transitionDelay = Math.min(sib, 5) * 60 + "ms";
  });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        onReveal(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.06 });
    revealables.forEach(function (n) { io.observe(n); });
  } else {
    revealables.forEach(function (n) { n.classList.add("in"); onReveal(n); });
  }

  /* ───────────────────────── Journey toggle ───────────────────────── */
  var toggle = $(".toggle");
  var route = $("#journey-panel");
  if (toggle && route) {
    var tabs = $$("[role=tab]", toggle);
    var select = function (tab) {
      tabs.forEach(function (b) { var on = b === tab; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
      toggle.classList.toggle("is-cu", tab.dataset.mode === "cu");
      route.dataset.mode = tab.dataset.mode;
      route.setAttribute("aria-labelledby", tab.id);
    };
    tabs.forEach(function (tab, i) {
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        next.focus(); select(next);
      });
    });
  }

  /* ───────────────────────── Nav: background + active link ───────────────────────── */
  var nav = $("#nav");
  var menuBtn = $(".menu-btn");
  function setMenu(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  }
  if (menuBtn) {
    menuBtn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    $$("#nav-panel a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); } });
    window.matchMedia("(min-width: 921px)").addEventListener("change", function (m) { if (m.matches) setMenu(false); });
  }
  var links = $$(".nav-links a[href^='#']");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (nav) {
        nav.classList.toggle("scrolled", window.scrollY > 30 || nav.dataset.always === "1");
        var under = document.elementFromPoint(window.innerWidth / 2, nav.offsetHeight + 2);
        nav.classList.toggle("on-paper", !!(under && under.closest(".paper")));
      }
      trackEggSteps();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  var resizeT = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      [["#roo-chart", buildROO], ["#slope", buildSlope], ["#wa-line", buildWALine], ["#pyramid", buildPyramid]].forEach(function (c) {
        var svg = $(c[0]);
        if (svg && svg.classList.contains("narrow") !== isNarrow(svg)) c[1]();
      });
    }, 200);
  });
  if ("IntersectionObserver" in window && links.length) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || !byId[entry.target.id]) return;
        links.forEach(function (l) { l.classList.remove("active"); });
        byId[entry.target.id].classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) navIO.observe(s); });
  }

  /* ───────────────────────── Share ───────────────────────── */
  var shareBtn = $("#share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      var data = { title: document.title, url: window.location.href.split("#")[0] };
      if (navigator.share) navigator.share(data).catch(function () { /* dismissed */ });
      else if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(function () {
        var s = $("#share-status"); if (s) s.textContent = t("share.copied");
      });
    });
  }

  /* ───────────────────────── Init ───────────────────────── */
  if (nav && nav.classList.contains("scrolled")) nav.dataset.always = "1";
  buildHeroMap();
  buildPerimeterMap();
  buildEgg();
  var initial = new URLSearchParams(window.location.search).get("lang");
  if (!initial) {
    try { initial = localStorage.getItem("ona-lang"); } catch (e) { initial = null; }
    if (!initial) initial = (navigator.language || "en").toLowerCase().indexOf("es") === 0 ? "es" : "en";
  }
  setLang(initial);
  playHero();
  onScroll();
})();
