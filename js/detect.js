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
  let currentAlert = null;
  let episodeDaysCount = 0;
  let episodeMaxSignals = 0;
  const alerts = [];

  function finalizeEpisode() {
    if (currentAlert) {
      currentAlert.durationDays = episodeDaysCount;
      if (episodeMaxSignals >= 3 && episodeDaysCount >= 5) {
        currentAlert.confidence = "high";
      } else if (episodeMaxSignals >= 2 && episodeDaysCount >= 3) {
        currentAlert.confidence = "medium";
      } else {
        currentAlert.confidence = "low";
      }
    }
  }

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

        episodeDaysCount = 1;
        episodeMaxSignals = deviating.length;

        currentAlert = {
          day: d.day,
          level: level,
          signals: deviating,
          summary: summary,
          durationDays: 1,
          confidence: "low",
        };

        alerts.push(currentAlert);
      }
    } else {
      if (deviating.length >= 2) {
        episodeDaysCount++;
        episodeMaxSignals = Math.max(episodeMaxSignals, deviating.length);
      } else {
        finalizeEpisode();
        inEpisode = false;
        currentAlert = null;
      }
    }
  }

  if (inEpisode) {
    finalizeEpisode();
  }

  return alerts;
}

function currentWatch(days, signals) {
  if (!days || !Array.isArray(days) || days.length <= 14) {
    return { alertActive: false, signals: [] };
  }

  const { computeBaseline, zScore } = getBaselineHelpers();
  if (typeof computeBaseline !== "function" || typeof zScore !== "function") {
    console.error("AegisBaseline helpers are required for currentWatch()");
    return { alertActive: false, signals: [] };
  }

  const sigList = signals || DEFAULT_SIGNALS;
  const baseline = computeBaseline(days, sigList, 14);

  const consecutiveOff = {};
  sigList.forEach((s) => {
    consecutiveOff[s] = 0;
  });

  let inEpisode = false;
  let lastDeviating = [];

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
            daysOff: consecutiveOff[sig],
          });
        }
      } else {
        consecutiveOff[sig] = 0;
      }
    });

    if (!inEpisode) {
      if (deviating.length >= 2) {
        inEpisode = true;
      }
    } else {
      if (deviating.length < 2) {
        inEpisode = false;
      }
    }

    if (i === days.length - 1) {
      lastDeviating = deviating;
    }
  }

  return {
    alertActive: inEpisode,
    signals: lastDeviating,
  };
}

const AegisDetect = {
  detect,
  currentWatch,
};

if (typeof window !== "undefined") {
  window.AegisDetect = AegisDetect;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AegisDetect;
}
