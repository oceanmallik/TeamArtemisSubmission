let crewData = null;

const SIGNAL_NAMES = {
  hr: "Heart rate",
  sbp: "Systolic BP",
  dbp: "Diastolic BP",
  glucose: "Glucose",
  temp: "Temperature",
  sleep: "Sleep",
  mood: "Mood",
  activity: "Activity",
};

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

  // Access store & detector
  const store = window.AegisStore || (typeof AegisStore !== "undefined" ? AegisStore : null);
  const detectFn =
    (window.AegisDetect && window.AegisDetect.detect) ||
    (typeof AegisDetect !== "undefined" && AegisDetect.detect);

  // Multi-signal deviation detection & Alerts
  const alertList = document.getElementById("alert-list");
  if (alertList && typeof detectFn === "function") {
    alertList.innerHTML = "";
    const alerts = detectFn(days);

    if (!alerts || alerts.length === 0) {
      const emptyMsg = document.createElement("p");
      emptyMsg.className = "alert-empty";
      emptyMsg.textContent = "All signals within personal baseline";
      alertList.appendChild(emptyMsg);
    } else {
      alerts.forEach((alert) => {
        const card = document.createElement("div");
        card.className = `alert-card alert-${alert.level}`;

        const header = document.createElement("div");
        header.className = "alert-card-header";

        const badge = document.createElement("span");
        badge.className = `badge badge-${alert.level}`;
        badge.textContent = alert.level;

        const daySpan = document.createElement("span");
        daySpan.className = "alert-day";
        daySpan.textContent = `Flight day ${alert.day}`;

        header.appendChild(badge);
        header.appendChild(daySpan);

        const summaryP = document.createElement("p");
        summaryP.className = "alert-summary";
        summaryP.textContent = alert.summary;

        card.appendChild(header);
        card.appendChild(summaryP);

        // Details element: "Why was this flagged?"
        const details = document.createElement("details");
        details.className = "alert-details";

        const summaryEl = document.createElement("summary");
        summaryEl.textContent = "Why was this flagged?";
        details.appendChild(summaryEl);

        const table = document.createElement("table");
        table.className = "alert-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Signal", "Now", "Personal baseline", "Deviation"].forEach((colName) => {
          const th = document.createElement("th");
          th.textContent = colName;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        (alert.signals || []).forEach((sig) => {
          const row = document.createElement("tr");

          const tdSignal = document.createElement("td");
          tdSignal.textContent = SIGNAL_NAMES[sig.name] || sig.name;

          const unitStr = units[sig.name] ? ` ${units[sig.name]}` : "";

          const tdNow = document.createElement("td");
          tdNow.textContent = `${sig.value}${unitStr}`;

          const tdBase = document.createElement("td");
          tdBase.textContent = `${sig.baselineMedian}${unitStr}`;

          const tdDev = document.createElement("td");
          const sign = sig.z >= 0 ? "+" : "";
          tdDev.textContent = `${sign}${sig.z.toFixed(1)}`;

          row.appendChild(tdSignal);
          row.appendChild(tdNow);
          row.appendChild(tdBase);
          row.appendChild(tdDev);
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        details.appendChild(table);

        const noteP = document.createElement("p");
        noteP.className = "alert-details-note";
        noteP.textContent =
          "Flagged because 2 or more signals moved away from this person's own normal at the same time.";
        details.appendChild(noteP);

        card.appendChild(details);

        // Decision actions: Acknowledge, Dismiss, Escalate to Earth
        const status = store && typeof store.getStatus === "function"
          ? store.getStatus(member.id, alert.day)
          : null;

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "alert-actions";

        const btnGroup = document.createElement("div");
        btnGroup.className = "alert-btn-group";

        const actionButtons = [
          { label: "Acknowledge", action: "acknowledged" },
          { label: "Dismiss", action: "dismissed" },
          { label: "Escalate to Earth", action: "escalated" },
        ];

        actionButtons.forEach(({ label, action }) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `btn btn-${action}`;
          btn.textContent = label;

          if (status) {
            btn.disabled = true;
          } else {
            btn.addEventListener("click", () => {
              if (store && typeof store.logDecision === "function") {
                store.logDecision({
                  crewId: member.id,
                  day: alert.day,
                  action: action,
                });
                render(member);
              }
            });
          }

          btnGroup.appendChild(btn);
        });

        actionsDiv.appendChild(btnGroup);

        if (status) {
          const statusDiv = document.createElement("div");
          statusDiv.className = `alert-status alert-status-${status}`;
          const displayText =
            status === "escalated"
              ? "Queued for downlink"
              : status.charAt(0).toUpperCase() + status.slice(1);
          statusDiv.textContent = displayText;
          actionsDiv.appendChild(statusDiv);
        }

        card.appendChild(actionsDiv);
        alertList.appendChild(card);
      });
    }

    const disclaimer = document.createElement("div");
    disclaimer.className = "alert-disclaimer";
    disclaimer.textContent = "Decision support only. Not a medical diagnosis.";
    alertList.appendChild(disclaimer);
  }

  // Decision log list: newest first (time, Day N, action)
  const decisionLog = document.getElementById("decision-log");
  if (decisionLog) {
    decisionLog.innerHTML = "";
    const decisions = store && typeof store.getDecisions === "function"
      ? store.getDecisions(member.id)
      : [];

    if (!decisions || decisions.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "decision-empty";
      emptyLi.textContent = "No decisions logged";
      decisionLog.appendChild(emptyLi);
    } else {
      decisions.forEach((d) => {
        const li = document.createElement("li");
        li.className = `decision-item decision-${d.action}`;

        const timeSpan = document.createElement("span");
        timeSpan.className = "decision-time";
        const dateObj = new Date(d.time);
        const formattedTime = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : d.time;
        timeSpan.textContent = formattedTime;

        const daySpan = document.createElement("span");
        daySpan.className = "decision-day";
        daySpan.textContent = `Day ${d.day}`;

        const actionSpan = document.createElement("span");
        actionSpan.className = `decision-action decision-action-${d.action}`;
        actionSpan.textContent = d.action;

        li.appendChild(timeSpan);
        li.appendChild(daySpan);
        li.appendChild(actionSpan);
        decisionLog.appendChild(li);
      });
    }
  }
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
