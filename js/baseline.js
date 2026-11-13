// js/baseline.js — AEGIS baseline and robust statistics

function median(array) {
  if (!array || !array.length) return 0;
  const sorted = array.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function mad(array) {
  if (!array || !array.length) return 0;
  const med = median(array);
  const deviations = array.map((x) => Math.abs(x - med));
  return median(deviations);
}

function computeBaseline(days, signals, windowSize = 14) {
  if (!days || !days.length) return {};

  const windowDays = days.slice(0, windowSize);
  const sigList =
    signals ||
    Object.keys(windowDays[0] || {}).filter((k) => k !== "day");

  const result = {};

  sigList.forEach((signal) => {
    const values = windowDays
      .map((d) => d[signal])
      .filter((v) => typeof v === "number" && !isNaN(v));

    if (!values.length) {
      result[signal] = { median: 0, scale: 0.01 };
      return;
    }

    const med = median(values);
    const madVal = mad(values);
    const scale = Math.max(1.4826 * madVal, 1e-6 * Math.abs(med), 0.01);

    result[signal] = {
      median: med,
      scale: scale,
    };
  });

  return result;
}

function zScore(value, baselineEntry) {
  if (!baselineEntry || typeof baselineEntry.scale !== "number" || baselineEntry.scale === 0) {
    return 0;
  }
  return (value - baselineEntry.median) / baselineEntry.scale;
}

const AegisBaseline = {
  median,
  mad,
  computeBaseline,
  zScore,
};

if (typeof window !== "undefined") {
  window.AegisBaseline = AegisBaseline;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AegisBaseline;
}
