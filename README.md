# AEGIS
 
An offline-first astronaut health-monitoring prototype built for the NASA Space Apps Challenge 2026.

> **Notice:** Decision support prototype only. Not a medical device. All physiological and behavioral data is simulated.

---

## 1. Overview

AEGIS is an offline-first dashboard designed to monitor astronaut health during deep-space exploration missions (such as Artemis and future Mars transits) where communication latency with Mission Control makes real-time telemedicine impossible.

The system establishes an individualized 14-day baseline for each crew member across eight physiological and behavioral indicators. It continuously evaluates incoming telemetry using robust statistical deviation metrics and triggers alerts only when two or more independent signals deviate simultaneously for at least three consecutive days. 

When deviations occur, AEGIS delivers clinical decision support procedures that dynamically adapt to one-way communication latency—ranging from immediate Earth consultation during low delays, to parallel workflows, to fully autonomous onboard protocols during communication blackouts. Astronauts can log decisions, queue reports for downlink to Earth over simulated transmission delays, inspect multi-signal deviation breakdowns, and map indicators to NASA's human spaceflight hazard framework.

---

## 2. Getting Started

### Prerequisites
- Python 3 (to serve static files locally)
- Node.js (v16+, to run unit tests and data generator)

### Running the App Locally
Because modern browsers enforce CORS restrictions on `fetch()` calls under the `file://` protocol, the application must be served via a local web server:

```bash
# Start local server from project root
python3 -m http.server 8000
```
Open your browser and navigate to: `http://localhost:8000`

### Running the Test Suite
AEGIS contains test suites covering statistics, communications simulation, deviation detection, and clinical guidance:

```bash
for f in tests/*.test.js; do node "$f" && echo "PASS $f"; done
```

---

## 3. Feature Inventory

| Feature | Description | UI Location | Key Files | Status |
|---|---|---|---|---|
| **Data Loading** | Loads 60 days of simulated health telemetry and measurement units for 4 crew members from local JSON. | App initialization | [js/app.js](js/app.js), [data/crew.json](data/crew.json) | **WORKING** |
| **Crew Selector** | Switches active crew member (A1–A4), immediately refreshing charts, alerts, action log, and hazard correlations. | Sidebar dropdown (`#crew-select`) | [js/app.js](js/app.js), [index.html](index.html) | **WORKING** |
| **Signal Charts** | Draws SVG polyline charts of 60-day telemetry with labeled gridlines, measurement units, and latest values. | Telemetry tab (`#tab-telemetry`, `#indicators`) | [js/charts.js](js/charts.js), [js/app.js](js/app.js) | **WORKING** |
| **Signal Toggles** | Toggles individual signals on or off, hiding or showing corresponding chart panels and updating the active signal counter. | Sidebar chip grid (`.chip-grid .chip`), Active Signals metric (`#info-active-signals`) | [index.html](index.html), [css/style.css](css/style.css) | **WORKING** |
| **Disabled O₂ Indicator** | Displays a disabled chip with tooltip explaining that blood oxygen saturation is unmonitored in this prototype. | Sidebar chip grid (`button[data-module="o2"]`) | [index.html](index.html), [css/style.css](css/style.css) | **WORKING** |
| **Personal Baseline Computation** | Computes median and Median Absolute Deviation (MAD) scale for each signal over the first 14 flight days. | Background engine; values shown in alert breakdown tables | [js/baseline.js](js/baseline.js) | **WORKING** |
| **Multi-Signal Deviation Detection** | Evaluates days 15–60 and triggers alerts only when 2+ signals deviate beyond threshold for $\ge 3$ consecutive days. | Alerts tab (`#alert-list`) | [js/detect.js](js/detect.js), [js/app.js](js/app.js) | **WORKING** |
| **Alert Severity Levels** | Classifies alerts as "watch" (2 deviating signals) or "attention" (3+ deviating signals). | Alert card header badge (`.badge-watch`, `.badge-attention`) | [js/detect.js](js/detect.js), [js/app.js](js/app.js) | **WORKING** |
| **Confidence and Duration** | Tracks consecutive days an alert episode lasts and assigns a confidence tier ("low", "medium", "high"). | Alert card header badges (`.badge-confidence`, `.alert-duration`) | [js/detect.js](js/detect.js), [js/app.js](js/app.js) | **WORKING** |
| **"Why Was This Flagged?"** | Expands an accordion detailing each deviating signal's current reading, personal baseline median, and z-score. | Alert card expandable details (`<details class="alert-details">`) | [js/app.js](js/app.js) | **WORKING** |
| **Signal Watch** | Identifies single-signal deviations meeting the 3-day persistence rule and explains why no alert was fired. | Alerts tab, bottom panel (`#signal-watch`) | [js/detect.js](js/detect.js), [js/app.js](js/app.js) | **WORKING** |
| **Comms-Aware Guidance** | Displays procedural steps that adapt dynamically to latency and blackout states ("ask-earth", "parallel", "autonomous"). | Undecided alert cards (`.alert-guidance`) | [js/guidance.js](js/guidance.js), [js/app.js](js/app.js) | **WORKING** |
| **Medical Officer Status** | Adjusts procedural guidance steps to assign an alternate crew member if the medical officer is the affected crew member. | Sidebar segmented control (`#med-unaffected`, `#med-affected`) | [js/guidance.js](js/guidance.js), [js/app.js](js/app.js) | **WORKING** |
| **Decision Actions** | Provides action buttons on open alerts to Acknowledge, Dismiss, or Escalate to Earth. | Alert card footer (`.alert-btn-group button`) | [js/app.js](js/app.js), [js/store.js](js/store.js) | **WORKING** |
| **Action Log** | Chronologically logs all crew decisions with timestamps and flight days, persisting to localStorage. | Alerts tab, "Decision Record / Action Log" panel (`#decisions`) | [js/app.js](js/app.js), [js/store.js](js/store.js) | **WORKING** |
| **Reset Demo Button** | Prompts confirmation, clears persisted decisions, flushes comms queues, and re-renders alerts and comms. | Action Log panel footer (`#btn-reset-demo`) | [js/app.js](js/app.js), [index.html](index.html) | **WORKING** |
| **Comms Delay Simulation** | Adjusts one-way latency (3–22 min), calculates round-trip time, and dynamically shifts guidance modes. | Sidebar dropdown (`#comms-delay-sidebar`), Top info strip (`#info-earth-delay`), Comms tab | [js/comms.js](js/comms.js), [js/app.js](js/app.js) | **WORKING** |
| **Blackout Simulation** | Toggles communication blackout, pausing downlink countdowns and forcing guidance into autonomous mode. | Sidebar dropdown (`#comms-mode`), Topnav status badge (`#link-badge`) | [js/comms.js](js/comms.js), [js/app.js](js/app.js) | **WORKING** |
| **Downlink Queue & Simulation Speed** | Simulates transmission of escalated alerts with countdown timers, delivery log, and 1× vs 60× speed multiplier. | Comms tab (`#tab-comms`), pending list (`#comms-pending-list`), delivered list (`#comms-delivered-list`) | [js/comms.js](js/comms.js), [js/app.js](js/app.js) | **WORKING** |
| **NASA 5-Hazards Mapping** | Maps active physiological alert signals to NASA's five human spaceflight hazard categories with amber alert highlights. | Hazards tab (`#tab-hazards`, `#hazard-list`) | [js/app.js](js/app.js) | **WORKING** |
| **Offline Support** | Caches app shell in browser cache for offline use and displays an "Offline ready" indicator badge. | Header badge (`#offline-badge`), Service worker cache | [sw.js](sw.js), [manifest.webmanifest](manifest.webmanifest) | **WORKING** |
| **Animated Starfield Canvas** | Draws 3 parallax drifting star layers with twinkle and neon accent glow on a background canvas. | Background canvas (`#star-canvas`) | [js/stars.js](js/stars.js), [css/style.css](css/style.css) | **WORKING** |
| **Tab Navigation** | Switches visible panel between Telemetry, Alerts, Hazards, and Comms views. | Top navigation pill tabs (`.topnav__tab`) | [index.html](index.html) | **WORKING** |
| **Favicon Integration** | Displays vector SVG logomark with multi-resolution `.ico` fallback for browser tabs and web app manifest. | Browser tab / URL bar | [index.html](index.html), [favicon.svg](favicon.svg), [manifest.webmanifest](manifest.webmanifest) | **WORKING** |
| **Flight Day Metric** | Intended to display latest mission flight day in top telemetry bar, but updater function is uncalled. | Top info strip (`#info-flight-day`) | [index.html](index.html) | **PARTIAL** |
| **Baseline Normal Band Rendering** | Chart drawing code includes shading support for normal baseline envelopes, but caller never supplies band parameters. | Telemetry chart SVGs | [js/charts.js](js/charts.js), [js/app.js](js/app.js) | **NOT CONNECTED** |

---

## 4. Detection Logic & Statistical Rules

The anomaly detection engine ([js/baseline.js](js/baseline.js) and [js/detect.js](js/detect.js)) uses the following clinical and statistical rules:

1. **Baseline Window**:
   - The first 14 flight days (days 1–14) serve as the individual's baseline calibration window.
   - For each signal, the engine computes:
     - **Median**: middle value of sorted window values.
     - **Median Absolute Deviation (MAD)**: $\text{MAD} = \text{median}(|x_i - \text{median}(X)|)$.
     - **Normal Scale Factor**: $\text{Scale} = \max(1.4826 \times \text{MAD}, 10^{-6} \times |\text{median}|, 0.01)$. The factor $1.4826$ ensures asymptotic consistency with standard deviation under a normal distribution while remaining robust against transient spikes.

2. **Robust Z-Score Normalization**:
   - For all readings from flight day 15 onward, deviation is measured as:
     $$Z = \frac{\text{Value} - \text{Baseline Median}}{\text{Scale}}$$

3. **Directional Anomaly Criteria**:
   - A signal is flagged as anomalous on day $d$ only when crossing clinical thresholds in expected pathological directions:
     - **Elevations only ($Z \ge +2.5$)**: Heart rate (`hr`), Systolic Blood Pressure (`sbp`), Diastolic Blood Pressure (`dbp`), Core Temperature (`temp`).
     - **Depressions only ($Z \le -2.5$)**: Sleep duration (`sleep`), Mood rating (`mood`), Daily step count (`activity`).
     - **Bidirectional ($|Z| \ge 2.5$)**: Blood Glucose (`glucose`).

4. **Persistence Rule ($\ge 3$ Consecutive Days)**:
   - A signal must remain anomalous for at least 3 consecutive days before it is counted as actively deviating. Transient fluctuations of 1 or 2 days are treated as physiological noise.

5. **Multi-Signal Requirement ($\ge 2$ Simultaneous Signals)**:
   - An alert episode is created only when **two or more independent signals** concurrently satisfy the 3-day persistence rule on the same day. Isolated single-signal changes never trigger an alert (they are tracked in the Signal Watch panel).

6. **Alert Severity, Confidence, and Episode Lifecycle**:
   - **Severity**: Flagged as `attention` if $\ge 3$ signals deviate simultaneously; flagged as `watch` if exactly 2 signals deviate.
   - **Confidence Tiers**:
     - `high`: Maximum simultaneous signals $\ge 3$ and episode lasted $\ge 5$ days.
     - `medium`: Maximum simultaneous signals $\ge 2$ and episode lasted $\ge 3$ days.
     - `low`: Any other active alert episode.
   - **Episode Conclusion**: An alert episode terminates on the first day where fewer than two signals remain abnormal.

---

## 5. Simulated Dataset

Data is stored in [data/crew.json](data/crew.json) and generated by [tools/make-data.js](tools/make-data.js) using deterministic pseudo-random seeds and Gaussian Box-Muller transforms.

### Crew Profiles (60 Days Telemetry)
- **A1 ("Crew A", seed 11)**: Simulates physiological drift/illness starting day 45 (HR +9 bpm, temp +0.7 °C, sleep −1.6 h, activity −2800 steps). Triggers 1 high-confidence `attention` alert lasting 13 days.
- **A2 ("Crew B", seed 22)**: Simulates isolated sleep disturbance starting day 45 (sleep −1.6 h). Triggers **0 alerts** (caught by Signal Watch as single-signal deviation).
- **A3 ("Crew C", seed 33)**: Healthy control profile with normal physiological variance. Triggers **0 alerts**; Signal Watch reports all signals within baseline.
- **A4 ("Crew D", seed 44)**: Simulates confinement/isolation stress starting day 40 (mood −1.5, sleep −1.3 h, SBP +10 mmHg, activity −2200 steps). Triggers 2 alert episodes (`watch` on day 43, escalating to `attention` on day 44).

### Monitored Indicators

| Signal Key | Name | Clinical Unit | Recorded Decimals | Anomaly Direction |
|---|---|---|---|---|
| `hr` | Heart rate | bpm | 1 | Elevated ($Z \ge +2.5$) |
| `sbp` | Systolic Blood Pressure | mmHg | 0 | Elevated ($Z \ge +2.5$) |
| `dbp` | Diastolic Blood Pressure | mmHg | 0 | Elevated ($Z \ge +2.5$) |
| `glucose` | Blood Glucose | mg/dL | 0 | Bidirectional ($|Z| \ge 2.5$) |
| `temp` | Core Body Temperature | °C | 2 | Elevated ($Z \ge +2.5$) |
| `sleep` | Sleep Duration | h | 2 | Depressed ($Z \le -2.5$) |
| `mood` | Psychological Mood Score | 1–5 scale | 1 | Depressed ($Z \le -2.5$) |
| `activity` | Physical Activity | steps | 0 | Depressed ($Z \le -2.5$) |
| `o2` | Blood Oxygen (SpO₂) | % | — | *Unmonitored in prototype* |

---

## 6. Architecture & External Dependencies

- **Zero Runtime Frameworks / Libraries**: The entire frontend is written in vanilla JavaScript (ES6+), HTML5, and CSS3. There are no dependencies on React, Vue, D3, Chart.js, Bootstrap, or npm packages in the client runtime.
- **Typography & Font Fallbacks**: Google Fonts CDN loads `Inter Tight`, `JetBrains Mono`, and `Space Grotesk`. If internet is unavailable, CSS provides fallbacks to local system fonts (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `ui-monospace`, `Menlo`, `Consolas`).
- **Offline PWA Architecture**:
  - [sw.js](sw.js) caches core application assets on service worker install and intercepts fetch requests with a cache-first strategy.
  - [manifest.webmanifest](manifest.webmanifest) provides web app metadata for standalone browser display.
  - An "Offline ready" badge appears in the top navigation bar when the service worker is active.

---

## 7. Known Limitations & Technical Gaps

1. **Confidence Tier Mismatch**: The static "Alert Classification" informational card in [index.html](index.html) lists rule thresholds (`2 signals, 1 day`, `3+ signals or 2 days`, `4+ signals or 3+ days`) that differ from the actual code thresholds in [js/detect.js](js/detect.js) (`$\ge 3$ signals and $\ge 5$ days` for high; `$\ge 2$ signals and $\ge 3$ days` for medium).
2. **Uncalled Flight Day Counter**: The `#info-flight-day` counter in the top telemetry bar remains rendered as an em-dash (`—`). A helper function `updateFlightDay()` exists in [index.html](index.html), but is not called during render.
3. **Dormant Baseline Band Feature**: [js/charts.js](js/charts.js) has rendering support for shaded baseline reference bands (`options.band`), but [js/app.js](js/app.js) does not supply band parameters.
4. **Static Space Radiation & Distance Hazard Cards**: In the Hazards tab, "Distance from Earth" and "Space radiation" cards contain empty indicator arrays and do not dynamically highlight during alert episodes.
5. **Starfield Canvas Cache**: `js/stars.js` is omitted from `APP_FILES` in [sw.js](sw.js), meaning the background starfield canvas may not load if first launched in an air-gapped environment.

---

## 8. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
