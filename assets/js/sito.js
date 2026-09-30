/* Comportamenti del sito: menu, galleria, calendari di disponibilita', prenotazione, consenso, mappe.
   Nessuna libreria esterna. La disponibilita' arriva da dati/disponibilita.js (aggiornato dal server). */
(function () {
  "use strict";
  var S = window.SITO || {}, M = S.msg || {}, d = document, root = S.root || "", LANG = S.lang || "it";
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  };
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ""; }); }
  function iso(dt) { var m = dt.getMonth() + 1, g = dt.getDate(); return dt.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (g < 10 ? "0" : "") + g; }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function addDays(s, n) { var t = parse(s); t.setDate(t.getDate() + n); return iso(t); }
  function today() { return iso(new Date()); }
  function nights(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
  function itDate(s) { if (!s) return ""; var p = s.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function nice(s, anno) { return parse(s).toLocaleDateString(LANG === "it" ? "it-IT" : "en-GB", anno ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" }); }
  function euro(n) { var t = Math.round(n).toLocaleString(LANG === "it" ? "it-IT" : "en-GB"); return LANG === "it" ? t + " €" : "€" + t; }
  function waUrl(msg) { return "https://wa.me/" + S.wa + "?text=" + encodeURIComponent(msg); }

  /* ---------- comparsa morbida (solo movimento, mai trasparenza) */
  var rise = $$(".rise");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    rise.forEach(function (el) { io.observe(el); });
  }
  setTimeout(function () { rise.forEach(function (el) { el.classList.add("in"); }); }, 2000);

  /* ---------- header e menu mobile */
  var hdr = $("#hdr"), burger = $("#burger"), drawer = $("#drawer");
  function onScroll() { if (hdr) hdr.classList.toggle("is-scrolled", window.scrollY > 30); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  function closeDrawer() { if (!drawer) return; drawer.hidden = true; burger.setAttribute("aria-expanded", "false"); d.body.classList.remove("no-scroll"); hdr && hdr.classList.remove("is-open"); }
  if (burger && drawer) {
    burger.addEventListener("click", function () {
      if (burger.getAttribute("aria-expanded") === "true") { closeDrawer(); return; }
      drawer.hidden = false; burger.setAttribute("aria-expanded", "true"); d.body.classList.add("no-scroll"); hdr && hdr.classList.add("is-open");
      var f = $("a", drawer); f && f.focus();
    });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && !drawer.hidden) { closeDrawer(); burger.focus(); } });
    $$("a", drawer).forEach(function (a) { a.addEventListener("click", closeDrawer); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1180) closeDrawer(); });
  }

  /* ---------- consenso: Google Maps solo dopo "Accetta" o dopo un clic sulla mappa */
  var ban = $("#consenso");
  function consenso() { return store.get("consenso"); }
  function mostraBanner(v) { if (!ban) return; ban.hidden = !v; d.body.classList.toggle("has-consenso", !!v); }
  if (ban && !consenso()) mostraBanner(true);
  $$("[data-consenso]").forEach(function (b) {
    b.addEventListener("click", function () {
      store.set("consenso", b.getAttribute("data-consenso")); mostraBanner(false);
      if (b.getAttribute("data-consenso") === "tutti") $$(".gmap").forEach(function (m) { caricaMappa(m, false); });
    });
  });
  $$("[data-preferenze]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); mostraBanner(true); var x = $("[data-consenso]", ban); x && x.focus(); }); });

  /* ---------- mappe Google (iframe senza chiave, caricato su consenso o clic) */
  function srcMappa(q) { return "https://www.google.com/maps?q=" + encodeURIComponent(q) + "&z=16&hl=" + LANG + "&output=embed"; }
  function caricaMappa(box, forza) {
    var pts = JSON.parse(box.getAttribute("data-punti")), i = +(box.getAttribute("data-i") || 0);
    var frame = $("iframe", box);
    if (!frame) {
      if (!forza && consenso() !== "tutti") return;
      var ph = $(".gmap__ph", box); ph && ph.remove();
      frame = d.createElement("iframe");
      frame.loading = "lazy"; frame.referrerPolicy = "no-referrer-when-downgrade"; frame.allowFullscreen = true;
      $(".gmap__box", box).appendChild(frame);
    }
    frame.title = "Google Maps: " + pts[i].t;
    frame.src = srcMappa(pts[i].q);
  }
  $$(".gmap").forEach(function (box) {
    var go = $(".gmap__go", box);
    go && go.addEventListener("click", function () { caricaMappa(box, true); });
    $$(".gmap__tab", box).forEach(function (t) {
      t.addEventListener("click", function () {
        box.setAttribute("data-i", t.getAttribute("data-i"));
        $$(".gmap__tab", box).forEach(function (x) { x.setAttribute("aria-pressed", x === t ? "true" : "false"); });
        var pts = JSON.parse(box.getAttribute("data-punti")), p = pts[+t.getAttribute("data-i")];
        var l1 = $(".gmap__apri", box), l2 = $(".gmap__dir", box);
        if (l1) l1.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.q);
        if (l2) l2.href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(p.q);
        if ($("iframe", box)) caricaMappa(box, true);
      });
    });
    if (consenso() === "tutti") {
      if ("IntersectionObserver" in window) {
        var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { caricaMappa(box, false); o.disconnect(); } }); }, { rootMargin: "200px" });
        o.observe(box);
      } else caricaMappa(box, false);
    }
  });

  /* ---------- lightbox */
  var lb = $("#lb"), lbImg = $("#lb-img"), lbCap = $("#lb-cap"), lbC = $("#lb-c"), set = [], cur = 0, lastFocus = null;
  function show(i) {
    if (!set.length) return;
    cur = (i + set.length) % set.length;
    var it = set[cur];
    lbImg.src = it.s; lbImg.alt = it.a || ""; lbImg.width = it.w; lbImg.height = it.h;
    lbCap.textContent = [it.a, it.c].filter(Boolean).join(". ");
    lbC.textContent = (cur + 1) + " / " + set.length;
    var nx = new Image(); nx.src = set[(cur + 1) % set.length].s;
  }
  function openLb(data, i) { set = data; lastFocus = d.activeElement; lb.hidden = false; d.body.classList.add("no-scroll"); show(i || 0); $(".lb__x", lb).focus(); }
  function closeLb() { lb.hidden = true; d.body.classList.remove("no-scroll"); lbImg.removeAttribute("src"); if (lastFocus) lastFocus.focus(); }
  if (lb) {
    $$("[data-lb]").forEach(function (g) {
      var data = JSON.parse(g.getAttribute("data-lb"));
      $$("[data-i]", g).forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openLb(data, +b.getAttribute("data-i")); }); });
    });
    $(".lb__x", lb).addEventListener("click", closeLb);
    $(".lb__p", lb).addEventListener("click", function () { show(cur - 1); });
    $(".lb__n", lb).addEventListener("click", function () { show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    d.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") show(cur - 1);
      if (e.key === "ArrowRight") show(cur + 1);
      if (e.key === "Tab") { var f = $$("button", lb), i = f.indexOf(d.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 45) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  /* =====================================================================
     Disponibilita' e calendario
     ===================================================================== */
  var DISPO = null, CALS = [];
  function info(casa, s) {
    if (!DISPO || !DISPO.unita) return null;
    if (casa && DISPO.unita[casa]) return DISPO.unita[casa][s] || null;
    if (casa === "*") {  // "tutte": libero se almeno una casa e' libera
      var ks = Object.keys(DISPO.unita), any = false, known = false;
      for (var i = 0; i < ks.length; i++) { var v = DISPO.unita[ks[i]][s]; if (v) { known = true; if (v[0]) any = true; } }
      return known ? [any ? 1 : 0, null, 1, 1] : null;
    }
    return null;
  }
  function haDati(casa) { return !!(DISPO && DISPO.unita && (casa === "*" ? Object.keys(DISPO.unita).length : DISPO.unita[casa])); }
  function notteLibera(casa, s) { var v = info(casa, s); return !v || v[0] === 1; }
  function periodoLibero(casa, a, p) { for (var s = a; s < p; s = addDays(s, 1)) if (!notteLibera(casa, s)) return false; return true; }
  function totale(casa, a, p) {
    if (!casa || casa === "*" || !haDati(casa)) return null;
    var t = 0;
    for (var s = a; s < p; s = addDays(s, 1)) { var v = info(casa, s); if (!v || v[1] == null) return null; t += v[1]; }
    return t;
  }
  function minimo(casa, a) { var v = info(casa, a); return v ? v[2] || 1 : 1; }
  function primoOccupatoDopo(casa, a) {
    if (!haDati(casa)) return null;
    for (var s = addDays(a, 1), i = 0; i < 400; s = addDays(s, 1), i++) {
      var v = info(casa, s);
      if (!v) return null;          // oltre i dati disponibili: nessun limite noto
      if (!v[0]) return s;          // prima notte occupata: si puo' ancora partire quel giorno
    }
    return null;
  }

  function Cal(host, o) {
    this.host = host; this.o = o;
    var t = parse(o.a || today()); this.y = t.getFullYear(); this.m = t.getMonth();
    this.a = o.a || null; this.p = o.p || null; this.hover = null; this.msg = "";
    var self = this;
    host.addEventListener("click", function (e) {
      e.stopPropagation();  // il ridisegno stacca il bottone dal DOM: il "clic fuori" non deve chiudere il popup
      var b = e.target.closest("button"); if (!b || !host.contains(b)) return;
      if (b.hasAttribute("data-d")) { self.pick(b.getAttribute("data-d")); }
      else if (b.classList.contains("cal__prev")) { self.shift(-1); }
      else if (b.classList.contains("cal__next")) { self.shift(1); }
      else if (b.classList.contains("cal__clear")) { self.a = self.p = null; self.msg = ""; self.render(); o.onPick && o.onPick(null, null); }
      else if (b.classList.contains("cal__done")) { o.onDone && o.onDone(); }
      else if (b.classList.contains("cal__book")) { o.onBook && o.onBook(); }
    });
    host.addEventListener("mouseover", function (e) {
      var b = e.target.closest("[data-d]"); if (!b || !self.a || self.p) return;
      if (self.hover !== b.getAttribute("data-d")) { self.hover = b.getAttribute("data-d"); self.paintHover(); }
    });
    CALS.push(this);
    this.render();
  }
  Cal.prototype.mesi = function () { return (this.host.clientWidth || window.innerWidth) >= 600 ? (this.o.mesi || 2) : 1; };
  Cal.prototype.shift = function (n) {
    var min = parse(today()), t = new Date(this.y, this.m + n, 1, 12);
    if (t < new Date(min.getFullYear(), min.getMonth(), 1, 12)) return;
    this.y = t.getFullYear(); this.m = t.getMonth(); this.render();
    var nb = $(n > 0 ? ".cal__next" : ".cal__prev", this.host); nb && nb.focus();
  };
  Cal.prototype.set = function (a, p) { this.a = a; this.p = p; this.msg = ""; if (a) { var t = parse(a); this.y = t.getFullYear(); this.m = t.getMonth(); } this.render(); };
  Cal.prototype.pick = function (s) {
    var casa = this.o.casa, v = info(casa, s);
    this.msg = "";
    if (this.a && !this.p && s > this.a) {
      if (!periodoLibero(casa, this.a, s)) { this.msg = M.cal_occ; this.render(); return; }
      var mn = minimo(casa, this.a);
      if (nights(this.a, s) < mn) { this.msg = fmt(M.cal_min, { n: mn }); this.render(); return; }
      this.p = s; this.render();
      this.o.onPick && this.o.onPick(this.a, this.p);
      return;
    }
    if (v && !v[0]) { this.msg = M.cal_no_arr; this.render(); return; }
    if (v && !v[3]) { this.msg = M.cal_no_ci; this.render(); return; }
    this.a = s; this.p = null; this.hover = null; this.render();
    this.o.onPick && this.o.onPick(this.a, null);
  };
  Cal.prototype.paintHover = function () {
    var a = this.a, h = this.hover, lim = this.limite;
    $$(".cal__g", this.host).forEach(function (b) {
      var s = b.getAttribute("data-d");
      b.classList.toggle("is-hov", !!(a && h && s > a && s <= h && (!lim || s <= lim)));
    });
  };
  Cal.prototype.render = function () {
    var o = this.o, casa = o.casa, conDati = haDati(casa), mesi = this.mesi(), oggi = today();
    var loc = LANG === "it" ? "it-IT" : "en-GB";
    this.limite = (this.a && !this.p && conDati) ? primoOccupatoDopo(casa, this.a) : null;
    var dow = LANG === "it" ? ["L", "M", "M", "G", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"];
    var h = '<div class="cal' + (o.inline ? " cal--inline" : "") + '"><div class="cal__nav">' +
      '<button type="button" class="cal__prev" aria-label="' + M.cal_prec + '">‹</button><button type="button" class="cal__next" aria-label="' + M.cal_succ + '">›</button></div><div class="cal__mesi">';
    for (var k = 0; k < mesi; k++) {
      var first = new Date(this.y, this.m + k, 1, 12), ym = first.getMonth(), yy = first.getFullYear();
      var titolo = first.toLocaleDateString(loc, { month: "long", year: "numeric" });
      h += '<div class="cal__mese"><p class="cal__tit">' + titolo + '</p><div class="cal__dow">' + dow.map(function (x) { return "<span>" + x + "</span>"; }).join("") + '</div><div class="cal__griglia">';
      var off = (first.getDay() + 6) % 7;
      for (var i = 0; i < off; i++) h += '<span class="cal__vuoto"></span>';
      var dim = new Date(yy, ym + 1, 0).getDate();
      for (var g = 1; g <= dim; g++) {
        var s = iso(new Date(yy, ym, g, 12)), v = info(casa, s), cls = ["cal__g"], dis = false, lab = [];
        var fase2 = this.a && !this.p;
        if (s < oggi) { cls.push("is-past"); dis = true; }
        else if (fase2 && s > this.a) {
          if (this.limite && s > this.limite) { cls.push("is-oltre"); dis = true; }
          else if (v && !v[0]) { cls.push("is-co"); lab.push(M.cal_solo_partenza); }
          else if (v && v[0]) { cls.push("is-free"); }
        } else if (v) {
          if (!v[0]) { cls.push("is-occ"); lab.push(M.cal_occupato); }
          else if (!v[3]) { cls.push("is-noci"); lab.push(M.cal_no_ci); }
          else cls.push("is-free");
        }
        if (this.a === s) cls.push("is-a");
        if (this.p === s) cls.push("is-p");
        if (this.a && this.p && s > this.a && s < this.p) cls.push("is-in");
        if (s === oggi) cls.push("is-oggi");
        var prezzo = (o.prezzi && v && v[0] && v[1] != null && !dis) ? '<span class="cal__pz">' + (LANG === "it" ? v[1] : "€" + v[1]) + '</span>' : "";
        if (v && v[0] && v[1] != null) lab.push(euro(v[1]));
        h += '<button type="button" class="' + cls.join(" ") + '" data-d="' + s + '"' + (dis ? " disabled" : "") + ' aria-label="' + nice(s, true) + (lab.length ? ", " + lab.join(", ") : "") + '"' +
          (this.a === s || this.p === s ? ' aria-pressed="true"' : "") + '><span class="cal__n">' + g + "</span>" + prezzo + "</button>";
      }
      h += "</div></div>";
    }
    h += "</div>";
    // piede: legenda, stato, azioni
    var stato = "";
    if (this.msg) stato = '<p class="cal__msg is-err" role="alert">' + this.msg + "</p>";
    else if (this.a && this.p) {
      var n = nights(this.a, this.p), t = totale(casa, this.a, this.p);
      stato = '<p class="cal__msg"><b>' + nice(this.a) + " → " + nice(this.p) + "</b> · " + n + " " + (n === 1 ? M.notte : M.notti) + (t ? " · " + M.cal_tot + " <b>" + euro(t) + "</b>" : "") + "</p>";
    } else if (this.a) stato = '<p class="cal__msg">' + M.cal_scegli_p + (conDati && minimo(casa, this.a) > 1 ? " · " + fmt(M.cal_min_breve, { n: minimo(casa, this.a) }) : "") + "</p>";
    else stato = '<p class="cal__msg">' + M.cal_scegli_a + "</p>";
    var leg = conDati ? '<div class="cal__leg"><span><i class="lg-free"></i>' + M.cal_libero + '</span><span><i class="lg-occ"></i>' + M.cal_occupato + "</span>" + (o.prezzi ? '<span class="cal__leg-pz">' + M.cal_prezzi + "</span>" : "") + "</div>"
      : '<div class="cal__leg"><span class="cal__nodati">' + (o.nota || M.cal_nodati) + "</span></div>";
    var az = '<div class="cal__az"><button type="button" class="cal__clear">' + M.cal_cancella + "</button>" +
      (o.inline ? (o.onBook ? '<button type="button" class="btn btn--gold btn--sm cal__book"' + (this.a && this.p ? "" : " disabled") + ">" + M.cal_prenota + "</button>" : "") : '<button type="button" class="btn btn--sm cal__done">' + M.cal_chiudi + "</button>") + "</div>";
    h += '<div class="cal__foot">' + leg + stato + az + "</div>";
    if (DISPO && DISPO.aggiornato && conDati) h += '<p class="cal__agg">' + fmt(M.cal_agg, { t: new Date(DISPO.aggiornato).toLocaleString(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) }) + "</p>";
    h += "</div>";
    this.host.innerHTML = h;
    var min = parse(today()), prev = $(".cal__prev", this.host);
    if (prev && this.y === min.getFullYear() && this.m === min.getMonth()) prev.disabled = true;
    if (this.hover) this.paintHover();
  };
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { CALS.forEach(function (c) { if (c.host.offsetParent) c.render(); }); }, 200); });

  /* collega un calendario a popup a un modulo con campi data "finti" (bottoni) + input nascosti */
  function ospitiMax(f) { return +(f.getAttribute("data-max") || 0); }
  function casaDi(f) {
    var sel = $("select[name=casa]", f);
    if (sel) { var op = sel.options[sel.selectedIndex]; return op && op.getAttribute("data-dispo") ? op.value : (sel.value ? null : (f.hasAttribute("data-dispo-tutte") ? "*" : null)); }
    return f.getAttribute("data-dispo") || null;
  }
  function aggiornaCampi(f, a, p) {
    var ia = $("[name=arrivo]", f), ip = $("[name=partenza]", f);
    if (ia) ia.value = a || ""; if (ip) ip.value = p || "";
    $$("[data-v]", f).forEach(function (el) {
      var k = el.getAttribute("data-v"), val = k === "arrivo" ? a : p;
      el.textContent = val ? nice(val, true) : M.cal_aggiungi;
      el.parentNode.classList.toggle("is-set", !!val);
    });
    var tot = $(".js-tot", f), casa = casaDi(f);
    if (tot) {
      if (a && p) { var n = nights(a, p), t = totale(casa, a, p); tot.innerHTML = n + " " + (n === 1 ? M.notte : M.notti) + (t ? " · " + M.cal_tot + " <b>" + euro(t) + "</b>" : ""); }
      else tot.textContent = "";
    }
    if (a && p) { store.set("arrivo", a); store.set("partenza", p); }
    var msg = $(".js-msg", f); if (msg) msg.textContent = "";
  }
  function legaCalendario(f) {
    var pop = $(".calpop", f); if (!pop) return;
    var cal = null;
    function apri(campo) {
      $$(".calpop").forEach(function (x) { if (x !== pop) x.hidden = true; });
      pop.hidden = false; f.classList.add("cal-open");
      var a = $("[name=arrivo]", f).value || null, p = $("[name=partenza]", f).value || null, casa = casaDi(f);
      if (!cal) cal = new Cal(pop, { casa: casa, prezzi: !!casa && casa !== "*", a: a, p: p, nota: f.getAttribute("data-nota"),
        onPick: function (a2, p2) { aggiornaCampi(f, a2, p2); if (a2 && p2) setTimeout(chiudi, 350); },
        onDone: function () { chiudi(); } });
      cal.o.casa = casa; cal.o.prezzi = !!casa && casa !== "*";
      cal.set(a, p);
      if (campo === "partenza" && a) { cal.p = null; cal.render(); }
      var first = $(".cal__g.is-a, .cal__g.is-free, .cal__g:not([disabled])", pop); first && first.focus({ preventScroll: true });
      if (window.innerWidth < 700) d.body.classList.add("no-scroll");
      else setTimeout(function () { var r = pop.getBoundingClientRect(); if (r.bottom > window.innerHeight || r.top < 0) pop.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 30);
    }
    function chiudi() { pop.hidden = true; f.classList.remove("cal-open"); d.body.classList.remove("no-scroll"); }
    $$("[data-apri]", f).forEach(function (b) { b.addEventListener("click", function () { apri(b.getAttribute("data-apri")); }); });
    d.addEventListener("click", function (e) { if (!pop.hidden && e.target.isConnected && !f.contains(e.target)) chiudi(); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pop.hidden) chiudi(); });
    var sel = $("select[name=casa]", f);
    if (sel) sel.addEventListener("change", function () { if (cal) { cal.o.casa = casaDi(f); cal.o.prezzi = !!cal.o.casa && cal.o.casa !== "*"; cal.render(); } aggiornaCampi(f, $("[name=arrivo]", f).value, $("[name=partenza]", f).value); });
    f._cal = function () { return cal; };
    f._set = function (a, p) { aggiornaCampi(f, a, p); if (cal) cal.set(a, p); };
  }

  /* ---------- prenotazione */
  function octoUrl(oc, v) {
    var c = oc.split("|"), base = "https://book.octorate.com/octobook/site/reservation/", lang = LANG.toUpperCase();
    if (v.arrivo && v.partenza) return base + "result.xhtml?checkin=" + v.arrivo + "&checkout=" + v.partenza + "&pax=" + (v.ospiti || 2) + "&codice=" + c[0] + "&room=" + c[1] + "&lang=" + lang;
    return base + "calendar.xhtml?codice=" + c[0] + "&room=" + c[1] + "&lang=" + lang;
  }
  function values(f) {
    var g = function (n) { var el = $("[name=" + n + "]", f); return el ? el.value : ""; };
    return { arrivo: g("arrivo"), partenza: g("partenza"), ospiti: g("ospiti"), casa: g("casa") };
  }
  function errore(f, t) { var m = $(".js-msg", f); if (m) m.textContent = t; }
  var q = new URLSearchParams(location.search);

  $$("form[data-book]").forEach(function (f) {
    legaCalendario(f);
    var sa = q.get("arrivo") || store.get("arrivo"), sp = q.get("partenza") || store.get("partenza"), so = q.get("ospiti") || store.get("ospiti");
    if (sa && sp && sa >= today() && sp > sa) aggiornaCampi(f, sa, sp); else aggiornaCampi(f, null, null);
    var o = $("[name=ospiti]", f);
    if (o && so && $$("option", o).some(function (x) { return x.value === so; })) o.value = so;
    if (o) o.addEventListener("change", function () { store.set("ospiti", o.value); var mx = ospitiMax(f); errore(f, mx && +o.value > mx ? fmt(M.troppi, { n: mx }) : ""); });
    var casaSel = $("select[name=casa]", f);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = values(f), mode = f.getAttribute("data-book"), casa = casaDi(f);
      if (!v.arrivo || !v.partenza) { errore(f, M.err_date); var b = $("[data-apri=arrivo]", f); b && b.click(); return; }
      if (casa && casa !== "*" && haDati(casa) && !periodoLibero(casa, v.arrivo, v.partenza)) { errore(f, M.cal_occ); return; }
      if (mode === "cerca") {
        if (!v.casa) { location.href = f.getAttribute("action") + "?arrivo=" + v.arrivo + "&partenza=" + v.partenza + "&ospiti=" + v.ospiti + "#elenco"; return; }
        var opt = casaSel.options[casaSel.selectedIndex];
        if (!opt.getAttribute("data-oc")) { window.open(waUrl(fmt(M.wa_pren, { casa: opt.getAttribute("data-nome") || opt.textContent, arrivo: itDate(v.arrivo), partenza: itDate(v.partenza), ospiti: v.ospiti || 2 })), "_blank", "noopener"); return; }
        window.open(octoUrl(opt.getAttribute("data-oc"), v), "_blank", "noopener"); return;
      }
      if (mode === "wa") { window.open(waUrl(fmt(M.wa_pren, { casa: f.getAttribute("data-nome"), arrivo: itDate(v.arrivo), partenza: itDate(v.partenza), ospiti: v.ospiti || 2 })), "_blank", "noopener"); return; }
      window.open(octoUrl(f.getAttribute("data-oc"), v), "_blank", "noopener");
    });
    $$("[data-wa]", f).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var v = values(f), nome = f.getAttribute("data-nome") || M.una_delle;
        var msg = (v.arrivo && v.partenza) ? fmt(M.wa_pren, { casa: nome, arrivo: itDate(v.arrivo), partenza: itDate(v.partenza), ospiti: v.ospiti || 2 }) : fmt(M.wa_info, { casa: nome });
        window.open(waUrl(msg), "_blank", "noopener");
      });
    });
  });

  /* calendario in pagina (sezione "Disponibilita'") collegato al modulo di prenotazione */
  $$("[data-cal-inline]").forEach(function (host) {
    var f = d.getElementById(host.getAttribute("data-form"));
    var c = new Cal(host, { inline: true, casa: host.getAttribute("data-casa") || null, prezzi: true, nota: host.getAttribute("data-nota"),
      a: f ? $("[name=arrivo]", f).value || null : null, p: f ? $("[name=partenza]", f).value || null : null,
      onPick: function (a, p) { if (f && f._set) { aggiornaCampi(f, a, p); var pc = f._cal && f._cal(); if (pc) pc.set(a, p); } },
      onBook: function () { if (f) { if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event("submit", { cancelable: true })); } } });
    host._c = c;
  });

  /* elenco case: segna quelle libere e adatte per le date cercate */
  function segnaElenco() {
    var el = $("#elenco"); if (!el) return;
    var qa = q.get("arrivo") || store.get("arrivo"), qp = q.get("partenza") || store.get("partenza"), qo = +(q.get("ospiti") || store.get("ospiti") || 0);
    $$("[data-casa]", el).forEach(function (c) {
      var id = c.getAttribute("data-casa"), max = +c.getAttribute("data-max") || 99, oc = c.getAttribute("data-oc"), ok = true, badge = $(".js-disp", c), testo = "";
      if (qo && qo > max) { ok = false; testo = fmt(M.troppi, { n: max }); }
      if (qa && qp && qp > qa) {
        if (haDati(id)) {
          if (periodoLibero(id, qa, qp)) { var t = totale(id, qa, qp); if (ok) testo = M.disp_si + (t ? " · " + euro(t) : ""); }
          else { ok = false; testo = M.disp_no; }
        }
        var bt = $(".js-octo", c); if (bt && oc) bt.href = octoUrl(oc, { arrivo: qa, partenza: qp, ospiti: qo || 2 });
      }
      c.classList.toggle("is-no", !ok && !!(qo || (qa && qp)));
      c.classList.toggle("is-ok", ok && !!testo);
      if (badge) { badge.textContent = testo; badge.hidden = !testo; }
    });
  }

  /* dati di disponibilita': file JS pubblicato dal server (il server nega i .json) */
  function caricaDispo() {
    var s = d.createElement("script");
    s.src = root + "dati/disponibilita.js?t=" + Math.floor(Date.now() / 6e5);
    s.onload = function () { DISPO = window.DISPO || null; CALS.forEach(function (c) { c.render(); }); $$("form[data-book]").forEach(function (f) { aggiornaCampi(f, $("[name=arrivo]", f).value, $("[name=partenza]", f).value); }); segnaElenco(); };
    s.onerror = function () { segnaElenco(); };
    d.body.appendChild(s);
  }
  caricaDispo();

  /* ---------- modulo contatti -> WhatsApp o email */
  var cf = $("#contatto");
  if (cf) {
    legaCalendario(cf); aggiornaCampi(cf, null, null);
    function testo() {
      var g = function (n) { var el = $("[name=" + n + "]", cf); return el ? el.value.trim() : ""; };
      var righe = [cf.getAttribute("data-intro")];
      if (g("nome")) righe.push(cf.getAttribute("data-l-nome") + ": " + g("nome"));
      if (g("casa")) righe.push(cf.getAttribute("data-l-casa") + ": " + g("casa"));
      if (g("arrivo")) righe.push(cf.getAttribute("data-l-date") + ": " + itDate(g("arrivo")) + (g("partenza") ? " → " + itDate(g("partenza")) : ""));
      if (g("ospiti")) righe.push(cf.getAttribute("data-l-ospiti") + ": " + g("ospiti"));
      if (g("messaggio")) righe.push("", g("messaggio"));
      return righe.join("\n");
    }
    cf.addEventListener("submit", function (e) { e.preventDefault(); if (!cf.reportValidity()) return; window.open(waUrl(testo()), "_blank", "noopener"); });
    var em = $("#contatto-mail");
    if (em) em.addEventListener("click", function (e) {
      e.preventDefault(); if (!cf.reportValidity()) return;
      location.href = "mailto:" + em.getAttribute("data-mail") + "?subject=" + encodeURIComponent(cf.getAttribute("data-oggetto")) + "&body=" + encodeURIComponent(testo());
    });
  }

  /* ---------- filtri del blog */
  var fb = $$(".filtri button");
  fb.forEach(function (b) {
    b.addEventListener("click", function () {
      var cat = b.getAttribute("data-cat");
      fb.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      $$(".posts--blog .post").forEach(function (p) { p.hidden = !(cat === "*" || p.getAttribute("data-cat") === cat); });
    });
  });
})();
