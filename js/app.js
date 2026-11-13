let crewData = null;

function render(member) {
  if (!member) return;
  console.log(member.name, member.days ? member.days.length : 0);

  const lineChart =
    (window.AegisCharts && window.AegisCharts.lineChart) ||
    (typeof AegisCharts !== "undefined" && AegisCharts.lineChart);

  if (typeof lineChart !== "function") {
    console.warn("AegisCharts.lineChart is not available");
    return;
  }

  const days = member.days || [];
  const defaultUnits = {
    hr: "bpm",
    sbp: "mmHg",
    dbp: "mmHg",
    glucose: "mg/dL",
    temp: "°C",
    sleep: "h",
    mood: "1-5",
    activity: "steps",
  };
  const units = Object.assign({}, defaultUnits, crewData ? crewData.units : {});

  const charts = [
    {
      id: "chart-hr",
      series: [{ label: "hr", values: days.map((d) => d.hr) }],
      unit: units.hr,
    },
    {
      id: "chart-bp",
      series: [
        { label: "sbp", values: days.map((d) => d.sbp) },
        { label: "dbp", values: days.map((d) => d.dbp) },
      ],
      unit: units.sbp || units.dbp,
    },
    {
      id: "chart-glucose",
      series: [{ label: "glucose", values: days.map((d) => d.glucose) }],
      unit: units.glucose,
    },
    {
      id: "chart-temp",
      series: [{ label: "temp", values: days.map((d) => d.temp) }],
      unit: units.temp,
    },
    {
      id: "chart-sleep",
      series: [{ label: "sleep", values: days.map((d) => d.sleep) }],
      unit: units.sleep,
    },
    {
      id: "chart-mood",
      series: [{ label: "mood", values: days.map((d) => d.mood) }],
      unit: units.mood,
    },
    {
      id: "chart-activity",
      series: [{ label: "activity", values: days.map((d) => d.activity) }],
      unit: units.activity,
    },
  ];

  charts.forEach((chart) => {
    const el = document.getElementById(chart.id);
    if (el) {
      lineChart(el, {
        series: chart.series,
        unit: chart.unit,
      });
    }
  });
}

function init() {
  const crewSelect = document.getElementById("crew-select");
  const appMain = document.getElementById("app");

  fetch("data/crew.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      crewData = data;
      window.crewData = data;

      if (crewSelect && data.crew && Array.isArray(data.crew)) {
        crewSelect.innerHTML = "";
        data.crew.forEach((member) => {
          const option = document.createElement("option");
          option.value = member.id;
          option.textContent = member.name;
          crewSelect.appendChild(option);
        });

        if (data.crew.length > 0) {
          render(data.crew[0]);
        }
      }
    })
    .catch((error) => {
      console.error("Error loading crew data:", error);
      if (appMain) {
        appMain.innerHTML = `
          <div class="panel" style="grid-column: 1 / -1; color: var(--red);">
            <h2>Unable to Load Data</h2>
            <p>Error loading crew data. The page must be served via a local server (e.g., run <code>python3 -m http.server 8000</code>) due to browser security restrictions on local file requests.</p>
          </div>
        `;
      }
    });

  if (crewSelect) {
    crewSelect.addEventListener("change", (e) => {
      if (crewData && Array.isArray(crewData.crew)) {
        const member = crewData.crew.find((m) => m.id === e.target.value);
        if (member) {
          render(member);
        }
      }
    });
  }
}

init();

window.render = render;
