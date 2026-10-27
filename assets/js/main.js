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
  var MONARCH_D = $(".brand-mark path") ? $(".brand-mark path").getAttribute("d") : "";
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
    factory: '<svg viewBox="0 0 48 48" class="line"><path d="M6 40V21l9 6v-6l9 6v-6l9 6V8h8v32zM4 40h40"/></svg>'
  };
  function buildChips() {
    var chips = $$(".chip[data-chip]");
    chips.forEach(function (c, i) {
      c.style.transitionDelay = (0.15 + i * 0.09).toFixed(2) + "s";
      if (c.firstChild) return;
      var k = c.dataset.chip;
      c.classList.add("chip-" + k.toLowerCase());
      if (CHIP_VB[k]) {
        if (!MAP) return;
        c.innerHTML = '<svg viewBox="' + CHIP_VB[k] + '">' + (k === "NA" ? ["CA", "US", "MX"] : [k]).map(function (p) { return '<path d="' + MAP[p] + '"/>'; }).join("") + "</svg>";
      } else if (k === "pyramid") c.innerHTML = pyramidIcon();
      else if (k === "monarch") c.innerHTML = '<svg viewBox="4 17.5 92 65"><path d="' + MONARCH_D + '"/></svg>';
      else c.innerHTML = CHIP_ICON[k] || "";
    });
  }
  langListeners.push(buildChips);

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

  /* ───────────────────────── 2015 → 2025: the question mark answered ───────────────────────── */
  var venn = $("#venn");
  function buildVenn() {
    if (!venn) return;
    var merged = venn.classList.contains("merged");
    venn.innerHTML = "";
    el("circle", { cx: 260, cy: 225, r: 172, fill: "#d9731c", "class": "v-one" }, venn);
    [["v-us", 200, 170, C.US], ["v-ca", 320, 170, C.CA], ["v-mx", 260, 275, C.MX]].forEach(function (c) {
      el("circle", { cx: c[1], cy: c[2], r: 120, fill: c[3], "fill-opacity": 0.42, stroke: c[3], "stroke-width": 2, "class": "v-circle " + c[0] }, venn);
    });
    txt(venn, 120, 40, t("map.us"), { "text-anchor": "middle", "class": "v-label" });
    txt(venn, 400, 40, "Canada", { "text-anchor": "middle", "class": "v-label" });
    txt(venn, 260, 425, t("map.mx"), { "text-anchor": "middle", "class": "v-label" });
    txt(venn, 260, 214, t("q.cu"), { "text-anchor": "middle", "class": "v-q" });
    txt(venn, 260, 240, "(???)", { "text-anchor": "middle", "class": "v-q" });
    txt(venn, 260, 222, t("q.cu"), { "text-anchor": "middle", "class": "v-a" });
    txt(venn, 260, 252, "2025", { "text-anchor": "middle", "class": "v-a", style: "font-size:16px" });
    if (merged) venn.classList.add("merged");
  }
  langListeners.push(buildVenn);
  var replay = $("#venn-replay");
  if (replay && venn) replay.addEventListener("click", function () {
    venn.classList.remove("merged");
    setTimeout(function () { venn.classList.add("merged"); }, 1400);
  });

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
    if ($("#venn", node)) setTimeout(function () { venn.classList.add("merged"); }, reduceMotion ? 0 : 1500);
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
  var initial = new URLSearchParams(window.location.search).get("lang");
  if (!initial) {
    try { initial = localStorage.getItem("ona-lang"); } catch (e) { initial = null; }
    if (!initial) initial = (navigator.language || "en").toLowerCase().indexOf("es") === 0 ? "es" : "en";
  }
  setLang(initial);
  playHero();
  onScroll();
})();
