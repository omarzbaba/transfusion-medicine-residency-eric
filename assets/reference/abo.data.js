/* ABO group prevalences — for estimating the ABO-compatible donor pool when
   hunting antigen-negative units. EDIT these to match your local donor population.
   `compatible` = which donor ABO groups a recipient can receive RBCs from.
   Prevalences are approximate, race-stratified fractions (sum ~1.0 per race). */
window.ERICREF = window.ERICREF || {};
window.ERICREF.abo = {
  groups: [
    { value: "",   label: "Unknown" },
    { value: "O",  label: "O" },
    { value: "A",  label: "A" },
    { value: "B",  label: "B" },
    { value: "AB", label: "AB" }
  ],
  compatible: {
    O:  ["O"],
    A:  ["A", "O"],
    B:  ["B", "O"],
    AB: ["A", "B", "AB", "O"]
  },
  prevalence: {
    white: { O: 0.45, A: 0.40, B: 0.11, AB: 0.04 },
    black: { O: 0.49, A: 0.27, B: 0.20, AB: 0.04 }
  }
};
