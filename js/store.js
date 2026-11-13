// js/store.js — AEGIS decision log storage

const STORAGE_KEY = "aegis-decisions";
let memoryStore = [];

function loadDecisions() {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryStore = parsed;
          return parsed;
        }
      }
    }
  } catch (e) {
    // Fallback to in-memory store
  }
  return memoryStore;
}

function saveDecisions(decisions) {
  memoryStore = decisions;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
    }
  } catch (e) {
    // Fallback to in-memory store
  }
}

function logDecision({ crewId, day, action }) {
  const decisions = loadDecisions().slice();
  const entry = {
    crewId,
    day,
    action,
    time: new Date().toISOString(),
  };
  decisions.push(entry);
  saveDecisions(decisions);
  return entry;
}

function getDecisions(crewId) {
  const decisions = loadDecisions();
  const filtered = crewId
    ? decisions.filter((d) => d.crewId === crewId)
    : decisions.slice();

  return filtered.sort((a, b) => {
    const timeA = new Date(a.time).getTime();
    const timeB = new Date(b.time).getTime();
    return timeB - timeA;
  });
}

function getStatus(crewId, day) {
  const memberDecisions = getDecisions(crewId);
  const match = memberDecisions.find((d) => d.day === day);
  return match ? match.action : null;
}

function clearDecisions() {
  memoryStore = [];
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    // Fallback
  }
}

const AegisStore = {
  logDecision,
  getDecisions,
  getStatus,
  clearDecisions,
};

if (typeof window !== "undefined") {
  window.AegisStore = AegisStore;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AegisStore;
}
