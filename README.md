# Blood Bank & Transfusion Medicine — Resident Reference

A private onboarding + clinical decision-support dashboard for the **Henry Ford Pathology Residency**, personalized to welcome **Eric** to the service. It has two layers:

1. **Foundations** — a resident-level orientation to the three pillars (blood bank, coagulation, apheresis), with interactive cases, a quiz center, a glossary, and a recap. (Adapted from the medical-student crash course, re-pitched for a CP resident.)
2. **Clinical reference & decision support** — six interactive tools **ported faithfully** from the internal `tm-coag-logger` app, as *reference* (no case logging, no patient data):

| Tab | What it does |
|---|---|
| **Platelet requests** | Approval / appropriateness engine — set the indication + setting, click the platelet band → approve / not-indicated note against AABB/BSH thresholds. |
| **Transfusion reactions** | Click the signs + clerical/DAT/ABO workup → triages AHTR · FNHTR · TACO · TRALI · allergic · septic · delayed, with next steps; plus a searchable 14-reaction catalog. |
| **ASFA guidelines** | All 166 ASFA 9th-ed. (2023) indications — searchable, category-filterable, click a row for the prescription details. |
| **Blood for the OR (MSBOS)** | HFHS Surgical Blood Ordering Schedule (231 procedures) + Hgb adjustment + alloantibody antigen-negative frequencies (linkage-aware for Rh) → crossmatch recommendation + donor-screening burden. |
| **Antibody panel ID** | Structured workup composer + the quick method for reading a panel. |
| **Therapeutic apheresis** | Searchable ASFA lookup that auto-fills category/grade/procedure/course → copy a consult or progress note. |

The decision logic is **ported, not re-derived**: the panel interpreter (`interpreter.py`) and the MSBOS/Rh compute (`compute.py` + `rh.py`) were translated to JavaScript verbatim, and verified against the source (e.g., anti-C + anti-e → ~2% Rh-negative via Hardy-Weinberg, not the naïve 0.64%).

---

## ⚠️ Privacy & scope

- **Published at the maintainer's direction.** This repo embeds **internal Henry Ford clinical content** — the institutional MSBOS (policy `PCR-PALM-TRM-5.050`) and approval logic — and is published publicly by the author's explicit choice. It is institutional clinical-reference material (not PHI). If that decision ever changes, set the repo private and disable Pages.
- **No patient data.** Only the *reference knowledge* was imported from `tm-coag-logger`. None of its case log, notebook, or any PHI is included. The composers build copy-ready note **skeletons** in-memory only — nothing is stored or transmitted.
- **Decision support, not protocol.** MSBOS is institution-specific; ASFA tables follow the 9th ed. (2023); antigen frequencies are population estimates. Verify against current policy and the source documents; the attending / blood bank physician is the final decision-maker.

---

## File structure

```
.
├── index.html                     # shell, design system, foundations content, reference sections
├── assets/reference/
│   ├── refdata.js                 # bundled clinical knowledge (data only — edit here to update)
│   ├── engine.js                  # ported logic: panel interpreter + MSBOS/Rh compute
│   ├── reference.js               # UI: platelet, transfusion-reaction + catalog, ASFA
│   └── reference2.js              # UI: MSBOS, antibody ID, therapeutic apheresis
├── PLANNING.md  ·  README.md  ·  .gitignore
```

Everything is **vanilla JS + CSS**, no build step, no runtime dependencies, no network calls. It runs equally as a static site or by opening `index.html` locally.

## Run it locally

```bash
python3 -m http.server 8147     # then visit http://localhost:8147
```

## Edit the clinical knowledge

All clinical data lives in `assets/reference/refdata.js` as plain JSON assigned to `window.ERICREF` (`bloodprep`, `asfaInd`, `asfaProto`, `txn`, `plateletPanel`, `tmPanel`). Edit the values to refine a threshold, add a surgery, or update an ASFA row. The rule-matching language for the panels (platelet, transfusion-reaction) is documented in the original `tmcoag/docs/PANELS.md`.

## Deploy

**Live:** https://omarzbaba.github.io/transfusion-medicine-residency-eric/ — public GitHub Pages (`main` / root). It also runs fully offline: open `index.html` directly, no server needed.
