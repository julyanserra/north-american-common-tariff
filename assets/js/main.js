/* One North America — interactions
   No dependencies. Data comes from data.js (map + UN population figures)
   and the tables below; copy lives in index.html / foundations.html and i18n.js. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MAP = window.NA_MAP;
  var DEMOG = window.NA_DEMOG;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function mix(c1, c2, k) {
    return "rgb(" + Math.round(lerp(c1[0], c2[0], k)) + "," + Math.round(lerp(c1[1], c2[1], k)) + "," + Math.round(lerp(c1[2], c2[2], k)) + ")";
  }

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

  /* ───────────────────────── Hero map ───────────────────────── */
  var hero = $(".hero");
  var heroSvg = $("#hero-map");
  var COLORS = { CA: [184, 134, 42], US: [58, 147, 214], MX: [212, 86, 106] };
  var UNIFIED = [233, 228, 216];
  var INK = [11, 15, 20];
  var SIGNAL = [255, 91, 58];
  var heroParts = null;

  function buildHeroMap() {
    if (!heroSvg || !MAP) return;
    heroSvg.setAttribute("viewBox", MAP.viewBox);
    el("path", { d: MAP.context, fill: "#18202b" }, heroSvg);
    var countries = {};
    ["CA", "US", "MX"].forEach(function (k) {
      countries[k] = el("path", { d: MAP[k], "stroke-linejoin": "round" }, heroSvg);
    });
    var mask = el("path", { d: MAP.borders, fill: "none", "stroke-linecap": "round" }, heroSvg);
    var borders = el("path", { d: MAP.borders, fill: "none", stroke: "#ffffff", "stroke-width": 2, "stroke-dasharray": "0", "stroke-linecap": "round" }, heroSvg);
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
    heroParts.labels.US.textContent = t("map.us") || "United States";
    heroParts.labels.MX.textContent = t("map.mx") || "Mexico";
    heroParts.na.textContent = t("map.na") || "North America";
  }
  langListeners.push(labelHeroMap);

  var heroK = -1;
  function renderHero(k) {
    if (!heroParts || Math.abs(k - heroK) < 0.002) return;
    heroK = k;
    var e = ease(k);
    var width = lerp(0.6, 2.4, e);
    ["CA", "US", "MX"].forEach(function (key) {
      var p = heroParts.countries[key];
      p.setAttribute("fill", mix(COLORS[key], UNIFIED, e));
      p.setAttribute("stroke", mix(INK, SIGNAL, e));
      p.setAttribute("stroke-width", width.toFixed(2));
    });
    // Cover the internal edges once the fills have merged, so only the perimeter stays lit.
    heroParts.mask.setAttribute("stroke", mix(UNIFIED, UNIFIED, 1));
    heroParts.mask.setAttribute("stroke-width", (width * 2 + 1.5).toFixed(2));
    heroParts.mask.setAttribute("opacity", Math.pow(e, 4).toFixed(3));
    heroParts.borders.setAttribute("opacity", (1 - e).toFixed(3));
    heroParts.borders.setAttribute("stroke-dasharray", e > 0.02 ? (6 * (1 - e) + 0.5).toFixed(2) + " " + (10 * e).toFixed(2) : "0");
    var lab = clamp(1 - k * 1.8);
    ["CA", "US", "MX"].forEach(function (key) { heroParts.labels[key].setAttribute("opacity", lab.toFixed(3)); });
    heroParts.na.setAttribute("opacity", clamp((k - 0.55) * 3).toFixed(3));
    if (hero) hero.classList.toggle("converged", k > 0.6);
  }
  function heroProgress() {
    if (!hero) return 0;
    var span = hero.offsetHeight - window.innerHeight;
    if (span <= 0) return 1;
    return clamp((-hero.getBoundingClientRect().top / span - 0.06) / 0.72);
  }

  /* ───────────────────────── Perimeter map ───────────────────────── */
  function buildPerimeterMap() {
    var svg = $("#per-map");
    if (!svg || !MAP) return;
    svg.setAttribute("viewBox", MAP.viewBox);
    el("path", { d: MAP.context, fill: "#e2dccd" }, svg);
    ["CA", "US", "MX"].forEach(function (k) {
      el("path", { d: MAP[k], fill: "#ffffff", stroke: "#c4361a", "stroke-width": 1.6, "stroke-linejoin": "round" }, svg);
    });
    el("path", { d: MAP.borders, fill: "none", stroke: "#ffffff", "stroke-width": 4 }, svg);
    el("path", { d: MAP.borders, fill: "none", stroke: "#9aa0a6", "stroke-width": 1.2, "stroke-dasharray": "4 5" }, svg);
    var P = MAP.ports;
    var ports = [
      ["vancouver", "Vancouver", -16, -6, "end"], ["la", "Los Angeles", -16, 7, "end"], ["houston", "Houston", 14, 26, "start"],
      ["savannah", "Savannah", 16, 7, "start"], ["ny", "New York", 16, 12, "start"], ["halifax", "Halifax", 16, 7, "start"],
      ["manzanillo", "Manzanillo", -16, 7, "end"], ["veracruz", "Veracruz", 16, 7, "start"]
    ];
    ports.forEach(function (p) {
      var xy = P[p[0]];
      el("circle", { cx: xy[0], cy: xy[1], r: 15, fill: "rgba(196,54,26,0.16)" }, svg);
      el("circle", { cx: xy[0], cy: xy[1], r: 7, fill: "#c4361a" }, svg);
      if (p[1]) {
        var tx = el("text", { x: xy[0] + p[2], y: xy[1] + p[3], "text-anchor": p[4], "class": "port-label" }, svg);
        tx.textContent = p[1];
      }
    });
    [["laredo", "Laredo", -16, 2, "end"], ["detroit", "Detroit", -14, -12, "end"]].forEach(function (p) {
      var xy = P[p[0]];
      el("circle", { cx: xy[0], cy: xy[1], r: 8, fill: "#f3f0e8", stroke: "#14181e", "stroke-width": 3 }, svg);
      var tx = el("text", { x: xy[0] + p[2], y: xy[1] + p[3], "text-anchor": p[4], "class": "port-label" }, svg);
      tx.textContent = p[1];
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
        '<span class="strip" aria-hidden="true"><span class="strip-axis"></span>' +
          '<span class="strip-range"></span>' +
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
    // Dots start spread out and, once revealed, the ring settles on the common rate.
    $(".strip-dot.ca", row).style.left = x(r.ca);
    $(".strip-dot.us", row).style.left = x(r.us);
    $(".strip-dot.mx", row).style.left = x(r.mx);
    var ring = $(".strip-ring", row);
    if (ring) { ring.style.left = final ? x(r.na) : x(hi); ring.style.opacity = final ? 1 : 0; }
  }
  langListeners.push(buildSchedule);

  /* ───────────────────────── Demography: pyramid ───────────────────────── */
  var pyrYear = "2025";
  var PYR_ORDER = ["US", "CA", "MX"]; // centre → outside
  var PYR_COLORS = { CA: "#b8862a", US: "#3a93d6", MX: "#d4566a" };
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
    var W = 600, rowH = 20, top = 8, n = 18, mid = W / 2, gapC = 26, H = top + n * rowH + 28;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
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
    // Gridlines every 5 million
    for (var m = 5000; m <= maxSide; m += 5000) {
      [mid - gapC - m * scale, mid + gapC + m * scale].forEach(function (gx) {
        el("line", { x1: gx, x2: gx, y1: top, y2: top + n * rowH, stroke: "rgba(236,231,220,0.08)" }, svg);
      });
      var lbl = el("text", { x: mid + gapC + m * scale, y: top + n * rowH + 16, "text-anchor": "middle" }, svg);
      lbl.textContent = (m / 1000) + "M";
      var lbl2 = el("text", { x: mid - gapC - m * scale, y: top + n * rowH + 16, "text-anchor": "middle" }, svg);
      lbl2.textContent = (m / 1000) + "M";
    }
    var sx = el("text", { x: mid - gapC, y: top + n * rowH + 16, "text-anchor": "end", "class": "axis-label" }, svg);
    sx.textContent = t("pyr.men") || "Men";
    var sy = el("text", { x: mid + gapC, y: top + n * rowH + 16, "text-anchor": "start", "class": "axis-label" }, svg);
    sy.textContent = t("pyr.women") || "Women";

    for (var i = 0; i < n; i++) {
      var y = top + (n - 1 - i) * rowH;
      var hit = el("rect", { x: 0, y: y, width: W, height: rowH, "class": "row-hit" }, svg);
      var al = el("text", { x: mid, y: y + rowH / 2 + 4, "text-anchor": "middle" }, svg);
      al.textContent = ageLabel(i);
      [0, 1].forEach(function (s) {
        var offset = gapC;
        PYR_ORDER.forEach(function (c) {
          var v = data[c][i][s] * scale;
          if (v <= 0) return;
          var bx = s === 0 ? mid - offset - v : mid + offset;
          el("rect", { x: bx.toFixed(2), y: y + 2, width: Math.max(0, v - 1.5).toFixed(2), height: rowH - 4, fill: PYR_COLORS[c], "class": "bar" }, svg);
          offset += v;
        });
      });
      (function (i, hit) {
        var show = function () {
          var tot = 0, parts = [];
          ["MX", "US", "CA"].forEach(function (c) {
            var v = data[c][i][0] + data[c][i][1]; tot += v;
            parts.push((c === "CA" ? "Canada" : t("map." + c.toLowerCase())) + " " + (v / 1000).toFixed(1) + "M");
          });
          $$(".row-hit", svg).forEach(function (h) { h.classList.remove("on"); });
          hit.classList.add("on");
          if (tip) tip.textContent = (t("pyr.ages") || "Ages") + " " + ageLabel(i) + " · " + (tot / 1000).toFixed(1) + "M · " + parts.join(" · ");
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
    return (t("pyr.sum") || "{y}: {p} million people · median age {m}").replace("{y}", pyrYear).replace("{p}", Math.round(d.total / 1000)).replace("{m}", d.median);
  }
  $$(".seg button").forEach(function (b) {
    b.addEventListener("click", function () {
      pyrYear = b.dataset.year;
      $$(".seg button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      buildPyramid();
    });
  });
  langListeners.push(buildPyramid);

  /* ───────────────────────── Demography: working-age change ───────────────────────── */
  var WA_ROWS = [["NA", true], ["MX", true], ["CA", true], ["US", true], ["IN", false], ["EU", false], ["CN", false], ["JP", false]];
  function buildWorkingAge() {
    var host = $("#wa-chart");
    if (!host || !DEMOG) return;
    host.innerHTML = "";
    var lo = -30, hi = 22, span = hi - lo, zero = (-lo / span) * 100;
    WA_ROWS.forEach(function (r) {
      var a = DEMOG["2025"][r[0]].wa_k, b = DEMOG["2050"][r[0]].wa_k;
      var ch = (b - a) / a * 100;
      var row = document.createElement("div");
      row.className = "wa-row" + (r[1] ? " is-na" : "");
      var w = Math.abs(ch) / span * 100;
      var left = ch >= 0 ? zero : zero - w;
      var valPos = ch >= 0 ? "left:calc(" + (zero + w) + "% + 6px)" : "right:calc(" + (100 - zero + w) + "% + 6px)";
      row.innerHTML = '<span class="wa-name">' + t("wa." + r[0]) + "</span>" +
        '<span class="wa-track"><span class="wa-zero" style="left:' + zero + '%"></span>' +
        '<span class="wa-bar ' + (ch >= 0 ? "pos" : "neg") + '" data-left="' + left + '" data-w="' + w + '" style="left:' + zero + '%"></span>' +
        '<span class="wa-val" style="' + valPos + '">' + (ch >= 0 ? "+" : "−") + Math.abs(ch).toFixed(1) + "%</span></span>";
      host.appendChild(row);
    });
    if (host.closest(".in")) growWorkingAge();
  }
  function growWorkingAge() {
    $$("#wa-chart .wa-bar").forEach(function (bar) {
      bar.style.left = bar.dataset.left + "%";
      bar.style.width = bar.dataset.w + "%";
    });
  }
  langListeners.push(buildWorkingAge);

  /* ───────────────────────── Trade bars ───────────────────────── */
  var tradeRows = $$("#trade-chart .bar-row");
  var tradeMax = Math.max.apply(null, tradeRows.map(function (r) { return parseFloat(r.dataset.value); }).concat([1]));
  tradeRows.forEach(function (r) { r.querySelector(".bar-fill").style.setProperty("--w", (parseFloat(r.dataset.value) / tradeMax * 100).toFixed(1) + "%"); });

  /* ───────────────────────── Reveal on scroll ───────────────────────── */
  function onReveal(node) {
    if (node.classList.contains("schedule")) $$(".sch-row", node).forEach(function (row, i) { placeStrip(row, SCHEDULE[i], true); });
    if (node.classList.contains("wa-card")) growWorkingAge();
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
  var links = $$(".nav-links a[href^='#']");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (nav) {
        nav.classList.toggle("scrolled", window.scrollY > 30);
        var under = document.elementFromPoint(window.innerWidth / 2, nav.offsetHeight + 2);
        nav.classList.toggle("on-paper", !!(under && under.closest(".paper")));
      }
      if (heroSvg) renderHero(heroProgress());
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
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
  buildHeroMap();
  buildPerimeterMap();
  var initial = new URLSearchParams(window.location.search).get("lang");
  if (!initial) {
    try { initial = localStorage.getItem("ona-lang"); } catch (e) { initial = null; }
    if (!initial) initial = (navigator.language || "en").toLowerCase().indexOf("es") === 0 ? "es" : "en";
  }
  setLang(initial);
  renderHero(heroProgress());
  onScroll();
})();
