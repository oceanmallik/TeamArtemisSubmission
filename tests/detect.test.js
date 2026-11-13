const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { detect } = require("../js/detect.js");

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

// Check alert shape on A4
const alert4 = alertsA4[0];
assert.strictEqual(typeof alert4.day, "number");
assert.ok(["watch", "attention"].includes(alert4.level));
assert.ok(Array.isArray(alert4.signals));
assert.ok(alert4.signals.length >= 2);
assert.strictEqual(typeof alert4.summary, "string");

console.log("All detect tests passed successfully!");
console.log(`- A1 (Crew A): ${alertsA1.length} alert(s)`);
console.log(`- A2 (Crew B): ${alertsA2.length} alert(s)`);
console.log(`- A3 (Crew C): ${alertsA3.length} alert(s)`);
console.log(`- A4 (Crew D): ${alertsA4.length} alert(s)`);
