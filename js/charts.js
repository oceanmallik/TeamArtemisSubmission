// js/charts.js — AEGIS line chart renderer
window.AegisCharts = window.AegisCharts || {};

window.AegisCharts.lineChart = function (container, options) {
  const el = typeof container === "string" ? document.querySelector(container) : container;
  if (!el) return;

  el.innerHTML = "";

  if (!options || !options.series || !options.series.length) {
    return;
  }

  // Collect all numerical values for auto-scaling
  const allValues = [];
  options.series.forEach((s) => {
    if (Array.isArray(s.values)) {
      s.values.forEach((v) => {
        if (typeof v === "number" && !isNaN(v)) {
          allValues.push(v);
        }
      });
    }
  });

  if (options.band) {
    if (typeof options.band.low === "number" && !isNaN(options.band.low)) {
      allValues.push(options.band.low);
    }
    if (typeof options.band.high === "number" && !isNaN(options.band.high)) {
      allValues.push(options.band.high);
    }
  }

  let minVal = allValues.length ? Math.min(...allValues) : 0;
  let maxVal = allValues.length ? Math.max(...allValues) : 100;
  if (minVal === maxVal) {
    minVal -= 1;
    maxVal += 1;
  }

  const span = maxVal - minVal;
  const padding = span * 0.1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const yRange = yMax - yMin;

  const width = 400;
  const height = 160;
  const marginLeft = 40;
  const marginRight = 16;
  const marginTop = 14;
  const marginBottom = 24;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "auto");
  svg.setAttribute("role", "img");

  const seriesLabels = options.series
    .map((s) => s.label)
    .filter(Boolean)
    .join(" and ");
  const unitText = options.unit ? ` (${options.unit})` : "";
  svg.setAttribute("aria-label", seriesLabels ? `${seriesLabels} chart${unitText}` : `Data chart${unitText}`);

  // Optional baseline band
  if (
    options.band &&
    typeof options.band.low === "number" &&
    typeof options.band.high === "number"
  ) {
    const normHigh = (options.band.high - yMin) / yRange;
    const normLow = (options.band.low - yMin) / yRange;
    const yHigh = marginTop + plotHeight * (1 - normHigh);
    const yLow = marginTop + plotHeight * (1 - normLow);
    const bandTop = Math.min(yHigh, yLow);
    const bandHeight = Math.abs(yLow - yHigh);

    const bandRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bandRect.setAttribute("x", marginLeft);
    bandRect.setAttribute("y", bandTop);
    bandRect.setAttribute("width", plotWidth);
    bandRect.setAttribute("height", Math.max(bandHeight, 1));
    bandRect.setAttribute("fill", "var(--accent)");
    bandRect.setAttribute("opacity", "0.12");
    svg.appendChild(bandRect);
  }

  function formatVal(v) {
    if (Math.abs(v) >= 100) {
      return Math.round(v).toString();
    }
    if (Number.isInteger(v)) {
      return v.toString();
    }
    return (Math.round(v * 10) / 10).toString();
  }

  // 3 labeled gridlines
  for (let i = 0; i < 3; i++) {
    const yPos = marginTop + (plotHeight * i) / 2;
    const val = yMax - (yRange * i) / 2;

    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", marginLeft);
    gridLine.setAttribute("y1", yPos);
    gridLine.setAttribute("x2", width - marginRight);
    gridLine.setAttribute("y2", yPos);
    gridLine.setAttribute("stroke", "var(--line)");
    gridLine.setAttribute("stroke-width", "1");
    gridLine.setAttribute("stroke-dasharray", "3 3");
    svg.appendChild(gridLine);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", marginLeft - 6);
    label.setAttribute("y", yPos);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "central");
    label.setAttribute("fill", "var(--dim)");
    label.setAttribute("font-family", "var(--mono)");
    label.setAttribute("font-size", "9");
    label.textContent = formatVal(val);
    svg.appendChild(label);
  }

  // X axis labels (first and last day number)
  const maxLen = Math.max(...options.series.map((s) => (s.values || []).length), 0);
  let firstDay = 1;
  let lastDay = 1;

  if (options.days && Array.isArray(options.days) && options.days.length > 0) {
    firstDay = options.days[0];
    lastDay = options.days[options.days.length - 1];
  } else if (options.firstDay !== undefined && options.lastDay !== undefined) {
    firstDay = options.firstDay;
    lastDay = options.lastDay;
  } else {
    firstDay = 1;
    lastDay = maxLen || 1;
  }

  function formatDay(d) {
    if (d === undefined || d === null) return "";
    const str = String(d).trim();
    return /^day\b/i.test(str) ? str : `Day ${str}`;
  }

  const xLabelY = height - 8;

  const firstText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  firstText.setAttribute("x", marginLeft);
  firstText.setAttribute("y", xLabelY);
  firstText.setAttribute("text-anchor", "start");
  firstText.setAttribute("fill", "var(--dim)");
  firstText.setAttribute("font-family", "var(--mono)");
  firstText.setAttribute("font-size", "9");
  firstText.textContent = formatDay(firstDay);
  svg.appendChild(firstText);

  const lastText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  lastText.setAttribute("x", width - marginRight);
  lastText.setAttribute("y", xLabelY);
  lastText.setAttribute("text-anchor", "end");
  lastText.setAttribute("fill", "var(--dim)");
  lastText.setAttribute("font-family", "var(--mono)");
  lastText.setAttribute("font-size", "9");
  lastText.textContent = formatDay(lastDay);
  svg.appendChild(lastText);

  // Polylines
  const STROKE_COLORS = ["var(--accent)", "var(--amber)", "var(--cyan)", "var(--red)"];

  options.series.forEach((s, sIndex) => {
    const vals = s.values || [];
    if (!vals.length) return;

    const points = vals.map((v, i) => {
      const x = maxLen > 1 ? marginLeft + (plotWidth * i) / (maxLen - 1) : marginLeft + plotWidth / 2;
      const norm = yRange > 0 ? (v - yMin) / yRange : 0.5;
      const y = marginTop + plotHeight * (1 - norm);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", STROKE_COLORS[sIndex % STROKE_COLORS.length]);
    polyline.setAttribute("stroke-width", "2");
    polyline.setAttribute("stroke-linecap", "round");
    polyline.setAttribute("stroke-linejoin", "round");
    polyline.setAttribute("points", points.join(" "));
    svg.appendChild(polyline);
  });

  el.appendChild(svg);

  // Latest value display below the SVG
  const statsDiv = document.createElement("div");
  statsDiv.className = "chart-stats";
  statsDiv.style.fontFamily = "var(--mono)";
  statsDiv.style.fontSize = "0.9rem";
  statsDiv.style.marginTop = "8px";
  statsDiv.style.color = "var(--text)";

  const statTexts = options.series.map((s) => {
    const lastVal = s.values && s.values.length ? s.values[s.values.length - 1] : "--";
    const unit = options.unit ? ` ${options.unit}` : "";
    if (options.series.length > 1 && s.label) {
      return `${s.label}: ${lastVal}${unit}`;
    }
    return `${lastVal}${unit}`;
  });

  statsDiv.textContent = statTexts.join("   ");
  el.appendChild(statsDiv);
};
