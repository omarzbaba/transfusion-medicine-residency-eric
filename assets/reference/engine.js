/* ============================================================================
   engine.js — clinical decision logic, ported verbatim from the TM·Coag Logger
   Python source (panels/interpreter.py, bloodprep/compute.py, bloodprep/rh.py).
   Pure functions; no DOM, no network. window.TMENGINE = { ... }.
   ============================================================================ */
(function () {
  "use strict";

  var KIND_SKIP = "skip", KIND_NORMAL = "normal", KIND_ABNORMAL = "abnormal";
  var WILDCARD_ABNORMAL = "*abnormal", WILDCARD_SET = "*set";
  var DEFAULT_DISCLAIMER =
    "Decision-support output. Correlate with the clinical picture and complete " +
    "results; the pathologist remains the final decision-maker.";

  /* ---------- panel helpers (mirror models.py normalization) ---------- */
  function analyteDefault(a) {
    if (a.default !== undefined && a.default !== null) return a.default;
    return (a.states && a.states.length) ? a.states[0].value : null;
  }
  function findState(a, value) {
    if (!a.states) return null;
    for (var i = 0; i < a.states.length; i++) if (a.states[i].value === value) return a.states[i];
    return null;
  }
  function groupsOf(panel) {
    var seen = {}, out = [];
    (panel.analytes || []).forEach(function (a) {
      var g = a.group || "";
      if (!(g in seen)) { seen[g] = 1; out.push(g); }
    });
    return out;
  }
  function asList(v) { return Array.isArray(v) ? v : [v]; }

  /* ---------- matching (interpreter.py) ---------- */
  function analyteMatches(value, kind, acceptable) {
    for (var i = 0; i < acceptable.length; i++) {
      var token = acceptable[i];
      if (token === WILDCARD_ABNORMAL && kind === KIND_ABNORMAL) return true;
      if (token === WILDCARD_SET && kind !== KIND_SKIP) return true;
      if (token === value) return true;
    }
    return false;
  }
  function contextMatches(answer, acceptable) {
    var ans = (answer === null || answer === undefined) ? "" : String(answer).trim().toLowerCase();
    for (var i = 0; i < acceptable.length; i++) {
      var tok = String(acceptable[i]).trim().toLowerCase();
      if (tok === WILDCARD_SET && ["", "unknown", "none", "no"].indexOf(ans) === -1) return true;
      if (tok === ans) return true;
    }
    return false;
  }
  function matches(when, stateValue, stateKind, context) {
    if (!when) return false;
    var keys = Object.keys(when);
    if (!keys.length) return false;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i], acceptable = asList(when[key]);
      if (key in stateValue) {
        if (!analyteMatches(stateValue[key], stateKind[key] || "", acceptable)) return false;
      } else {
        if (!contextMatches(context[key], acceptable)) return false;
      }
    }
    return true;
  }

  function contextLine(label, qtype, answer) {
    if (answer === null || answer === undefined) return null;
    var ans = String(answer).trim();
    if (!ans || ans.toLowerCase() === "unknown") return null;
    if (qtype === "yesno") {
      var lo = ans.toLowerCase();
      if (lo === "yes" || lo === "true" || lo === "1") return label + " yes";
      if (lo === "no" || lo === "false" || lo === "0") return label + " no";
      return label + " " + ans;
    }
    return label + " " + ans;
  }
  function addUnique(items, value) {
    var v = (value || "").trim();
    if (v && items.indexOf(v) === -1) items.push(v);
  }

  /* ---------- report assembly (interpreter.py _assemble_text) ---------- */
  function assembleText(panel, r) {
    var lines = [];
    var heading = panel.report_heading || panel.title;
    lines.push(String(heading).toUpperCase());
    lines.push("");
    if (r.context_lines.length) {
      lines.push("CLINICAL CONTEXT");
      r.context_lines.forEach(function (c) { lines.push("  • " + c); });
      lines.push("");
    }
    if (r.symptoms.length) {
      lines.push("SYMPTOMS / CLINICAL HISTORY");
      r.symptoms.forEach(function (s) { lines.push("  • " + s); });
      lines.push("");
    }
    lines.push("FINDINGS");
    if (r.findings.length) r.findings.forEach(function (f) { lines.push("  • " + f.text); });
    else lines.push("  • No abnormal results entered.");
    if (r.normal_limits.length) lines.push("  • Within normal limits: " + r.normal_limits.join(", ") + ".");
    lines.push("");
    lines.push("INTERPRETATION");
    if (r.impressions.length) r.impressions.forEach(function (imp) { lines.push("  • " + imp.text); });
    else lines.push("  • —");
    lines.push("");
    if (r.recommendations.length) {
      lines.push("SUGGESTED NEXT STEPS");
      r.recommendations.forEach(function (rec) { lines.push("  • " + rec); });
      lines.push("");
    }
    if (r.caveats.length) {
      lines.push("CAVEATS / PRE-ANALYTIC NOTES");
      r.caveats.forEach(function (c) { lines.push("  • " + c); });
      lines.push("");
    }
    lines.push(panel.disclaimer || DEFAULT_DISCLAIMER);
    return lines.join("\n").replace(/\s+$/, "") + "\n";
  }

  /* ---------- interpret() — the engine ---------- */
  function interpret(panel, selections, context, symptoms) {
    selections = selections || {}; context = context || {};
    var r = {
      panel_id: panel.panel_id, title: panel.title,
      context_lines: [], symptoms: [], findings: [], normal_limits: [],
      impressions: [], recommendations: [], caveats: [], report_text: ""
    };
    (symptoms || []).forEach(function (s) { var t = String(s).trim(); if (t) r.symptoms.push(t); });

    (panel.context_questions || []).forEach(function (q) {
      var line = contextLine(q.label, q.type, context[q.id]);
      if (line) r.context_lines.push(line);
    });

    var stateKind = {}, stateValue = {};
    (panel.analytes || []).forEach(function (a) {
      var chosen = (a.id in selections) ? selections[a.id] : analyteDefault(a);
      stateValue[a.id] = chosen;
      var st = findState(a, chosen);
      if (!st) { stateKind[a.id] = KIND_SKIP; return; }
      stateKind[a.id] = st.kind;
      if (st.kind === KIND_SKIP) return;
      if (st.kind === KIND_NORMAL) { r.normal_limits.push(a.name); return; }
      var sentence = st.report || (a.name + ": " + st.label + ".");
      r.findings.push({ analyte: a.name, text: sentence });
      (st.recommendations || []).forEach(function (rec) { addUnique(r.recommendations, rec); });
    });

    (panel.rules || []).forEach(function (rule) {
      if (matches(rule.when, stateValue, stateKind, context)) {
        r.impressions.push({ text: rule.impression, severity: rule.severity, rule_id: rule.id });
        (rule.recommendations || []).forEach(function (rec) { addUnique(r.recommendations, rec); });
      }
    });
    (panel.caveats || []).forEach(function (cav) {
      if (matches(cav.when, stateValue, stateKind, context)) addUnique(r.caveats, cav.text);
    });

    if (!r.impressions.length) {
      if (r.findings.length) r.impressions.push({
        text: "The abnormalities above do not match a pre-defined pattern in this panel. " +
              "Interpret in clinical context and consider additional or confirmatory testing.",
        severity: "info", rule_id: "_fallback_abnormal"
      });
      else if (r.normal_limits.length) r.impressions.push({
        text: "No abnormality detected among the tested analytes.", severity: "good", rule_id: "_fallback_normal"
      });
    }
    r.report_text = assembleText(panel, r);
    return r;
  }

  /* ==========================================================================
     BLOOD PREP / MSBOS  (bloodprep/compute.py + rh.py)
     ========================================================================== */
  var RH_ANTIGENS = { D: 1, C: 1, c: 1, E: 1, e: 1 };
  function isRh(code) { return code in RH_ANTIGENS; }

  function bp() { return (window.TMREF && window.TMREF.bloodprep) || {}; }
  function antigenIndex() {
    var m = {}; (bp().antigens || []).forEach(function (a) { m[a.code] = a; }); return m;
  }
  function surgeryIndex() {
    var m = {}; (bp().surgeries || []).forEach(function (s) { m[s.id] = s; }); return m;
  }
  function negFreqPct(antigen, race) {
    var neg = antigen.neg || {};
    var w = Number(neg.white || 0), b = Number(neg.black || 0);
    if (race === "white") return w;
    if (race === "black") return b;
    return Math.min(w, b);
  }
  function rhNegativeFraction(targetAntigens, race) {
    var targets = {};
    targetAntigens.forEach(function (a) { if (a in RH_ANTIGENS) targets[a] = 1; });
    if (!Object.keys(targets).length) return 1.0;
    var rh = bp().rh_haplotypes || {};
    var haplotypes = rh.haplotypes || [], freq = rh.freq || {};
    if (!haplotypes.length || !Object.keys(freq).length) return 1.0;
    function disjoint(antigens) {
      for (var i = 0; i < antigens.length; i++) if (antigens[i] in targets) return false;
      return true;
    }
    function fractionFor(table) {
      var acceptable = 0;
      haplotypes.forEach(function (h) {
        if (disjoint(h.antigens || [])) acceptable += Number(table[h.code] || 0);
      });
      return acceptable * acceptable;
    }
    if (race in freq) return fractionFor(freq[race]);
    var vals = Object.keys(freq).map(function (k) { return fractionFor(freq[k]); });
    return vals.length ? Math.min.apply(null, vals) : 1.0;
  }

  // Fraction of donors that are ABO-compatible with the recipient (race-stratified).
  // Antigen-negative frequency is ABO-independent, so this multiplies the donor pool
  // only — it does not change the antigen-negative % or the crossmatch count.
  function aboCompatFraction(recip, race) {
    if (!recip) return 1.0;
    var d = (window.TMREF && window.TMREF.abo) || null;
    if (!d) return 1.0;
    var compat = (d.compatible || {})[recip];
    if (!compat) return 1.0;
    var prev = d.prevalence || {};
    function fracFor(t) { var s = 0; compat.forEach(function (g) { s += Number(t[g] || 0); }); return s; }
    if (race in prev) return fracFor(prev[race]);
    var vals = Object.keys(prev).map(function (k) { return fracFor(prev[k]); });
    return vals.length ? Math.min.apply(null, vals) : 1.0;
  }

  var HGB_RULES = {
    ge10:  [0, 0, "Hemoglobin ≥10 g/dL — transfusion unlikely for most procedures."],
    "8to10": [0, 0, "Hemoglobin 8–9.9 g/dL — transfusion possible; keep a current type & screen."],
    "7to8":  [1, 2, "Hemoglobin 7–7.9 g/dL — at/near the usual transfusion threshold; prepare units."],
    lt7:   [2, 2, "Hemoglobin <7 g/dL — transfusion likely; ensure units are crossmatched and ready."]
  };

  function fmtPct(p) {
    if (p === 0) return "<0.1%";
    if (p < 1) return Number(p.toPrecision(2)).toString() + "%";
    return Math.round(p) + "%";
  }

  function bloodprepCompute(sel) {
    var surgeryId = sel.surgery_id || "";
    var hgb = sel.hgb || "";
    var race = sel.race || "other";
    var recipientAbo = sel.recipient_abo || "";
    var antibodyCodes = (sel.antibodies || []).map(String);

    var surgeries = surgeryIndex();
    var surgery = surgeries[surgeryId] || null;
    var findings = [], recommendations = [], caveats = [], flags = [];

    var baseUnits;
    if (surgery) {
      if (surgery.approach === "none") { baseUnits = 0; findings.push(surgery.name + ": no blood sample required (MSBOS)."); }
      else if (surgery.approach === "ts") { baseUnits = 0; findings.push(surgery.name + ": type & screen is usually sufficient (MSBOS)."); }
      else { baseUnits = parseInt(surgery.units || 0, 10); findings.push(surgery.name + ": MSBOS suggests crossmatch ~" + baseUnits + " unit(s)."); }
    } else { baseUnits = 0; findings.push("No surgery selected — using type & screen baseline."); }

    var rule = HGB_RULES[hgb] || [0, 0, ""];
    var extra = rule[0], forceTsUnits = rule[1], hgbNote = rule[2];
    if (hgbNote) findings.push(hgbNote);
    var units = baseUnits + (baseUnits > 0 ? extra : 0);
    if (baseUnits === 0 && forceTsUnits) units = forceTsUnits;

    var idx = antigenIndex();
    var chosen = antibodyCodes.filter(function (c) { return c in idx; }).map(function (c) { return idx[c]; });
    var significant = chosen.filter(function (a) { return a.significant; });
    var nonSig = chosen.filter(function (a) { return !a.significant; });

    var perAntibody = chosen.map(function (a) {
      return { name: a.name, antigen: a.code, system: a.system || "",
        compatible_pct: negFreqPct(a, race), significant: !!a.significant, high_incidence: !!a.high_incidence };
    });

    var sigRh = significant.filter(function (a) { return isRh(a.code); });
    var sigOther = significant.filter(function (a) { return !isRh(a.code); });
    var combinedFreq = 1.0;
    sigOther.forEach(function (a) { combinedFreq *= negFreqPct(a, race) / 100.0; });
    var rhLinkage = null;
    if (sigRh.length === 1) {
      combinedFreq *= negFreqPct(sigRh[0], race) / 100.0;
    } else if (sigRh.length >= 2) {
      var rhCodes = sigRh.map(function (a) { return a.code; });
      var rhFrac = rhNegativeFraction(rhCodes, race);
      var naive = 1.0; sigRh.forEach(function (a) { naive *= negFreqPct(a, race) / 100.0; });
      combinedFreq *= rhFrac;
      rhLinkage = { frac: rhFrac, naive: naive, codes: rhCodes };
    }

    if (nonSig.length) {
      var nm = nonSig.map(function (a) { return a.name; }).join(", ");
      caveats.push(nm + ": usually not clinically significant — antigen-negative units are generally not required unless reactive at 37 °C / AHG. Confirm clinical significance.");
    }

    var unitsToPrepare, combinedPct, unitsToScreen, donorsToReach = null, aboCompatPct = null;
    if (significant.length) {
      var antigens = significant.map(function (a) { return a.name.replace("Anti-", ""); }).join(", ");
      unitsToPrepare = Math.max(units, 2);
      findings.push("Significant alloantibody(ies) present — units must be antigen-negative for: " + antigens + ".");
      recommendations.push("Crossmatch " + unitsToPrepare + " antigen-negative unit(s) (negative for " + antigens + "); confirm AHG-crossmatch compatible.");
      combinedPct = combinedFreq * 100.0;
      unitsToScreen = combinedFreq > 0 ? Math.ceil(unitsToPrepare / combinedFreq) : null;
      if (significant.length > 1) findings.push("Combined, ~" + fmtPct(combinedPct) + " of random donors are compatible for all antibodies.");
      if (rhLinkage) {
        var ags = rhLinkage.codes.join("/");
        findings.push("Rh antigens are inherited as linked haplotypes (R0/R1/R2/r), so the combined Rh-negative frequency is derived from haplotype frequencies: ~" +
          fmtPct(rhLinkage.frac * 100) + " of donors are negative for " + ags + " — not ~" + fmtPct(rhLinkage.naive * 100) +
          " that naively multiplying the single-antigen rates would suggest.");
      }
      if (unitsToScreen !== null) recommendations.push("Expect to screen ~" + unitsToScreen + " donor unit(s) to find " + unitsToPrepare + " compatible (combined antigen-negative frequency ~" + fmtPct(combinedPct) + ").");
      else flags.push("No compatible donors by these frequencies — reference lab / rare-donor program required.");
      // ABO: units must also be ABO-compatible. Shrinks the random-donor pool only.
      var aboFrac = aboCompatFraction(recipientAbo, race);
      if (recipientAbo && aboFrac > 0 && aboFrac < 1) {
        aboCompatPct = Math.round(aboFrac * 1000) / 10;
        if (combinedFreq > 0) donorsToReach = Math.ceil(unitsToPrepare / (combinedFreq * aboFrac));
        findings.push("Recipient group " + recipientAbo + ": only ~" + fmtPct(aboFrac * 100) +
          " of donors are ABO-compatible — expect to reach ~" + (donorsToReach != null ? donorsToReach : "many") +
          " random donors to find " + unitsToPrepare + " unit(s) that are both ABO-compatible and antigen-negative.");
      }
      if (significant.some(function (a) { return a.high_incidence; }) || combinedPct < 5)
        flags.push("VERY rare compatibility (high-incidence antigen or <5% compatible) — involve the blood bank reference lab and rare-donor registry; allow significant lead time; consider autologous/family units.");
      else if (combinedPct < 15)
        flags.push("Limited compatible inventory (<15%) — notify the blood bank early and allow extra lead time.");
      caveats.push("Give antigen-negative units for clinically significant antibodies even if the current antibody screen/titer is negative (anamnestic risk).");
    } else {
      unitsToPrepare = units; combinedPct = 100.0; unitsToScreen = units;
      if (unitsToPrepare > 0) recommendations.push("Crossmatch " + unitsToPrepare + " unit(s).");
      else recommendations.push("Type & screen only; no units need to be crossmatched up front.");
    }

    var approach = unitsToPrepare === 0 ? "Type & screen" : "Crossmatch " + unitsToPrepare + " unit(s)";
    var summary = {
      approach: approach, units_to_prepare: unitsToPrepare, units_to_screen: unitsToScreen,
      combined_compatible_pct: Math.round(combinedPct * 10) / 10,
      recipient_abo: recipientAbo, abo_compatible_pct: aboCompatPct, donors_to_reach: donorsToReach,
      antibodies: perAntibody, findings: findings, recommendations: recommendations,
      caveats: caveats, flags: flags
    };
    summary.report_text = bpReport(surgery, hgb, race, summary);
    return summary;
  }

  function bpReport(surgery, hgb, race, s) {
    var lines = ["BLOOD PREPARATION — OR DECISION SUPPORT", ""];
    var ctx = [];
    if (surgery) ctx.push("Surgery: " + surgery.name);
    if (hgb) { var labels = { ge10: "≥10", "8to10": "8–9.9", "7to8": "7–7.9", lt7: "<7" }; ctx.push("Hemoglobin: " + (labels[hgb] || hgb) + " g/dL"); }
    ctx.push("Race/ethnicity: " + race);
    if (s.recipient_abo) ctx.push("Recipient ABO: " + s.recipient_abo + (s.abo_compatible_pct != null ? " (~" + s.abo_compatible_pct + "% of donors ABO-compatible)" : ""));
    if (ctx.length) { lines.push("CONTEXT"); ctx.forEach(function (c) { lines.push("  • " + c); }); lines.push(""); }
    lines.push("RECOMMENDATION"); lines.push("  • " + s.approach);
    s.recommendations.forEach(function (r) { lines.push("  • " + r); });
    lines.push("");
    if (s.antibodies.length) {
      lines.push("ANTIBODIES / COMPATIBLE DONOR FREQUENCY");
      s.antibodies.forEach(function (a) {
        var tag = a.significant ? "" : " (usually not significant)";
        lines.push("  • " + a.name + " (" + a.system + "): ~" + fmtPct(a.compatible_pct) + " of donors antigen-negative" + tag);
      });
      lines.push("");
    }
    if (s.donors_to_reach != null) { lines.push("ABO-COMPATIBLE DONOR POOL"); lines.push("  • Recipient group " + s.recipient_abo + ": ~" + s.abo_compatible_pct + "% of donors ABO-compatible → expect to reach ~" + s.donors_to_reach + " random donors for " + s.units_to_prepare + " ABO-compatible antigen-negative unit(s)."); lines.push(""); }
    if (s.flags.length) { lines.push("FLAGS"); s.flags.forEach(function (f) { lines.push("  • " + f); }); lines.push(""); }
    if (s.caveats.length) { lines.push("NOTES"); s.caveats.forEach(function (c) { lines.push("  • " + c); }); lines.push(""); }
    lines.push("Decision support only. MSBOS is institution-specific; antigen frequencies are population estimates. The pathologist / blood bank remains the final decision-maker.");
    return lines.join("\n").replace(/\s+$/, "") + "\n";
  }

  window.TMENGINE = {
    interpret: interpret, bloodprepCompute: bloodprepCompute,
    analyteDefault: analyteDefault, findState: findState, groupsOf: groupsOf, fmtPct: fmtPct
  };
})();
