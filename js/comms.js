// js/comms.js — AEGIS Earth-Mars communications simulation

const state = {
  delayMin: 12,
  blackout: false,
  speed: 1,
};

let queue = [];

function setDelay(min) {
  const val = typeof min === "number" ? min : 12;
  state.delayMin = Math.max(3, Math.min(22, val));
  return state.delayMin;
}

function setBlackout(bool) {
  state.blackout = Boolean(bool);
  return state.blackout;
}

function setSpeed(n) {
  state.speed = typeof n === "number" && n > 0 ? n : 1;
  return state.speed;
}

function roundTripMin() {
  return 2 * state.delayMin;
}

function enqueue(item, nowMs) {
  const queuedAt = typeof nowMs === "number" ? nowMs : Date.now();
  const entry = { item, queuedAt };
  queue.push(entry);
  return entry;
}

function tick(nowMs) {
  if (state.blackout) {
    return [];
  }

  const currentTime = typeof nowMs === "number" ? nowMs : Date.now();
  const delayMs = (state.delayMin * 60000) / state.speed;

  const delivered = [];
  const remaining = [];

  for (const entry of queue) {
    if (currentTime >= entry.queuedAt + delayMs) {
      delivered.push(entry.item);
    } else {
      remaining.push(entry);
    }
  }

  queue = remaining;
  return delivered;
}

function status() {
  return state.blackout ? "blackout" : "connected";
}

function pending(nowMs) {
  if (state.blackout) {
    return null;
  }

  const currentTime = typeof nowMs === "number" ? nowMs : Date.now();
  const delayMs = (state.delayMin * 60000) / state.speed;

  return queue.map((entry) => {
    const remainingMs = Math.max(0, entry.queuedAt + delayMs - currentTime);
    const secondsRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
    const base = typeof entry.item === "object" && entry.item !== null ? entry.item : {};

    return Object.assign({}, base, {
      item: entry.item,
      queuedAt: entry.queuedAt,
      secondsRemaining: secondsRemaining,
      remainingSeconds: secondsRemaining,
    });
  });
}

function clearQueue() {
  queue = [];
}

const AegisComms = {
  state,
  setDelay,
  setBlackout,
  setSpeed,
  roundTripMin,
  enqueue,
  tick,
  status,
  pending,
  clearQueue,
};

if (typeof window !== "undefined") {
  window.AegisComms = AegisComms;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AegisComms;
}
