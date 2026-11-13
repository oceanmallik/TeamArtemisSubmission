// js/detect.js — AEGIS multi-signal deviation detector

function getBaselineHelpers() {
  if (typeof window !== "undefined" && window.AegisBaseline) {
    return window.AegisBaseline;
  }
  if (typeof require === "function") {
    try {
      return require("./baseline.js");
    } catch (e) {}
  }
  return {};
}

const DEFAULT_SIGNALS = [
  "hr",
  "sbp",
  "dbp",
  "glucose",
  "temp",
  "sleep",
  "mood",
  "activity",
];

function isOff(signal, z) {
  if (typeof z !== "number" || isNaN(z)) return false;
  switch (signal) {
    case "hr":
    case "sbp":
    case "dbp":
    case "temp":
      return z >= 2.5;
    case "sleep":
    case "mood":
    case "activity":
      return z <= -2.5;
    case "glucose":
      return Math.abs(z) >= 2.5;
    default:
      return Math.abs(z) >= 2.5;
  }
}

function detect(days, signals) {
  if (!days || !Array.isArray(days) || days.length <= 14) {
    return [];
  }

  const { computeBaseline, zScore } = getBaselineHelpers();
  if (typeof computeBaseline !== "function" || typeof zScore !== "function") {
    console.error("AegisBaseline helpers are required for detect()");
    return [];
  }

  const sigList = signals || DEFAULT_SIGNALS;
  const baseline = computeBaseline(days, sigList, 14);

  const consecutiveOff = {};
  sigList.forEach((s) => {
    consecutiveOff[s] = 0;
  });

  let inEpisode = false;
  const alerts = [];

  // Baseline from first 14 days; scan day 15 onward (index 14 onward)
  for (let i = 14; i < days.length; i++) {
    const d = days[i];
    const deviating = [];

    sigList.forEach((sig) => {
      const val = d[sig];
      if (typeof val === "number" && !isNaN(val) && baseline[sig]) {
        const z = zScore(val, baseline[sig]);
        if (isOff(sig, z)) {
          consecutiveOff[sig] = (consecutiveOff[sig] || 0) + 1;
        } else {
          consecutiveOff[sig] = 0;
        }

        if (consecutiveOff[sig] >= 3) {
          deviating.push({
            name: sig,
            value: val,
            baselineMedian: baseline[sig].median,
            z: Number(z.toFixed(2)),
          });
        }
      } else {
        consecutiveOff[sig] = 0;
      }
    });

    if (!inEpisode) {
      if (deviating.length >= 2) {
        inEpisode = true;
        const level = deviating.length >= 3 ? "attention" : "watch";

        const signalDescriptions = deviating.map((s) => {
          const diff = s.value - s.baselineMedian;
          const sign = diff >= 0 ? "+" : "";
          const zSign = s.z >= 0 ? "+" : "";
          return `${s.name} (${s.value} vs baseline ${s.baselineMedian}, ${sign}${diff.toFixed(1)}, z = ${zSign}${s.z.toFixed(1)})`;
        });

        const summary = `Day ${d.day} (${level}): ${signalDescriptions.join("; ")} deviated significantly from baseline.`;

        alerts.push({
          day: d.day,
          level: level,
          signals: deviating,
          summary: summary,
        });
      }
    } else {
      if (deviating.length < 2) {
        inEpisode = false;
      }
    }
  }

  return alerts;
}

const AegisDetect = {
  detect,
};

if (typeof window !== "undefined") {
  window.AegisDetect = AegisDetect;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AegisDetect;
}
