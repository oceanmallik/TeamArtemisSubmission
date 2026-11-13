// js/guidance.js — AEGIS clinical decision support guidance based on comms latency

function getGuidance(options = {}) {
  const delayMin = typeof options.delayMin === "number" ? options.delayMin : 12;
  const blackout = Boolean(options.blackout);
  const medicalOfficerAffected = Boolean(options.medicalOfficerAffected);

  let mode;
  let headline;

  if (blackout || delayMin > 15) {
    mode = "autonomous";
    headline = "Earth cannot respond in time. Follow onboard guidance.";
  } else if (delayMin >= 6 && delayMin <= 15) {
    mode = "parallel";
    headline = "Send to Mission Control and start onboard steps now.";
  } else {
    mode = "ask-earth";
    headline = "Send to Mission Control and wait for their reply.";
  }

  const steps = [];

  if (medicalOfficerAffected) {
    steps.push(
      "Assign another crew member to assist; the crew medical officer is the one affected."
    );
  }

  steps.push("Re-measure the flagged indicators.");
  steps.push("Log symptoms and time.");
  steps.push("Notify the crew commander.");
  steps.push("Review onboard medical protocols.");

  if (mode === "autonomous") {
    steps.push("Report to Earth when the link returns.");
  } else {
    steps.push("Send the report to Earth.");
  }

  const result = {
    mode,
    headline,
    steps,
  };

  if (medicalOfficerAffected) {
    result.note = "Earth guidance matters more but may be delayed.";
  }

  return result;
}

const AegisGuidance = {
  getGuidance,
};

if (typeof window !== "undefined") {
  window.AegisGuidance = AegisGuidance;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AegisGuidance;
}
