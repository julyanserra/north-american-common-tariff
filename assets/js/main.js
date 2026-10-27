/* One North America — interactions
   No dependencies. Progressive enhancement: the page reads fine without JS. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────────────────────── i18n ───────────────────────── */
  var DICT = window.I18N || {};
  var originals = new Map();
  var current = "en";

  function nodes() { return document.querySelectorAll("[data-i18n],[data-i18n-html]"); }
  nodes().forEach(function (el) { originals.set(el, el.innerHTML); });

  var metaDesc = document.querySelector('meta[name="description"]');
  var original = { title: document.title, desc: metaDesc ? metaDesc.content : "" };

  function t(key) {
    var d = DICT[current];
    return (d && d[key]) || (DICT.en && DICT.en[key]) || "";
  }

  function setLang(lang) {
    if (lang !== "es") lang = "en";
    current = lang;
    var dict = DICT[lang] || {};
    nodes().forEach(function (el) {
      var key = el.getAttribute("data-i18n") || el.getAttribute("data-i18n-html");
      el.innerHTML = lang === "en" || !dict[key] ? originals.get(el) : dict[key];
    });
    doc.lang = lang;
    document.title = lang === "en" ? original.title : dict["meta.title"] || original.title;
    if (metaDesc) metaDesc.content = lang === "en" ? original.desc : dict["meta.desc"] || original.desc;
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
    try { localStorage.setItem("ona-lang", lang); } catch (e) { /* storage unavailable */ }
    var url = new URL(window.location.href);
    if (lang === "es") url.searchParams.set("lang", "es"); else url.searchParams.delete("lang");
    history.replaceState(null, "", url);
    if (tip) tip.textContent = t("chart.combined");
    positionLabels();
  }

  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.dataset.lang); });
  });

  /* ───────────────────────── Hero: three schedules → one ───────────────────────── */
  var hero = document.querySelector(".hero");
  var svg = document.getElementById("schedules-svg");
  var NS = "http://www.w3.org/2000/svg";
  var N = 52, W = 640, H = 360;
  var slot = W / N, bw = slot * 0.58;
  var COLORS = { ca: [184, 134, 42], us: [58, 147, 214], mx: [212, 86, 106] };
  var SIGNAL = [255, 91, 58];
  var ROWS = [
    { key: "ca", base: 116, seed: 7 },
    { key: "us", base: 220, seed: 19 },
    { key: "mx", base: 324, seed: 41 }
  ];
  // Same scale before and after, so the illustration never overstates the common tariff.
  var ROW_MAX = 84, COMMON_BASE = 236, COMMON_MAX = ROW_MAX;
  var labelEls = {
    ca: document.querySelector(".lab-ca"),
    us: document.querySelector(".lab-us"),
    mx: document.querySelector(".lab-mx"),
    na: document.querySelector(".lab-na")
  };

  // Deterministic pseudo-random so the illustration is identical on every load.
  function rng(seed) {
    var s = seed;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  // A smooth-ish tariff profile: low on most lines, peaks on a few sensitive ones.
  function profile(seed) {
    var r = rng(seed), out = [];
    for (var i = 0; i < N; i++) {
      var v = Math.pow(r(), 2.2) * 0.85 + 0.06;
      if (r() > 0.9) v = 0.75 + r() * 0.25; // tariff peaks
      out.push(v);
    }
    return out;
  }
  var bars = [];
  var common = [];
  if (svg) {
    var profiles = ROWS.map(function (row) { return profile(row.seed); });
    // ~40% of lines start identical: copy the U.S. value across schedules.
    var same = rng(3);
    for (var i = 0; i < N; i++) {
      if (same() < 0.4) { profiles[0][i] = profiles[1][i]; profiles[2][i] = profiles[1][i]; }
      // Common tariff converges toward the lower rates (no increase in overall protection).
      var vals = [profiles[0][i], profiles[1][i], profiles[2][i]].sort(function (a, b) { return a - b; });
      common.push(vals[0] * 0.6 + vals[1] * 0.4);
    }
    // Baseline rules
    ROWS.forEach(function (row) {
      var l = document.createElementNS(NS, "line");
      l.setAttribute("x1", 0); l.setAttribute("x2", W);
      l.setAttribute("y1", row.base); l.setAttribute("y2", row.base);
      l.setAttribute("stroke", "rgba(236,231,220,0.14)");
      l.setAttribute("stroke-width", "1");
      l.classList.add("baseline");
      svg.appendChild(l);
      row.line = l;
    });
    ROWS.forEach(function (row, ri) {
      var g = document.createElementNS(NS, "g");
      for (var i = 0; i < N; i++) {
        var rect = document.createElementNS(NS, "rect");
        rect.setAttribute("x", (i * slot + (slot - bw) / 2).toFixed(2));
        rect.setAttribute("width", bw.toFixed(2));
        rect.setAttribute("rx", "1.5");
        g.appendChild(rect);
        bars.push({ el: rect, row: row, ri: ri, i: i, v: profiles[ri][i] });
      }
      svg.appendChild(g);
    });
  }

  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function mix(c1, c2, k) {
    return "rgb(" + Math.round(lerp(c1[0], c2[0], k)) + "," + Math.round(lerp(c1[1], c2[1], k)) + "," + Math.round(lerp(c1[2], c2[2], k)) + ")";
  }

  var heroK = 0;
  function renderHero(k) {
    heroK = k;
    var e = ease(k);
    for (var b = 0; b < bars.length; b++) {
      var bar = bars[b];
      // Stagger each line slightly so the convergence ripples left to right.
      var local = ease(clamp((k - (bar.i / N) * 0.25) / 0.75));
      var base = lerp(bar.row.base, COMMON_BASE, local);
      var h = lerp(bar.v * ROW_MAX, common[bar.i] * COMMON_MAX, local);
      bar.el.setAttribute("y", (base - h).toFixed(2));
      bar.el.setAttribute("height", Math.max(1, h).toFixed(2));
      bar.el.setAttribute("fill", mix(COLORS[bar.row.key], SIGNAL, local));
      bar.el.setAttribute("opacity", bar.ri === 1 ? 1 : (1 - local * 0.92).toFixed(3));
    }
    ROWS.forEach(function (row) {
      var y = lerp(row.base, COMMON_BASE, e);
      row.line.setAttribute("y1", y); row.line.setAttribute("y2", y);
    });
    if (hero) hero.classList.toggle("converged", k > 0.62);
    positionLabels();
  }

  function positionLabels() {
    if (!svg) return;
    var scale = svg.getBoundingClientRect().height / H;
    var e = ease(heroK);
    var fade = clamp(1 - heroK * 2.2);
    ROWS.forEach(function (row) {
      var el = labelEls[row.key];
      if (!el) return;
      var y = lerp(row.base - ROW_MAX - 6, COMMON_BASE - COMMON_MAX - 6, e);
      el.style.top = (y * scale - 14) + "px";
      el.style.opacity = fade;
    });
    if (labelEls.na) {
      labelEls.na.style.top = ((COMMON_BASE - COMMON_MAX - 26) * scale) + "px";
      labelEls.na.style.opacity = clamp((heroK - 0.55) * 3);
    }
  }

  function heroProgress() {
    if (!hero) return 0;
    var rect = hero.getBoundingClientRect();
    var span = hero.offsetHeight - window.innerHeight;
    if (span <= 0) return 1;
    return clamp((-rect.top / span - 0.08) / 0.7);
  }

  /* ───────────────────────── Scroll loop ───────────────────────── */
  var nav = document.getElementById("nav");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (nav) {
        nav.classList.toggle("scrolled", window.scrollY > 40);
        // Match the nav to whatever section sits beneath it.
        var under = document.elementFromPoint(window.innerWidth / 2, nav.offsetHeight + 2);
        nav.classList.toggle("on-paper", !!(under && under.closest(".paper")));
      }
      if (svg) {
        var k = heroProgress();
        if (Math.abs(k - heroK) > 0.001) renderHero(k);
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { positionLabels(); onScroll(); });

  /* ───────────────────────── Reveal on scroll ───────────────────────── */
  var revealables = document.querySelectorAll(".reveal, .route, .roadmap");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        onReveal(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    revealables.forEach(function (el, i) {
      // Small stagger for siblings that reveal together.
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(sib, 5) * 70 + "ms";
      io.observe(el);
    });
  } else {
    revealables.forEach(function (el) { el.classList.add("in"); onReveal(el); });
  }

  function onReveal(el) {
    el.querySelectorAll(".count").forEach(countUp);
    if (el.classList.contains("chart")) growBars();
  }

  /* ───────────────────────── Count-up numbers ───────────────────────── */
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    var to = parseFloat(el.dataset.to);
    var dec = parseInt(el.dataset.decimals || "0", 10);
    var pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = pre + to.toFixed(dec) + suf; return; }
    var start = performance.now(), dur = 1600;
    (function step(now) {
      var k = clamp((now - start) / dur);
      var v = to * (1 - Math.pow(1 - k, 4));
      el.textContent = pre + v.toFixed(dec) + suf;
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }

  /* ───────────────────────── Trade chart ───────────────────────── */
  var chartRows = document.querySelectorAll("#trade-chart .bar-row");
  var tip = document.getElementById("chart-tip");
  var maxVal = 0;
  chartRows.forEach(function (r) { maxVal = Math.max(maxVal, parseFloat(r.dataset.value)); });
  function growBars() {
    chartRows.forEach(function (r) {
      r.querySelector(".bar-fill").style.width = (parseFloat(r.dataset.value) / maxVal * 100).toFixed(1) + "%";
    });
  }
  function describe(r) {
    var name = r.querySelector(".bar-name").textContent;
    var v = parseFloat(r.dataset.value);
    var china = 582;
    var line = name + " · $" + v.toLocaleString(current === "es" ? "es-MX" : "en-US") + (current === "es" ? " mil millones" : "B");
    if (r.dataset.hl) line += " · " + (v / china).toFixed(1) + "× " + (t("chart.vsChina") || "China");
    return line;
  }
  chartRows.forEach(function (r) {
    r.tabIndex = 0;
    var show = function () { if (tip) tip.textContent = describe(r); };
    var hide = function () { if (tip) tip.textContent = t("chart.combined") || ""; };
    r.addEventListener("mouseenter", show);
    r.addEventListener("focus", show);
    r.addEventListener("mouseleave", hide);
    r.addEventListener("blur", hide);
  });

  /* ───────────────────────── Journey toggle ───────────────────────── */
  var toggle = document.querySelector(".toggle");
  var route = document.getElementById("journey-panel");
  if (toggle && route) {
    var tabs = toggle.querySelectorAll("[role=tab]");
    var select = function (tab) {
      tabs.forEach(function (b) {
        var on = b === tab;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      var mode = tab.dataset.mode;
      toggle.classList.toggle("is-cu", mode === "cu");
      route.dataset.mode = mode;
      route.setAttribute("aria-labelledby", tab.id);
      // Replay the route line so the switch feels like a new journey.
      route.classList.remove("in");
      void route.offsetWidth;
      route.classList.add("in");
    };
    tabs.forEach(function (tab, i) {
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          next.focus(); select(next);
        }
      });
    });
  }

  /* ───────────────────────── Active nav link ───────────────────────── */
  var links = document.querySelectorAll(".nav-links a");
  if ("IntersectionObserver" in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var a = map[entry.target.id];
        if (a && entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("active"); });
          a.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) navIO.observe(s); });
  }

  /* ───────────────────────── Share ───────────────────────── */
  var shareBtn = document.getElementById("share-btn");
  var shareStatus = document.getElementById("share-status");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      var data = { title: document.title, url: window.location.href.split("#")[0] };
      if (navigator.share) {
        navigator.share(data).catch(function () { /* dismissed */ });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(data.url).then(function () {
          if (shareStatus) shareStatus.textContent = t("share.copied") || "Link copied";
        });
      }
    });
  }

  /* ───────────────────────── Init ───────────────────────── */
  var initial = "en";
  var param = new URLSearchParams(window.location.search).get("lang");
  if (param) initial = param;
  else {
    try { initial = localStorage.getItem("ona-lang") || ""; } catch (e) { initial = ""; }
    if (!initial) initial = (navigator.language || "en").toLowerCase().indexOf("es") === 0 ? "es" : "en";
  }
  if (svg) renderHero(heroProgress());
  setLang(initial);
  onScroll();
})();
