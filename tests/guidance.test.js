const assert = require("assert");
const { getGuidance } = require("../js/guidance.js");

// Case 1: mode "autonomous" (blackout true or delayMin > 15)
const autoDelay = getGuidance({ delayMin: 18, blackout: false });
assert.strictEqual(autoDelay.mode, "autonomous", "delayMin > 15 must yield mode 'autonomous'");
assert.strictEqual(
  autoDelay.headline,
  "Earth cannot respond in time. Follow onboard guidance.",
  "Autonomous headline must match required text"
);
assert.ok(
  autoDelay.steps.includes("Report to Earth when the link returns."),
  "Autonomous steps must include reporting when link returns"
);

const autoBlackout = getGuidance({ delayMin: 4, blackout: true });
assert.strictEqual(autoBlackout.mode, "autonomous", "blackout true must yield mode 'autonomous'");
assert.strictEqual(
  autoBlackout.headline,
  "Earth cannot respond in time. Follow onboard guidance."
);
assert.ok(autoBlackout.steps.includes("Report to Earth when the link returns."));

// Case 2: mode "parallel" (delayMin 6 to 15, blackout false)
const parallel = getGuidance({ delayMin: 10, blackout: false });
assert.strictEqual(parallel.mode, "parallel", "delayMin 6-15 must yield mode 'parallel'");
assert.strictEqual(
  parallel.headline,
  "Send to Mission Control and start onboard steps now.",
  "Parallel headline must match required text"
);
assert.ok(
  parallel.steps.includes("Send the report to Earth."),
  "Parallel steps must include sending report to Earth"
);

// Case 3: mode "ask-earth" (delayMin <= 5, blackout false)
const askEarth = getGuidance({ delayMin: 4, blackout: false });
assert.strictEqual(askEarth.mode, "ask-earth", "delayMin <= 5 must yield mode 'ask-earth'");
assert.strictEqual(
  askEarth.headline,
  "Send to Mission Control and wait for their reply.",
  "Ask-earth headline must match required text"
);
assert.ok(
  askEarth.steps.includes("Send the report to Earth."),
  "Ask-earth steps must include sending report to Earth"
);

// Case 4: medicalOfficerAffected case
const medOfficer = getGuidance({
  delayMin: 10,
  blackout: false,
  medicalOfficerAffected: true,
});
assert.strictEqual(
  medOfficer.steps[0],
  "Assign another crew member to assist; the crew medical officer is the one affected.",
  "First step must assign another crew member when medical officer is affected"
);
assert.ok(
  medOfficer.note && medOfficer.note.includes("Earth guidance matters more but may be delayed"),
  "Note must state Earth guidance matters more but may be delayed"
);

// Boundary tests: 5 min, 6 min, 15 min, 16 min
assert.strictEqual(getGuidance({ delayMin: 5, blackout: false }).mode, "ask-earth");
assert.strictEqual(getGuidance({ delayMin: 6, blackout: false }).mode, "parallel");
assert.strictEqual(getGuidance({ delayMin: 15, blackout: false }).mode, "parallel");
assert.strictEqual(getGuidance({ delayMin: 16, blackout: false }).mode, "autonomous");

// Check common steps are non-medical
const sample = getGuidance({ delayMin: 10 });
assert.ok(sample.steps.includes("Re-measure the flagged indicators."));
assert.ok(sample.steps.includes("Log symptoms and time."));
assert.ok(sample.steps.includes("Notify the crew commander."));
assert.ok(sample.steps.includes("Review onboard medical protocols."));

console.log("All guidance tests passed successfully!");
