/* ============================================================================
   reference2.js — Blood-for-the-OR (MSBOS), Antibody panel ID, Therapeutic
   apheresis. Uses helpers from window.TMREFUI and logic from window.TMENGINE.
   Reference only — composers build copy-ready note skeletons; nothing is stored.
   ============================================================================ */
(function () {
  "use strict";
  var RUI = window.TMREFUI, REF = window.TMREF || {}, ENG = window.TMENGINE;
  if (!RUI) { console.error("TMREFUI missing"); return; }
  var el = RUI.el, clear = RUI.clear, debounce = RUI.debounce, copyText = RUI.copyText,
      seg = RUI.seg, selectEl = RUI.selectEl, field = RUI.field;

  function copyArea(getText) {
    var ta = el("textarea", { class: "copyarea", readonly: "readonly", rows: "14" });
    var btn = el("button", { class: "btn btn--ghost btn--sm", type: "button",
      on: { click: function () { copyText(ta.value); } } }, "Copy note");
    function refresh() { ta.value = getText(); }
    return { node: el("div", { class: "ref-note" },
      el("div", { class: "ref-report-head" }, el("span", { class: "kicker" }, "Copy-ready note"), btn), ta),
      refresh: refresh, ta: ta };
  }

  /* ============================================================================
     TOOL 1 — PREPARE BLOOD FOR THE OR  (HFHS MSBOS)
     ============================================================================ */
  function renderBloodPrep(mount) {
    var bp = REF.bloodprep || {};
    var surgeries = bp.surgeries || [], antigens = bp.antigens || [],
        hgbBands = bp.hgb_bands || [], races = bp.races || [];
    // Donor-population frequencies are standardized on the White donor pool.
    var state = { surgery_id: "", hgb: "", race: "white", recipient_abo: "", antibodies: {}, surgQ: "", surgDiv: "" };

    function normDiv(s) { s = (s || "").trim(); return /^cardio/i.test(s) ? "Cardiac" : s; }
    var divisions = {};
    surgeries.forEach(function (s) { (s.division || "").split(",").forEach(function (d) { d = normDiv(d); if (d) divisions[d] = 1; }); });
    var divList = Object.keys(divisions).sort();

    var grid = el("div", { class: "ref-grid" });
    var controls = el("div", { class: "ref-controls" });
    var result = el("div", { class: "ref-report surface" });
    grid.appendChild(controls); grid.appendChild(result);
    clear(mount); mount.appendChild(grid);

    var run = debounce(function () {
      var r = ENG.bloodprepCompute({ surgery_id: state.surgery_id, hgb: state.hgb, race: state.race,
        recipient_abo: state.recipient_abo, antibodies: Object.keys(state.antibodies) });
      renderResult(r);
    }, 60);

    /* --- surgery picker --- */
    var surgCard = el("div", { class: "surface ref-card" }, el("h4", {}, "Surgery — HFHS blood ordering schedule (MSBOS)"));
    var selBadge = el("div", { class: "surg-selected muted-note" }, "No surgery selected.");
    var divChips = el("div", { class: "filter-chips", style: "margin:8px 0" });
    [""].concat(divList).forEach(function (d) {
      var b = el("button", { class: "chip" + (d === state.surgDiv ? " is-active" : ""), type: "button",
        on: { click: function () { state.surgDiv = d; divChips.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("is-active"); }); b.classList.add("is-active"); drawSurg(); } } }, d || "All divisions");
      divChips.appendChild(b);
    });
    var surgSearch = el("input", { class: "ref-input", type: "search", placeholder: "Search procedure — craniotomy, CABG, hysterectomy, liver transplant…" });
    var surgResults = el("div", { class: "surg-results" });
    var genBtn = el("button", { class: "btn btn--ghost btn--sm", type: "button", style: "margin-top:8px",
      on: { click: function () { pickSurgery("ts_generic"); } } }, "Not listed? use generic low-risk baseline (T&S)");
    surgCard.appendChild(selBadge); surgCard.appendChild(divChips); surgCard.appendChild(surgSearch);
    surgCard.appendChild(surgResults); surgCard.appendChild(genBtn);
    controls.appendChild(surgCard);

    function orderTag(s) {
      if (s.approach === "none") return el("span", { class: "ord-tag" }, "No sample");
      if (s.approach === "ts") return el("span", { class: "ord-tag" }, "T&S");
      return el("span", { class: "ord-tag" + (s.units >= 4 ? " hi" : "") }, "×" + s.units + "u");
    }
    function pickSurgery(id) {
      state.surgery_id = id;
      var s = surgeries.filter(function (x) { return x.id === id; })[0];
      clear(selBadge);
      if (s) { selBadge.className = "surg-selected"; selBadge.appendChild(el("strong", {}, s.name)); selBadge.appendChild(orderTag(s)); }
      else { selBadge.className = "surg-selected muted-note"; selBadge.textContent = "No surgery selected."; }
      run();
    }
    function drawSurg() {
      clear(surgResults);
      var q = state.surgQ.trim().toLowerCase(), div = state.surgDiv;
      if (!q && !div) { surgResults.appendChild(el("p", { class: "muted-note" }, "Type to search, or pick a division above.")); return; }
      var rows = surgeries.filter(function (s) {
        if (s.id === "ts_generic") return false;
        if (div && (s.division || "").split(",").map(normDiv).indexOf(div) === -1) return false;
        if (q && s.name.toLowerCase().indexOf(q) === -1) return false;
        return true;
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      var capped = rows.slice(0, 80);
      capped.forEach(function (s) {
        surgResults.appendChild(el("button", { class: "surg-row", type: "button", on: { click: function () { pickSurgery(s.id); } } },
          el("span", {}, s.name), orderTag(s)));
      });
      if (rows.length > 80) surgResults.appendChild(el("p", { class: "muted-note" }, "+" + (rows.length - 80) + " more — refine your search."));
      if (!rows.length) surgResults.appendChild(el("p", { class: "muted-note" }, "No procedures match."));
    }
    surgSearch.addEventListener("input", debounce(function () { state.surgQ = surgSearch.value; drawSurg(); }, 110));
    drawSurg();

    /* --- hemoglobin + race --- */
    var ctxCard = el("div", { class: "surface ref-card" }, el("h4", {}, "Patient context"));
    ctxCard.appendChild(field("Most recent hemoglobin", seg(hgbBands.map(function (h) { return { value: h.value, label: h.label }; }), state.hgb, function (v) { state.hgb = v; run(); })));
    ctxCard.appendChild(field("Donor population", el("div", { style: "font-weight:600; padding:4px 0" }, "White / Caucasian"), "Antigen-negative and ABO donor frequencies are based on the White donor population."));
    var aboGroups = (REF.abo && REF.abo.groups) || [{ value: "", label: "Unknown" }];
    ctxCard.appendChild(field("Recipient ABO group (for ABO-compatible donor pool)", seg(aboGroups.map(function (g) { return { value: g.value, label: g.label }; }), state.recipient_abo, function (v) { state.recipient_abo = v; run(); }), "Antigen-negative frequency is ABO-independent; this shrinks the random-donor pool only."));
    controls.appendChild(ctxCard);

    /* --- antibodies --- */
    var abCard = el("div", { class: "surface ref-card" }, el("h4", {}, "Known alloantibodies"),
      el("p", { class: "muted-note", style: "margin-bottom:6px" }, "Select any identified antibodies — the tool computes antigen-negative requirements and donor screening burden."));
    var systems = {};
    antigens.forEach(function (a) { (systems[a.system] = systems[a.system] || []).push(a); });
    Object.keys(systems).forEach(function (sys) {
      var grp = el("div", { class: "ab-group" }, el("div", { class: "ab-sys" }, sys));
      systems[sys].forEach(function (a) {
        var b = el("button", { class: "ab-btn", type: "button", on: { click: function () {
          if (state.antibodies[a.code]) delete state.antibodies[a.code]; else state.antibodies[a.code] = 1;
          b.classList.toggle("sel"); run();
        } } }, a.name.replace("Anti-", "Anti-"), el("span", { class: "ab-meta" }, ENG.fmtPct(Math.min(a.neg ? a.neg.white : 0, a.neg ? a.neg.black : 0)) + (a.significant ? "" : " · minor")));
        grp.appendChild(b);
      });
      abCard.appendChild(grp);
    });
    controls.appendChild(abCard);

    function renderResult(r) {
      clear(result);
      var sev = r.flags.length ? "bad" : (r.units_to_prepare > 0 ? "warn" : "good");
      result.appendChild(el("div", { class: "ref-report-head" },
        el("span", { class: "kicker" }, "Recommendation"),
        el("button", { class: "btn btn--ghost btn--sm", type: "button", on: { click: function () { copyText(r.report_text); } } }, "Copy report")));
      result.appendChild(el("div", { class: "bp-headline " + sev }, r.approach));
      if (r.units_to_prepare > 0) {
        var stats = el("div", { class: "bp-stats" });
        var items = [["Units to prepare", r.units_to_prepare], ["Antigen-neg to screen", r.units_to_screen == null ? "—" : r.units_to_screen]];
        if (r.donors_to_reach != null) items.push(["Random donors to reach", r.donors_to_reach]);
        items.push(["Antigen-neg freq", r.combined_compatible_pct + "%"]);
        items.forEach(function (p) {
          stats.appendChild(el("div", { class: "bp-stat" }, el("strong", {}, String(p[1])), el("span", {}, p[0])));
        });
        result.appendChild(stats);
      }
      if (r.flags.length) result.appendChild(listSec("⚠ Flags", r.flags, "flag"));
      result.appendChild(listSec("Recommendation", r.recommendations));
      if (r.antibodies.length) {
        var s = el("div", { class: "ref-sec" }, el("h5", {}, "Antibodies"));
        var ul = el("ul", { class: "ref-list" });
        r.antibodies.forEach(function (a) { ul.appendChild(el("li", {}, a.name + " (" + a.system + ") — ~" + ENG.fmtPct(a.compatible_pct) + " antigen-negative" + (a.significant ? "" : " · usually not significant"))); });
        s.appendChild(ul); result.appendChild(s);
      }
      result.appendChild(listSec("Basis", r.findings));
      if (r.caveats.length) result.appendChild(listSec("Notes", r.caveats));
      result.appendChild(el("p", { class: "ref-disclaimer" }, "Decision support only. MSBOS is institution-specific; antigen frequencies are population estimates. The blood bank remains the final decision-maker."));
    }
    function listSec(title, items, cls) {
      var s = el("div", { class: "ref-sec" + (cls ? " " + cls : "") }, el("h5", {}, title));
      var ul = el("ul", { class: "ref-list" }); items.forEach(function (it) { ul.appendChild(el("li", {}, it)); }); s.appendChild(ul); return s;
    }
    run();
  }

  /* ============================================================================
     TOOL 2 — ANTIBODY PANEL IDENTIFICATION  (workup composer + method reference)
     ============================================================================ */
  var ANTIBODY_FIELDS = [
    ["indication", "Indication", "text", "positive antibody screen on T&S · pre-op · HDFN / prenatal · transfusion reaction"],
    ["screen", "Screen & panel reactivity", "textarea", "Screen cells reactive (I / II / III); panel pattern by phase (IS / 37 °C / AHG) and strength (w+ – 4+); enzyme / PEG if used"],
    ["antibodies", "Antibody(ies) identified", "text", "e.g., anti-E, anti-K · pan-reactive · no specificity (rule-outs incomplete)"],
    ["autocontrol_dat", "Autocontrol / DAT", "text", "Autocontrol pos/neg; DAT poly / IgG / C3; eluate result if performed"],
    ["units", "Units / compatibility", "text", "# antigen-negative, crossmatch-compatible units; phenotype-matched?"],
    ["significance", "Clinical significance & disposition", "textarea", "Clinically significant? risk of HTR / HDFN; antigen-negative requirement; clinical team notified"],
    ["teaching", "Teaching point", "textarea", "the high-yield point for the file"]
  ];
  function renderAntibody(mount) {
    var vals = {};
    var note = copyArea(function () { return composeAntibody(vals); });
    var form = el("div", { class: "surface ref-card" }, el("h4", {}, "Antibody identification — workup"));
    ANTIBODY_FIELDS.forEach(function (f) {
      var input = f[2] === "textarea"
        ? el("textarea", { class: "ref-input", rows: "2", placeholder: f[3], on: { input: function () { vals[f[0]] = input.value; note.refresh(); } } })
        : el("input", { class: "ref-input", type: "text", placeholder: f[3], on: { input: function () { vals[f[0]] = input.value; note.refresh(); } } });
      form.appendChild(field(f[1], input));
    });
    var grid = el("div", { class: "ref-grid" }, form, note.node);
    var method = el("div", { class: "surface ref-card", style: "margin-top:16px" }, el("h4", {}, "How to read a panel — quick method"),
      el("ul", { class: "ticks" },
        el("li", {}, el("strong", {}, "Rule of three: "), "to call a specificity, you generally need ≥3 antigen-positive cells reactive and ≥3 antigen-negative cells non-reactive (p ≈ 0.05)."),
        el("li", {}, el("strong", {}, "Rule out: "), "cross off antibodies whose antigen-positive cells are non-reactive — use homozygous (double-dose) cells where dosage matters (Rh, Kidd, Duffy, MNS)."),
        el("li", {}, el("strong", {}, "Phase & strength: "), "IgM (cold, IS) vs IgG (37 °C / AHG); a reaction only at AHG with enzyme enhancement suggests Rh/Kidd."),
        el("li", {}, el("strong", {}, "Autocontrol / DAT: "), "positive → consider warm/cold autoantibody, delayed reaction, or drug-induced; a positive autocontrol can mask underlying alloantibodies (adsorption may be needed)."),
        el("li", {}, el("strong", {}, "Pan-reactivity: "), "uniform reactivity → high-incidence antigen antibody (e.g., anti-U, anti-k) or autoantibody — send to the reference lab.")));
    clear(mount); mount.appendChild(grid); mount.appendChild(method);
    note.refresh();
  }
  function composeAntibody(v) {
    var L = ["ANTIBODY IDENTIFICATION — WORKUP", ""];
    if (v.indication) L.push("Indication: " + v.indication);
    L.push("", "SCREEN / PANEL");
    L.push("  " + (v.screen || "—"));
    L.push("", "Antibody(ies) identified: " + (v.antibodies || "—"));
    L.push("Autocontrol / DAT: " + (v.autocontrol_dat || "—"));
    L.push("", "DISPOSITION");
    L.push("  Units / compatibility: " + (v.units || "—"));
    L.push("  Clinical significance: " + (v.significance || "—"));
    if (v.teaching) { L.push("", "TEACHING POINT", "  " + v.teaching); }
    L.push("", "Reference workup note — correlate with the full panel and the patient's history; the blood bank physician remains the final decision-maker.");
    return L.join("\n");
  }

  /* ============================================================================
     TOOL 3 — THERAPEUTIC APHERESIS  (note composer + searchable ASFA auto-fill)
     ============================================================================ */
  var PROCEDURES = ["Therapeutic plasma exchange (TPE)", "RBC exchange", "Erythrocytapheresis", "Leukocytapheresis",
    "Plateletpheresis (thrombocytapheresis)", "Extracorporeal photopheresis (ECP)", "LDL apheresis",
    "HPC(A) stem-cell collection", "Therapeutic phlebotomy", "Other"];
  var PROC_MAP = { TPE: "Therapeutic plasma exchange (TPE)", "TPE-HV": "Therapeutic plasma exchange (TPE)",
    "RBC exchange": "RBC exchange", Erythrocytapheresis: "Erythrocytapheresis", Leukocytapheresis: "Leukocytapheresis",
    Thrombocytapheresis: "Plateletpheresis (thrombocytapheresis)", ECP: "Extracorporeal photopheresis (ECP)", LA: "LDL apheresis" };
  var APH_FIELDS = [
    ["referring", "Referring service / question", "text", "service · attending · the question being asked"],
    ["consult_q", "Consult question", "textarea", "what is being asked of apheresis"],
    ["indication", "Indication / diagnosis", "text", "filled from the ASFA lookup, or type it"],
    ["access", "Vascular access", "text", "large-bore peripheral · temporary HD line · port — confirm flow"],
    ["replacement", "Replacement fluid", "text", "5% albumin · plasma (TTP / coagulopathy) · combination"],
    ["dose", "Dose / volume treated", "text", "1–1.5 plasma volumes; ___ mL exchanged"],
    ["anticoag", "Anticoagulation", "text", "ACD-A ratio ___ ; ± heparin; watch ionized calcium"],
    ["schedule", "Schedule / course", "text", "daily ×5 then reassess · QOD until response · endpoint ___"],
    ["proc_num", "Procedure number", "text", "# ___ of planned ___"],
    ["labs", "Monitoring labs", "textarea", "CBC, ionized Ca, fibrinogen, PT/PTT; disease-specific markers (ADAMTS13, LDH, bilirubin)"],
    ["plan", "Assessment & plan", "textarea", "impression and next steps"]
  ];
  function renderApheresis(mount) {
    var ind = (REF.asfaInd || {}).indications || [], proto = (REF.asfaProto || {}).protocols || {}, catDefs = (REF.asfaInd || {}).category_defs || {};
    var vals = {}, mode = "Consult", asfaRef = null;
    var note = copyArea(function () { return composeAph(vals, mode, asfaRef); });

    var modeRow = field("Note type", seg([{ value: "Consult", label: "Consult" }, { value: "Progress", label: "Progress note" }], mode, function (v) { mode = v; note.refresh(); }));

    /* searchable ASFA lookup */
    var lookCard = el("div", { class: "surface ref-card" }, el("h4", {}, "ASFA indication lookup (9th ed. 2023)"));
    var lookInput = el("input", { class: "ref-input", type: "search", placeholder: "Search ASFA — TTP, myasthenia, sickle, anti-GBM, hyperviscosity…" });
    var lookResults = el("div", { class: "aph-look" });
    lookCard.appendChild(lookInput); lookCard.appendChild(lookResults);

    function norm(s) { return (s || "").toLowerCase().replace(/[-‐-―−]/g, " ").replace(/\s+/g, " ").trim(); }
    var CATORD = { I: 0, II: 1, III: 2, IV: 3 };
    function drawLook(q) {
      clear(lookResults); var nq = norm(q);
      if (!nq) { lookResults.appendChild(el("p", { class: "muted-note" }, "Type to search the ASFA indication tables.")); return; }
      var rows = ind.filter(function (r) { return norm(r.disease + " " + (r.indication || "") + " " + r.procedure).indexOf(nq) !== -1; })
        .sort(function (a, b) {
          var ca = CATORD[a.category] == null ? 9 : CATORD[a.category], cb = CATORD[b.category] == null ? 9 : CATORD[b.category];
          if (ca !== cb) return ca - cb;
          if (a.disease !== b.disease) return a.disease.localeCompare(b.disease);
          return (a.indication || "").localeCompare(b.indication || "");
        }).slice(0, 20);
      if (!rows.length) { lookResults.appendChild(el("p", { class: "muted-note" }, "No ASFA match.")); return; }
      rows.forEach(function (r) {
        lookResults.appendChild(el("button", { class: "aph-hit", type: "button", title: catDefs[r.category] || "", on: { click: function () { applyAsfa(r); } } },
          el("span", { class: "asfa-cat cat-" + r.category }, r.category),
          el("span", { class: "aph-hit-d" }, r.disease + (r.indication ? " — " + r.indication : "")),
          el("span", { class: "aph-hit-m" }, r.procedure + " · Grade " + r.grade + " · p" + r.page)));
      });
    }
    lookInput.addEventListener("input", debounce(function () { drawLook(lookInput.value); }, 120));
    drawLook("");

    /* fields */
    var inputs = {};
    var form = el("div", { class: "surface ref-card" }, el("h4", {}, "Apheresis note"));
    form.appendChild(modeRow);
    form.appendChild(field("Procedure", inputs.procedure = selectEl(PROCEDURES, vals.procedure || PROCEDURES[0], function (v) { vals.procedure = v; note.refresh(); })));
    vals.procedure = PROCEDURES[0];
    var catSel, gradeSel;
    var asfaRow = el("div", { class: "aph-asfa-row" },
      field("ASFA category", catSel = selectEl(["", "I", "II", "III", "IV"], "", function (v) { vals.asfa_cat = v; note.refresh(); })),
      field("ASFA grade", gradeSel = selectEl(["", "1A", "1B", "1C", "2A", "2B", "2C"], "", function (v) { vals.asfa_grade = v; note.refresh(); })));
    APH_FIELDS.forEach(function (f) {
      var input = f[2] === "textarea"
        ? el("textarea", { class: "ref-input", rows: "2", placeholder: f[3], on: { input: function () { vals[f[0]] = input.value; note.refresh(); } } })
        : el("input", { class: "ref-input", type: "text", placeholder: f[3], on: { input: function () { vals[f[0]] = input.value; note.refresh(); } } });
      inputs[f[0]] = input;
      form.appendChild(field(f[1], input));
      if (f[0] === "indication") form.appendChild(asfaRow);
    });

    function applyAsfa(r) {
      vals.indication = r.disease + (r.indication ? " — " + r.indication : "");
      inputs.indication.value = vals.indication;
      vals.asfa_cat = r.category; catSel.value = r.category;
      vals.asfa_grade = r.grade; gradeSel.value = r.grade;
      var first = (r.procedure || "").split("/")[0].trim();
      vals.procedure = PROC_MAP[first] || PROC_MAP[r.procedure] || "Other"; inputs.procedure.value = vals.procedure;
      var p = proto[r.disease] || {};
      if (p.volume) { vals.dose = p.volume; inputs.dose.value = p.volume; }
      if (p.replacement) { vals.replacement = p.replacement; inputs.replacement.value = p.replacement; }
      if (p.frequency) { vals.schedule = p.frequency; inputs.schedule.value = p.frequency; }
      asfaRef = { disease: r.disease, indication: r.indication, procedure: r.procedure, category: r.category, grade: r.grade, page: r.page, num_procedures: p.num_procedures || "" };
      RUI.toast("Filled from ASFA — Category " + r.category + " / Grade " + r.grade);
      note.refresh();
    }

    var grid = el("div", { class: "ref-grid" }, el("div", {}, lookCard, form), note.node);
    clear(mount); mount.appendChild(grid);
    note.refresh();
  }
  function composeAph(v, mode, ref) {
    var L = [mode === "Consult" ? "THERAPEUTIC APHERESIS CONSULT" : "THERAPEUTIC APHERESIS — PROGRESS NOTE", ""];
    if (v.referring) L.push("Referring: " + v.referring);
    if (v.consult_q) L.push("Consult question: " + v.consult_q);
    L.push("Procedure: " + (v.procedure || "—"));
    L.push("Indication: " + (v.indication || "—"));
    if (v.asfa_cat || v.asfa_grade) L.push("ASFA: Category " + (v.asfa_cat || "—") + ", Grade " + (v.asfa_grade || "—") + " (9th ed. 2023)");
    L.push("", "PRESCRIPTION");
    L.push("  Access: " + (v.access || "—"));
    L.push("  Replacement fluid: " + (v.replacement || "—"));
    L.push("  Dose / volume: " + (v.dose || "—"));
    L.push("  Anticoagulation: " + (v.anticoag || "—"));
    L.push("  Schedule: " + (v.schedule || "—"));
    L.push("  Procedure #: " + (v.proc_num || "—"));
    L.push("", "MONITORING");
    L.push("  " + (v.labs || "—"));
    if (ref && ref.num_procedures) { L.push("", "ASFA SUGGESTED COURSE (9th ed. 2023)", "  " + ref.num_procedures); }
    L.push("", mode === "Consult" ? "ASSESSMENT & PLAN" : "PROGRESS / PLAN", "  " + (v.plan || "—"));
    L.push("", "Reference note. ASFA categories are guidance; correlate with the clinical picture. The apheresis physician remains the final decision-maker.");
    return L.join("\n");
  }

  function boot() {
    var b = document.getElementById("ref-bloodprep"); if (b && REF.bloodprep) renderBloodPrep(b);
    var ab = document.getElementById("ref-antibody"); if (ab) renderAntibody(ab);
    var ap = document.getElementById("ref-apheresis"); if (ap) renderApheresis(ap);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
