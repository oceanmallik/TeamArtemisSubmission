const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { detect, currentWatch } = require("../js/detect.js");

const dataPath = path.join(__dirname, "../data/crew.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const crewA1 = data.crew.find((c) => c.id === "A1");
const crewA2 = data.crew.find((c) => c.id === "A2");
const crewA3 = data.crew.find((c) => c.id === "A3");
const crewA4 = data.crew.find((c) => c.id === "A4");

assert.ok(crewA1, "Crew A1 must exist in data/crew.json");
assert.ok(crewA2, "Crew A2 must exist in data/crew.json");
assert.ok(crewA3, "Crew A3 must exist in data/crew.json");
assert.ok(crewA4, "Crew A4 must exist in data/crew.json");

const alertsA1 = detect(crewA1.days);
const alertsA2 = detect(crewA2.days);
const alertsA3 = detect(crewA3.days);
const alertsA4 = detect(crewA4.days);

// Rule: A1 and A4 must each produce at least one alert; A2 and A3 must produce none
assert.ok(alertsA1.length >= 1, `A1 should produce at least one alert, got ${alertsA1.length}`);
assert.ok(alertsA4.length >= 1, `A4 should produce at least one alert, got ${alertsA4.length}`);
assert.strictEqual(alertsA2.length, 0, `A2 should produce 0 alerts, got ${alertsA2.length}`);
assert.strictEqual(alertsA3.length, 0, `A3 should produce 0 alerts, got ${alertsA3.length}`);

// Check alert shape on A1
const alert1 = alertsA1[0];
assert.strictEqual(typeof alert1.day, "number", "Alert day should be a number");
assert.ok(["watch", "attention"].includes(alert1.level), "Alert level should be 'watch' or 'attention'");
assert.ok(Array.isArray(alert1.signals), "Alert signals should be an array");
assert.ok(alert1.signals.length >= 2, "Alert must contain at least 2 deviating signals");

alert1.signals.forEach((s) => {
  assert.strictEqual(typeof s.name, "string", "Signal name should be a string");
  assert.strictEqual(typeof s.value, "number", "Signal value should be a number");
  assert.strictEqual(typeof s.baselineMedian, "number", "Signal baselineMedian should be a number");
  assert.strictEqual(typeof s.z, "number", "Signal z should be a number");
});

assert.strictEqual(typeof alert1.summary, "string", "Alert summary should be a string");
assert.ok(alert1.summary.length > 0, "Alert summary should not be empty");

// Check durationDays and confidence on A1
assert.strictEqual(typeof alert1.durationDays, "number", "Alert durationDays should be a number");
assert.ok(alert1.durationDays >= 1, "Alert durationDays should be >= 1");
assert.strictEqual(alert1.confidence, "high", "A1's alert has confidence 'high'");

// Check alert shape on A4
const alert4 = alertsA4[0];
assert.strictEqual(typeof alert4.day, "number");
assert.ok(["watch", "attention"].includes(alert4.level));
assert.ok(Array.isArray(alert4.signals));
assert.ok(alert4.signals.length >= 2);
assert.strictEqual(typeof alert4.summary, "string");
assert.strictEqual(typeof alert4.durationDays, "number");
assert.ok(["high", "medium", "low"].includes(alert4.confidence));

// Test currentWatch
const watchA1 = currentWatch(crewA1.days);
assert.strictEqual(watchA1.alertActive, true, "A1 currentWatch alertActive should be true");
assert.ok(Array.isArray(watchA1.signals), "A1 currentWatch signals should be an array");

// For A2, currentWatch returns alertActive false with exactly one signal (sleep)
const watchA2 = currentWatch(crewA2.days);
assert.strictEqual(watchA2.alertActive, false, "for A2, currentWatch returns alertActive false");
assert.strictEqual(watchA2.signals.length, 1, "for A2, currentWatch returns exactly one signal");
assert.strictEqual(watchA2.signals[0].name, "sleep", "for A2, currentWatch signal is sleep");
assert.strictEqual(typeof watchA2.signals[0].value, "number", "signal value should be a number");
assert.strictEqual(typeof watchA2.signals[0].baselineMedian, "number", "signal baselineMedian should be a number");
assert.strictEqual(typeof watchA2.signals[0].z, "number", "signal z should be a number");
assert.strictEqual(typeof watchA2.signals[0].daysOff, "number", "signal daysOff should be a number");
assert.ok(watchA2.signals[0].daysOff >= 3, "daysOff should be >= 3");

// For A3, currentWatch returns no signals
const watchA3 = currentWatch(crewA3.days);
assert.strictEqual(watchA3.alertActive, false, "for A3, currentWatch returns alertActive false");
assert.strictEqual(watchA3.signals.length, 0, "for A3, currentWatch returns no signals");

// For A4, currentWatch returns alertActive true
const watchA4 = currentWatch(crewA4.days);
assert.strictEqual(watchA4.alertActive, true, "for A4, currentWatch returns alertActive true");
assert.strictEqual(watchA4.signals.length, 2, "for A4, currentWatch returns 2 deviating signals (sleep, activity)");

console.log("All detect tests passed successfully!");
console.log(`- A1 (Crew A): ${alertsA1.length} alert(s), confidence: ${alert1.confidence}, duration: ${alert1.durationDays}d`);
console.log(`- A2 (Crew B): ${alertsA2.length} alert(s), currentWatch: alertActive=${watchA2.alertActive}, signals=${watchA2.signals.map(s => s.name).join(",")}`);
console.log(`- A3 (Crew C): ${alertsA3.length} alert(s), currentWatch: alertActive=${watchA3.alertActive}, signals count=${watchA3.signals.length}`);
console.log(`- A4 (Crew D): ${alertsA4.length} alert(s), currentWatch: alertActive=${watchA4.alertActive}, signals=${watchA4.signals.map(s => s.name).join(",")}`);
