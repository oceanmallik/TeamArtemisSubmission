// tools/make-data.js — running it makes sample data
// use `node tools/make-data.js` to run
const fs = require("fs");

function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r) {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

const NOISE = { hr: 1.8, sbp: 3, dbp: 2.5, glucose: 4, temp: 0.12, sleep: 0.4, mood: 0.35, activity: 600 };
const DECIMALS = { hr: 1, sbp: 0, dbp: 0, glucose: 0, temp: 2, sleep: 2, mood: 1, activity: 0 };

const CREW = [
  // Physiological drift (infection-like): should alert
  { id: "A1", name: "Crew A", seed: 11,
    base: { hr: 58, sbp: 118, dbp: 76, glucose: 92, temp: 36.6, sleep: 7.1, mood: 4.0, activity: 9200 },
    event: { start: 45, hr: 9, temp: 0.7, sleep: -1.6, activity: -2800 } },
  // Single-signal change: should NOT alert
  { id: "A2", name: "Crew B", seed: 22,
    base: { hr: 64, sbp: 122, dbp: 79, glucose: 96, temp: 36.5, sleep: 6.6, mood: 3.8, activity: 7800 },
    event: { start: 45, sleep: -1.6 } },
  // Normal
  { id: "A3", name: "Crew C", seed: 33,
    base: { hr: 54, sbp: 114, dbp: 72, glucose: 88, temp: 36.6, sleep: 7.4, mood: 4.2, activity: 10500 },
    event: null },
  // Isolation / stress pattern: should alert
  { id: "A4", name: "Crew D", seed: 44,
    base: { hr: 61, sbp: 120, dbp: 78, glucose: 94, temp: 36.5, sleep: 7.0, mood: 4.1, activity: 8600 },
    event: { start: 40, mood: -1.5, sleep: -1.3, sbp: 10, activity: -2200 } }
];

function generate(p, days) {
  const r = rng(p.seed);
  const e = p.event;
  const out = [];
  for (let d = 1; d <= days; d++) {
    const k = e && d >= e.start ? Math.min(1, (d - e.start + 1) / 5) : 0;
    const rec = { day: d };
    Object.keys(NOISE).forEach(function (key) {
      let v = p.base[key] + gauss(r) * NOISE[key] + k * ((e && e[key]) || 0);
      if (key === "mood") v = Math.min(5, Math.max(1, v));
      rec[key] = +v.toFixed(DECIMALS[key]);
    });
    out.push(rec);
  }
  return out;
}

const result = {
  note: "Simulated (fictional) data for demo purposes only.",
  units: { hr: "bpm", sbp: "mmHg", dbp: "mmHg", glucose: "mg/dL", temp: "°C", sleep: "h", mood: "1-5", activity: "steps" },
  crew: CREW.map(function (p) {
    return { id: p.id, name: p.name, days: generate(p, 60) };
  })
};

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/crew.json", JSON.stringify(result, null, 2));
console.log("Created data/crew.json");