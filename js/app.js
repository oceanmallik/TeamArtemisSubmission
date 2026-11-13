let crewData = null;
const deliveredDownlinks = [];
let commsIntervalStarted = false;
let commsListenersAttached = false;
let medicalOfficerAffected = false;

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

function formatCountdown(sec) {
  if (sec === null || sec === undefined) return "--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function renderGuidanceBlock(container) {
  if (!container) return;
  const comms = window.AegisComms;
  const delayMin = comms && comms.state ? comms.state.delayMin : 12;
  const blackout = comms && comms.state ? comms.state.blackout : false;

  const guidanceFn =
    (window.AegisGuidance && window.AegisGuidance.getGuidance) ||
    (typeof AegisGuidance !== "undefined" && AegisGuidance.getGuidance);

  if (typeof guidanceFn !== "function") return;

  const guidance = guidanceFn({
    delayMin,
    blackout,
    medicalOfficerAffected,
  });

  if (!guidance) return;

  container.innerHTML = "";

  const titleEl = document.createElement("h4");
  titleEl.className = "guidance-title";
  titleEl.textContent = "Recommended next steps";
  container.appendChild(titleEl);

  const headlineEl = document.createElement("p");
  headlineEl.className = "guidance-headline";

  const modeBadge = document.createElement("span");
  modeBadge.className = `badge badge-mode badge-mode-${guidance.mode} mode-${guidance.mode}`;
  modeBadge.textContent = guidance.mode;

  const headlineText = document.createElement("span");
  headlineText.className = "guidance-headline-text";
  headlineText.textContent = guidance.headline;

  headlineEl.appendChild(modeBadge);
  headlineEl.appendChild(headlineText);
  container.appendChild(headlineEl);

  if (guidance.steps && Array.isArray(guidance.steps)) {
    const list = document.createElement("ol");
    list.className = "guidance-steps";
    guidance.steps.forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  if (guidance.note) {
    const noteEl = document.createElement("p");
    noteEl.className = "guidance-note";
    noteEl.textContent = guidance.note;
    container.appendChild(noteEl);
  }

  const disclaimer = document.createElement("div");
  disclaimer.className = "guidance-disclaimer";
  disclaimer.textContent = "Decision support only. Not medical advice.";
  container.appendChild(disclaimer);
}

function updateGuidanceBlocks() {
  const blocks = document.querySelectorAll(".alert-guidance");
  blocks.forEach((b) => renderGuidanceBlock(b));
}

function renderComms() {
  const comms = window.AegisComms;
  if (!comms) return;

  // Update link badge
  const linkBadge = document.getElementById("link-badge");
  if (linkBadge) {
    const isBlackout = comms.status() === "blackout";
    linkBadge.textContent = isBlackout ? "Blackout" : "Connected";
    linkBadge.className = isBlackout ? "link-blackout" : "link-connected";
  }

  const commsBody = document.getElementById("comms-body");
  if (!commsBody) return;

  let delayInput = document.getElementById("comms-delay");
  let blackoutInput = document.getElementById("comms-blackout");
  let medicalOfficerInput = document.getElementById("comms-medical-officer");
  let speedSelect = document.getElementById("comms-speed");
  let delayDisplay = document.getElementById("comms-delay-display");
  let pendingList = document.getElementById("comms-pending-list");
  let deliveredList = document.getElementById("comms-delivered-list");

  // Inject the downlinks display into #comms-body on first call.
  // Guard on the list element, NOT on delayInput — the hidden sidebar inputs
  // already satisfy getElementById("comms-delay"), which caused the old guard
  // (!delayInput) to always be false and skip both injection and listener setup.
  if (!document.getElementById("comms-pending-list")) {
    commsBody.innerHTML = `
      <div class="comms-subheading">Pending downlinks</div>
      <ul id="comms-pending-list" class="comms-list"></ul>
      <div class="comms-subheading">Delivered downlinks</div>
      <ul id="comms-delivered-list" class="comms-list"></ul>
      <p class="comms-note">Local analysis active. All monitoring works without an Earth link.</p>
    `;
  }

  // Re-query after possible injection (picks up sidebar hidden inputs when present).
  delayInput = document.getElementById("comms-delay");
  blackoutInput = document.getElementById("comms-blackout");
  medicalOfficerInput = document.getElementById("comms-medical-officer");
  speedSelect = document.getElementById("comms-speed");
  delayDisplay = document.getElementById("comms-delay-display");
  pendingList = document.getElementById("comms-pending-list");
  deliveredList = document.getElementById("comms-delivered-list");

  // Register listeners exactly once on whichever inputs are in the DOM.
  // The sidebar proxy (index.html) dispatches native input/change events on
  // these same elements, so the guidance blocks update from sidebar controls too.
  if (!commsListenersAttached && delayInput) {
    delayInput.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      comms.setDelay(val);
      updateDelayDisplay();
      updateGuidanceBlocks();
    });

    if (blackoutInput) {
      blackoutInput.addEventListener("change", (e) => {
        comms.setBlackout(e.target.checked);
        renderComms();
        updateGuidanceBlocks();
      });
    }

    if (medicalOfficerInput) {
      medicalOfficerInput.addEventListener("change", (e) => {
        medicalOfficerAffected = e.target.checked;
        updateGuidanceBlocks();
      });
    }

    if (speedSelect) {
      speedSelect.addEventListener("change", (e) => {
        comms.setSpeed(Number(e.target.value));
        renderComms();
      });
    }

    commsListenersAttached = true;
  }

  function updateDelayDisplay() {
    if (delayDisplay) {
      delayDisplay.textContent = `One-way: ${comms.state.delayMin} min | Round-trip: ${comms.roundTripMin()} min`;
    }
  }

  updateDelayDisplay();

  // Update pending list
  if (pendingList) {
    pendingList.innerHTML = "";
    if (comms.status() === "blackout") {
      const li = document.createElement("li");
      li.className = "comms-empty";
      li.textContent = "Blackout in effect — countdown paused";
      pendingList.appendChild(li);
    } else {
      const pendingItems = comms.pending() || [];
      if (pendingItems.length === 0) {
        const li = document.createElement("li");
        li.className = "comms-empty";
        li.textContent = "No pending downlinks";
        pendingList.appendChild(li);
      } else {
        pendingItems.forEach((entry) => {
          const li = document.createElement("li");
          li.className = "comms-item";

          const titleSpan = document.createElement("span");
          const itemObj = entry.item || entry;
          titleSpan.textContent = itemObj.title || `Day ${itemObj.day} alert`;

          const cdSpan = document.createElement("span");
          cdSpan.className = "comms-countdown";
          cdSpan.textContent = formatCountdown(entry.secondsRemaining);

          li.appendChild(titleSpan);
          li.appendChild(cdSpan);
          pendingList.appendChild(li);
        });
      }
    }
  }

  // Update delivered list
  if (deliveredList) {
    deliveredList.innerHTML = "";
    if (deliveredDownlinks.length === 0) {
      const li = document.createElement("li");
      li.className = "comms-empty";
      li.textContent = "No delivered downlinks";
      deliveredList.appendChild(li);
    } else {
      deliveredDownlinks.forEach((d) => {
        const li = document.createElement("li");
        li.className = "comms-item";

        const titleSpan = document.createElement("span");
        titleSpan.textContent = d.title || `Day ${d.day} alert`;

        const timeSpan = document.createElement("span");
        timeSpan.className = "comms-delivered-time";
        timeSpan.textContent = `Delivered ${d.deliveredAt || ""}`;

        li.appendChild(titleSpan);
        li.appendChild(timeSpan);
        deliveredList.appendChild(li);
      });
    }
  }
}

function startCommsInterval() {
  if (commsIntervalStarted) return;
  commsIntervalStarted = true;

  setInterval(() => {
    if (window.AegisComms && typeof window.AegisComms.tick === "function") {
      const delivered = window.AegisComms.tick();
      if (delivered && delivered.length > 0) {
        delivered.forEach((item) => {
          deliveredDownlinks.unshift({
            ...item,
            deliveredAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          });
        });
      }
      renderComms();
    }
  }, 1000);
}

function renderHazards(member, alerts) {
  const hazardList = document.getElementById("hazard-list");
  if (!hazardList) return;

  hazardList.innerHTML = "";

  const activeAlertSignals = new Set();
  (alerts || []).forEach((alert) => {
    if (alert && alert.signals && Array.isArray(alert.signals)) {
      alert.signals.forEach((sig) => {
        const sigName = typeof sig === "string" ? sig : (sig && sig.name);
        if (sigName) {
          activeAlertSignals.add(sigName);
        }
      });
    }
  });

  const HAZARDS = [
    {
      title: "Isolation and confinement",
      indicators: ["mood", "sleep"],
    },
    {
      title: "Altered gravity",
      indicators: ["hr", "sbp", "dbp", "activity"],
    },
    {
      title: "Hostile closed environment",
      indicators: ["temp", "sleep", "hr"],
    },
    {
      title: "Distance from Earth",
      description: "Addressed by local analysis and the comms link",
      indicators: [],
    },
    {
      title: "Space radiation",
      description: "Not monitored in this prototype",
      indicators: [],
    },
  ];

  HAZARDS.forEach((hazard) => {
    const card = document.createElement("div");
    card.className = "hazard-card";

    const hasActiveAlert =
      hazard.indicators.length > 0 &&
      hazard.indicators.some((ind) => activeAlertSignals.has(ind));

    if (hasActiveAlert) {
      card.classList.add("hazard-alert", "has-alert", "amber-border");
      card.style.borderColor = "var(--amber)";
    }

    const titleEl = document.createElement("h3");
    titleEl.className = "hazard-title";
    titleEl.textContent = hazard.title;
    card.appendChild(titleEl);

    if (hazard.indicators && hazard.indicators.length > 0) {
      const indicatorsDiv = document.createElement("div");
      indicatorsDiv.className = "hazard-indicators";
      indicatorsDiv.innerHTML = `<span class="hazard-label">Related indicators: </span><span class="hazard-signals">${hazard.indicators.join(", ")}</span>`;
      card.appendChild(indicatorsDiv);
    } else if (hazard.description) {
      const descDiv = document.createElement("div");
      descDiv.className = "hazard-description";
      descDiv.textContent = hazard.description;
      card.appendChild(descDiv);
    }

    hazardList.appendChild(card);
  });

  const note = document.createElement("div");
  note.className = "hazard-note";
  note.textContent = "Indicator-to-hazard mapping is a proposal for this prototype, not clinical guidance.";
  hazardList.appendChild(note);
}

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
  const alerts = typeof detectFn === "function" ? (detectFn(days) || []) : [];

  if (alertList) {
    alertList.innerHTML = "";

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

        const conf = alert.confidence || "low";
        const confBadge = document.createElement("span");
        confBadge.className = `badge badge-confidence badge-confidence-${conf} badge-conf-${conf}`;
        confBadge.textContent = conf;

        const daySpan = document.createElement("span");
        daySpan.className = "alert-day";
        daySpan.textContent = `Flight day ${alert.day}`;

        const dur = alert.durationDays || 1;
        const durationSpan = document.createElement("span");
        durationSpan.className = "alert-duration";
        durationSpan.textContent = `Active for ${dur} ${dur === 1 ? "day" : "days"}`;

        header.appendChild(badge);
        header.appendChild(confBadge);
        header.appendChild(daySpan);
        header.appendChild(durationSpan);

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

        const confNoteP = document.createElement("p");
        confNoteP.className = "alert-details-note alert-confidence-note";
        confNoteP.textContent =
          "Confidence is based on how many signals moved and for how long.";
        details.appendChild(confNoteP);

        card.appendChild(details);

        // Decision actions: Acknowledge, Dismiss, Escalate to Earth
        const status = store && typeof store.getStatus === "function"
          ? store.getStatus(member.id, alert.day)
          : null;

        // Recommended next steps (only on undecided alert cards)
        if (!status) {
          const guidanceContainer = document.createElement("div");
          guidanceContainer.className = "alert-guidance";
          renderGuidanceBlock(guidanceContainer);
          card.appendChild(guidanceContainer);
        }

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
              }

              if (action === "escalated" && window.AegisComms && typeof window.AegisComms.enqueue === "function") {
                window.AegisComms.enqueue({
                  crewId: member.id,
                  day: alert.day,
                  title: `Day ${alert.day} alert (${member.name})`,
                  summary: alert.summary,
                });
              }

              render(member);
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

    // Signal watch block
    const currentWatchFn =
      (window.AegisDetect && window.AegisDetect.currentWatch) ||
      (typeof AegisDetect !== "undefined" && AegisDetect.currentWatch);

    if (typeof currentWatchFn === "function") {
      const watch = currentWatchFn(days);
      const watchBlock = document.createElement("div");
      watchBlock.id = "signal-watch";
      watchBlock.className = "signal-watch";

      const watchTitle = document.createElement("h3");
      watchTitle.className = "signal-watch-title";
      watchTitle.textContent = "Signal watch";
      watchBlock.appendChild(watchTitle);

      const watchP = document.createElement("p");
      watchP.className = "signal-watch-text";

      if (!watch || !watch.signals || watch.signals.length === 0) {
        watchP.textContent = "No signals moving away from baseline.";
      } else {
        const count = watch.signals.length;
        const signalParts = watch.signals.map((s) => {
          const name = SIGNAL_NAMES[s.name] || s.name;
          const zSign = s.z >= 0 ? "+" : "";
          const zVal = s.z.toFixed(1);
          const devWord = Math.abs(Number(zVal)) === 1 ? "deviation" : "deviations";
          const dayWord = s.daysOff === 1 ? "day" : "days";
          return `${name} (${zSign}${zVal} ${devWord} for ${s.daysOff} ${dayWord})`;
        });

        if (!watch.alertActive) {
          watchP.textContent = `${count} ${count === 1 ? "signal" : "signals"} moved: ${signalParts.join(", ")}. No alert yet, because one signal alone is not enough.`;
        } else {
          watchP.textContent = `${count} ${count === 1 ? "signal" : "signals"} moved: ${signalParts.join(", ")}. Alert episode active.`;
        }
      }

      watchBlock.appendChild(watchP);
      alertList.appendChild(watchBlock);
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

  // Refresh Comms panel
  renderComms();
  startCommsInterval();

  // Render Mission Hazards
  renderHazards(member, alerts);
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

  // Initial comms and hazards rendering
  renderComms();
  startCommsInterval();
  renderHazards(null, []);

  // Offline ready listener
  initOfflineReady();
}

function initOfflineReady() {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    function showBadge() {
      const badge = document.getElementById("offline-badge");
      if (badge) {
        badge.style.display = "inline-flex";
      }
    }

    if (navigator.serviceWorker.controller) {
      showBadge();
    }

    if (navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(() => showBadge()).catch(() => {});
    }

    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data && e.data.type === "OFFLINE_READY") {
        showBadge();
      }
    });
  }
}

init();

window.render = render;
window.renderHazards = renderHazards;
window.initOfflineReady = initOfflineReady;
