/* ============================================================================
   reference.js — the six clinical reference / decision-support tools, rendered
   client-side from window.TMREF (data) + window.TMENGINE (logic).
   Reference only: no case logging, no patient data is stored or transmitted.
   ============================================================================ */
(function () {
  "use strict";
  var REF = window.TMREF || {}, ENG = window.TMENGINE;

  /* ---------------- helpers ---------------- */
  function el(tag, attrs) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k === "text") n.textContent = v;
      else if (k === "on" && typeof v === "object") { for (var e in v) n.addEventListener(e, v[e]); }
      else if (k === "dataset") { for (var d in v) n.dataset[d] = v[d]; }
      else n.setAttribute(k, v);
    }
    for (var i = 2; i < arguments.length; i++) append(n, arguments[i]);
    return n;
  }
  function append(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(n, x); }); return; }
    n.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
  function toast(msg, isErr) {
    var t = el("div", { class: "ref-toast" + (isErr ? " err" : ""), text: msg });
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("in"); });
    setTimeout(function () { t.classList.remove("in"); setTimeout(function () { t.remove(); }, 300); }, 1900);
  }
  function copyText(text) {
    function ok() { toast("Copied to clipboard"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else fallback();
    function fallback() {
      var ta = el("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { toast("Copy failed", true); }
      ta.remove();
    }
  }
  function seg(options, value, onPick) {
    var wrap = el("div", { class: "seg" });
    options.forEach(function (o) {
      var b = el("button", { class: "seg-btn" + (o.value === value ? " sel" : ""), type: "button",
        on: { click: function () {
          wrap.querySelectorAll(".seg-btn").forEach(function (x) { x.classList.remove("sel"); });
          b.classList.add("sel"); onPick(o.value);
        } } }, o.label);
      wrap.appendChild(b);
    });
    return wrap;
  }
  function selectEl(options, value, onChange) {
    var s = el("select", { class: "ref-select", on: { change: function () { onChange(s.value); } } });
    options.forEach(function (o) {
      var ov = typeof o === "string" ? o : o.value, ol = typeof o === "string" ? o : o.label;
      var opt = el("option", { value: ov }, ol); if (ov === value) opt.selected = true; s.appendChild(opt);
    });
    return s;
  }
  function field(label, input, help) {
    return el("label", { class: "ref-field" }, el("span", { class: "ref-field-l" }, label), input,
      help ? el("span", { class: "ref-field-h" }, help) : null);
  }
  var SEV_DOT = { good: "✓", info: "•", warn: "▲", bad: "■" };

  /* ============================================================================
     GENERIC PANEL TOOL  (Platelet approval + Transfusion-reaction workup)
     ============================================================================ */
  function renderPanel(mount, panel) {
    var selections = {}, context = {};
    (panel.analytes || []).forEach(function (a) { selections[a.id] = ENG.analyteDefault(a); });
    (panel.context_questions || []).forEach(function (q) {
      context[q.id] = (q.default != null) ? q.default : (q.type === "yesno" ? "unknown" : "");
    });

    var report = el("div", { class: "ref-report surface" });
    var grid = el("div", { class: "ref-grid" });
    var controls = el("div", { class: "ref-controls" });
    grid.appendChild(controls); grid.appendChild(report);
    clear(mount); mount.appendChild(grid);

    var run = debounce(function () {
      var r = ENG.interpret(panel, selections, context, []);
      renderReport(report, panel, r);
    }, 120);

    /* context questions */
    if (panel.context_questions && panel.context_questions.length) {
      var ctxCard = el("div", { class: "surface ref-card" }, el("h4", {}, "Clinical context"));
      panel.context_questions.forEach(function (q) {
        var input;
        if (q.type === "yesno") {
          input = seg([{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unknown", label: "?" }],
            context[q.id], function (v) { context[q.id] = v; run(); });
        } else if (q.type === "select") {
          input = selectEl(q.options || [], context[q.id], function (v) { context[q.id] = v; run(); });
        } else {
          input = el("input", { class: "ref-input", type: "text", value: context[q.id] || "",
            on: { input: function () { context[q.id] = input.value; run(); } } });
        }
        ctxCard.appendChild(field(q.label, input, q.help));
      });
      controls.appendChild(ctxCard);
    }

    /* analytes grouped */
    ENG.groupsOf(panel).forEach(function (g) {
      var card = el("div", { class: "surface ref-card" }, g ? el("h4", {}, g) : null);
      (panel.analytes || []).filter(function (a) { return (a.group || "") === g; }).forEach(function (a) {
        var row = el("div", { class: "analyte-row" });
        row.appendChild(el("div", { class: "analyte-name" }, a.name,
          a.ref ? el("span", { class: "analyte-ref" }, a.ref) : null,
          a.help ? el("span", { class: "analyte-help" }, a.help) : null));
        var btns = el("div", { class: "state-btns" });
        (a.states || []).forEach(function (st) {
          var b = el("button", { class: "state-btn k-" + st.kind + (selections[a.id] === st.value ? " sel" : ""), type: "button",
            on: { click: function () {
              selections[a.id] = st.value;
              btns.querySelectorAll(".state-btn").forEach(function (x) { x.classList.remove("sel"); });
              b.classList.add("sel"); run();
            } } }, st.label);
          btns.appendChild(b);
        });
        row.appendChild(btns);
        card.appendChild(row);
      });
      controls.appendChild(card);
    });

    var first = ENG.interpret(panel, selections, context, []);
    renderReport(report, panel, first);
  }

  function renderReport(host, panel, r) {
    clear(host);
    host.appendChild(el("div", { class: "ref-report-head" },
      el("span", { class: "kicker" }, "Interpretation"),
      el("button", { class: "btn btn--ghost btn--sm", type: "button",
        on: { click: function () { copyText(r.report_text); } } }, "Copy report")));

    var meaningful = r.findings.length || r.context_lines.length ||
      (r.impressions.length && r.impressions[0].rule_id !== "_fallback_normal");
    if (!meaningful && !r.normal_limits.length) {
      host.appendChild(el("p", { class: "muted-note" }, "Click the results on the left and the interpretation builds here."));
      host.appendChild(el("p", { class: "ref-disclaimer" }, panel.disclaimer || ""));
      return;
    }
    if (r.context_lines.length) host.appendChild(section("Clinical context", r.context_lines));
    var findHost = el("div", { class: "ref-sec" }, el("h5", {}, "Findings"));
    var ul = el("ul", { class: "ref-list" });
    if (r.findings.length) r.findings.forEach(function (f) { ul.appendChild(el("li", {}, f.text)); });
    else ul.appendChild(el("li", { class: "muted-note" }, "No abnormal results entered."));
    findHost.appendChild(ul);
    if (r.normal_limits.length) findHost.appendChild(el("p", { class: "ref-wnl" }, "Within normal limits: " + r.normal_limits.join(", ") + "."));
    host.appendChild(findHost);

    var impHost = el("div", { class: "ref-sec" }, el("h5", {}, "Impression"));
    if (r.impressions.length) r.impressions.forEach(function (imp) {
      impHost.appendChild(el("div", { class: "imp-line " + (imp.severity || "info") },
        el("span", { class: "imp-dot" }, SEV_DOT[imp.severity] || "•"), imp.text));
    });
    host.appendChild(impHost);

    if (r.recommendations.length) host.appendChild(section("Suggested next steps", r.recommendations));
    if (r.caveats.length) host.appendChild(section("Caveats / pre-analytic notes", r.caveats));
    host.appendChild(el("p", { class: "ref-disclaimer" }, panel.disclaimer || ""));
  }
  function section(title, items) {
    var s = el("div", { class: "ref-sec" }, el("h5", {}, title));
    var ul = el("ul", { class: "ref-list" });
    items.forEach(function (it) { ul.appendChild(el("li", {}, it)); });
    s.appendChild(ul); return s;
  }

  /* ============================================================================
     TRANSFUSION-REACTION REFERENCE CATALOG  (transfusion_reactions.json)
     ============================================================================ */
  function renderTxnCatalog(mount) {
    var data = REF.txn || {}, reactions = data.reactions || [];
    var box = el("div", {});
    var searchWrap = el("div", { class: "search" },
      el("span", { class: "muted-note", text: "Search" }));
    var input = el("input", { type: "search", placeholder: "Search reactions — fever, TRALI, hemolytic, IgA…", "aria-label": "Search transfusion reactions" });
    searchWrap.appendChild(input);
    var list = el("div", { class: "txn-list" });
    box.appendChild(searchWrap); box.appendChild(list);
    clear(mount); mount.appendChild(box);

    function draw(q) {
      clear(list);
      q = (q || "").trim().toLowerCase();
      var rows = reactions.filter(function (x) {
        if (!q) return true;
        var hay = (x.name + " " + (x.category || "") + " " + (x.definition || "") + " " + (x.signs || []).join(" ")).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      if (!rows.length) { list.appendChild(el("p", { class: "muted-note" }, "No reactions match “" + q + "”.")); return; }
      rows.forEach(function (x) {
        var d = el("details", { class: "acc" });
        var sum = el("summary", {}, el("strong", {}, x.name),
          x.acuity ? el("span", { class: "tag tag--adv", style: "margin-left:8px" }, x.acuity) : null,
          el("span", { class: "chev" }));
        d.appendChild(sum);
        var body = el("div", { class: "acc-body" });
        if (x.onset || x.frequency) body.appendChild(el("p", { class: "muted-note" },
          [x.onset ? "Onset: " + x.onset : "", x.frequency ? "Frequency: " + x.frequency : ""].filter(Boolean).join(" · ")));
        if (x.definition) body.appendChild(el("p", {}, x.definition));
        kvBlock(body, "Signs / symptoms", x.signs);
        kvLine(body, "Mechanism", x.mechanism);
        kvLine(body, "Workup", x.workup);
        kvLine(body, "Management", x.management);
        kvLine(body, "Prevention", x.prevention);
        d.appendChild(body);
        list.appendChild(d);
      });
    }
    function kvLine(host, label, val) { if (val) host.appendChild(el("p", {}, el("strong", {}, label + ": "), Array.isArray(val) ? val.join("; ") : val)); }
    function kvBlock(host, label, arr) {
      if (!arr || !arr.length) return;
      host.appendChild(el("p", {}, el("strong", {}, label + ":")));
      var ul = el("ul", { class: "ref-list" }); arr.forEach(function (s) { ul.appendChild(el("li", {}, s)); }); host.appendChild(ul);
    }
    input.addEventListener("input", debounce(function () { draw(input.value); }, 140));
    draw("");
  }

  /* ============================================================================
     ASFA GUIDELINES  (searchable indications + protocol detail)
     ============================================================================ */
  function renderAsfa(mount) {
    var ind = REF.asfaInd || {}, proto = (REF.asfaProto || {}).protocols || {};
    var indications = ind.indications || [], catDefs = ind.category_defs || {}, gradeDefs = ind.grade_defs || {};
    var state = { q: "", cat: "" };

    var box = el("div", {});
    var legend = el("details", { class: "acc", style: "margin-bottom:14px" },
      el("summary", {}, "ASFA category & grade definitions", el("span", { class: "chev" })));
    var lbody = el("div", { class: "acc-body" });
    Object.keys(catDefs).forEach(function (k) { lbody.appendChild(el("p", {}, el("strong", {}, "Category " + k + ": "), catDefs[k])); });
    Object.keys(gradeDefs).forEach(function (k) { lbody.appendChild(el("p", { class: "muted-note" }, el("strong", {}, "Grade " + k + ": "), gradeDefs[k])); });
    legend.appendChild(lbody); box.appendChild(legend);

    var tools = el("div", { class: "quiz-toolbar" });
    var chips = el("div", { class: "filter-chips" });
    [{ v: "", l: "All" }, { v: "I", l: "I" }, { v: "II", l: "II" }, { v: "III", l: "III" }, { v: "IV", l: "IV" }].forEach(function (c) {
      var b = el("button", { class: "chip" + (c.v === state.cat ? " is-active" : ""), type: "button",
        on: { click: function () { state.cat = c.v; chips.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("is-active"); }); b.classList.add("is-active"); draw(); } } }, c.l);
      chips.appendChild(b);
    });
    var count = el("span", { class: "muted-note", style: "margin-left:auto" });
    tools.appendChild(chips); tools.appendChild(count);
    var searchWrap = el("div", { class: "search", style: "margin-bottom:12px" }, el("span", { class: "muted-note", text: "Search" }));
    var input = el("input", { type: "search", placeholder: "Search disease, indication, or procedure — TTP, Guillain-Barré, TPE…", "aria-label": "Search ASFA indications" });
    searchWrap.appendChild(input);
    box.appendChild(searchWrap); box.appendChild(tools);

    var wrap = el("div", { class: "table-wrap" });
    var table = el("table", { class: "cmp asfa-table" });
    table.appendChild(el("thead", {}, el("tr", {}, ["Disease / condition", "Indication", "Procedure", "Cat", "Grade"].map(function (h) { return el("th", {}, h); }))));
    var tbody = el("tbody"); table.appendChild(tbody); wrap.appendChild(table); box.appendChild(wrap);
    box.appendChild(el("p", { class: "muted-note", style: "margin-top:10px" },
      "Source: " + (ind.source || "ASFA Special Issue") + " — transcribed for quick reference; verify against the source before clinical use."));
    clear(mount); mount.appendChild(box);

    function draw() {
      clear(tbody);
      var q = state.q;
      var rows = indications.filter(function (r) {
        if (state.cat && r.category !== state.cat) return false;
        if (q && (r.disease + " " + (r.indication || "") + " " + r.procedure).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      count.textContent = rows.length + " indication(s)";
      rows.forEach(function (r) {
        var tr = el("tr", { class: "asfa-row" });
        tr.appendChild(el("td", {}, r.disease));
        tr.appendChild(el("td", {}, r.indication || "—"));
        tr.appendChild(el("td", {}, r.procedure));
        tr.appendChild(el("td", {}, el("span", { class: "asfa-cat cat-" + r.category, title: catDefs[r.category] || "" }, r.category)));
        tr.appendChild(el("td", {}, el("span", { class: "pill", title: gradeDefs[r.grade] || "" }, r.grade)));
        var open = false, detail = null;
        tr.addEventListener("click", function () {
          if (open) { if (detail) detail.remove(); open = false; return; }
          var p = proto[r.disease] || null;
          detail = el("tr", { class: "asfa-detail" });
          var td = el("td", { colspan: "5" });
          if (p) {
            kv(td, "Volume treated", p.volume); kv(td, "Replacement fluid", p.replacement);
            kv(td, "Frequency", p.frequency); kv(td, "Duration / number", p.num_procedures);
          } else td.appendChild(el("p", { class: "muted-note" }, "No prescription details on file for this disease."));
          detail.appendChild(td);
          tr.parentNode.insertBefore(detail, tr.nextSibling); open = true;
        });
        tbody.appendChild(tr);
      });
    }
    function kv(host, label, val) { if (val) host.appendChild(el("p", {}, el("strong", {}, label + ": "), val)); }
    input.addEventListener("input", debounce(function () { state.q = input.value.trim().toLowerCase(); draw(); }, 140));
    draw();
  }

  /* boot the four tools defined in this file (the rest are in reference2.js) */
  function boot() {
    if (!ENG) { console.error("TMENGINE missing"); return; }
    var p = document.getElementById("ref-platelet"); if (p && REF.plateletPanel) renderPanel(p, REF.plateletPanel);
    var t = document.getElementById("ref-txnreact"); if (t && REF.tmPanel) renderPanel(t, REF.tmPanel);
    var tc = document.getElementById("ref-txncatalog"); if (tc) renderTxnCatalog(tc);
    var a = document.getElementById("ref-asfa"); if (a) renderAsfa(a);
  }
  window.TMREFUI = { el: el, append: append, clear: clear, debounce: debounce, toast: toast,
    copyText: copyText, seg: seg, selectEl: selectEl, field: field };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
