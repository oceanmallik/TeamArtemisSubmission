const assert = require("assert");
const comms = require("../js/comms.js");

// Reset initial state
comms.setDelay(12);
comms.setBlackout(false);
comms.setSpeed(1);
comms.clearQueue();

// 1. Initial state and setters
assert.strictEqual(comms.state.delayMin, 12, "Initial delay should be 12");
assert.strictEqual(comms.state.blackout, false, "Initial blackout should be false");
assert.strictEqual(comms.state.speed, 1, "Initial speed should be 1");
assert.strictEqual(comms.status(), "connected", "Initial status should be connected");
assert.strictEqual(comms.roundTripMin(), 24, "Initial round trip should be 24 min");

// Test clamping of delayMin to [3, 22]
comms.setDelay(1);
assert.strictEqual(comms.state.delayMin, 3, "Delay below 3 must clamp to 3");
assert.strictEqual(comms.roundTripMin(), 6, "Round trip for delay 3 should be 6 min");

comms.setDelay(30);
assert.strictEqual(comms.state.delayMin, 22, "Delay above 22 must clamp to 22");
assert.strictEqual(comms.roundTripMin(), 44, "Round trip for delay 22 should be 44 min");

comms.setDelay(10);
assert.strictEqual(comms.state.delayMin, 10, "Delay 10 should be valid");

// Test status changes
comms.setBlackout(true);
assert.strictEqual(comms.status(), "blackout");
comms.setBlackout(false);
assert.strictEqual(comms.status(), "connected");

// 2. Test: Delivery after delay
const t0 = 1000000;
comms.setDelay(10); // 10 min = 600,000 ms at speed = 1
comms.setSpeed(1);
comms.setBlackout(false);
comms.clearQueue();

comms.enqueue({ id: "alert-1", desc: "Heart rate elevated" }, t0);

// At 5 minutes (300,000 ms): item should still be queued
const deliveredBefore = comms.tick(t0 + 300000);
assert.strictEqual(deliveredBefore.length, 0, "Item should not deliver before delay has passed");

// Check pending list
const pendingList = comms.pending(t0 + 300000);
assert.ok(Array.isArray(pendingList), "pending() should return an array when connected");
assert.strictEqual(pendingList.length, 1, "Should have 1 pending item");
assert.strictEqual(pendingList[0].secondsRemaining, 300, "Should have 300 seconds remaining");

// At 10 minutes (600,000 ms): item should be delivered
const deliveredAfter = comms.tick(t0 + 600000);
assert.strictEqual(deliveredAfter.length, 1, "Item should be delivered once delay passes");
assert.strictEqual(deliveredAfter[0].id, "alert-1");

// Queue should now be empty
assert.strictEqual(comms.pending(t0 + 600000).length, 0, "Queue should be empty after delivery");

// 3. Test: No delivery during blackout
const t1 = 2000000;
comms.setDelay(10);
comms.setSpeed(1);
comms.setBlackout(false);
comms.clearQueue();

comms.enqueue({ id: "alert-2", desc: "Blackout test" }, t1);

// Enable blackout
comms.setBlackout(true);
assert.strictEqual(comms.status(), "blackout");

// Even after full delay (15 min = 900,000 ms), blackout blocks delivery
const deliveredInBlackout = comms.tick(t1 + 900000);
assert.strictEqual(deliveredInBlackout.length, 0, "No items should be delivered during blackout");

// Pending during blackout returns null
assert.strictEqual(comms.pending(t1 + 900000), null, "pending() should return null during blackout");

// Clear blackout: item can now deliver
comms.setBlackout(false);
assert.strictEqual(comms.status(), "connected");

const deliveredAfterBlackout = comms.tick(t1 + 900000);
assert.strictEqual(deliveredAfterBlackout.length, 1, "Item should deliver once blackout clears and delay has passed");
assert.strictEqual(deliveredAfterBlackout[0].id, "alert-2");

// 4. Test: Speed multiplier works
const t2 = 3000000;
comms.setDelay(10); // 10 minutes = 600,000 ms normal
comms.setSpeed(60); // 60x speed -> 600,000 / 60 = 10,000 ms (10 seconds)
comms.setBlackout(false);
comms.clearQueue();

comms.enqueue({ id: "alert-3", desc: "High-speed transmission" }, t2);

// At 5 seconds (5,000 ms): not yet delivered
const deliveredSpeed1 = comms.tick(t2 + 5000);
assert.strictEqual(deliveredSpeed1.length, 0, "Should not deliver at 5s when 10s needed at 60x speed");

// At 10 seconds (10,000 ms): delivered!
const deliveredSpeed2 = comms.tick(t2 + 10000);
assert.strictEqual(deliveredSpeed2.length, 1, "Should deliver at 10s with 60x speed");
assert.strictEqual(deliveredSpeed2[0].id, "alert-3");

console.log("All comms tests passed successfully!");
