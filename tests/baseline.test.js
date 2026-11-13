const assert = require("assert");
const { median, mad, computeBaseline, zScore } = require("../js/baseline.js");

// 1. Median tests
assert.strictEqual(median([3, 1, 2]), 2, "Median of [3, 1, 2] should be 2");
assert.strictEqual(median([4, 1, 3, 2]), 2.5, "Median of [4, 1, 3, 2] should be 2.5");
assert.strictEqual(median([42]), 42, "Median of [42] should be 42");
assert.strictEqual(median([]), 0, "Median of empty array should be 0");

// 2. MAD (Median Absolute Deviation) tests
// Hand-made small array: [2, 4, 4, 4, 5, 5, 7, 9]
// Median = (4 + 5) / 2 = 4.5
// Absolute deviations from 4.5: [2.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2.5, 4.5]
// Sorted deviations: [0.5, 0.5, 0.5, 0.5, 0.5, 2.5, 2.5, 4.5] -> median = 0.5
assert.strictEqual(mad([2, 4, 4, 4, 5, 5, 7, 9]), 0.5, "MAD of [2, 4, 4, 4, 5, 5, 7, 9] should be 0.5");

// Array 1..9: median = 5, deviations = 4..0..4, median of deviations = 2
assert.strictEqual(mad([1, 2, 3, 4, 5, 6, 7, 8, 9]), 2, "MAD of 1..9 should be 2");

// Constant array: deviations all 0 -> MAD = 0
assert.strictEqual(mad([7, 7, 7, 7]), 0, "MAD of constant array should be 0");

// 3. computeBaseline tests
const sampleDays = [
  { day: 1, hr: 60, sbp: 120 },
  { day: 2, hr: 62, sbp: 122 },
  { day: 3, hr: 58, sbp: 118 },
  { day: 4, hr: 64, sbp: 124 },
  { day: 5, hr: 60, sbp: 120 },
  { day: 6, hr: 61, sbp: 121 },
  { day: 7, hr: 59, sbp: 119 },
  { day: 8, hr: 63, sbp: 123 },
  { day: 9, hr: 60, sbp: 120 },
  { day: 10, hr: 62, sbp: 122 },
  { day: 11, hr: 58, sbp: 118 },
  { day: 12, hr: 65, sbp: 125 },
  { day: 13, hr: 61, sbp: 121 },
  { day: 14, hr: 60, sbp: 120 },
  { day: 15, hr: 120, sbp: 180 } // Should be ignored by default windowSize 14
];

const baseline = computeBaseline(sampleDays, ["hr", "sbp"], 14);
assert.strictEqual(baseline.hr.median, 60.5, "HR baseline median should be 60.5");
assert.ok(baseline.hr.scale > 0, "HR baseline scale should be positive");
assert.ok(baseline.sbp.scale > 0, "SBP baseline scale should be positive");

// Test scale lower-bound safeguards
const flatDays = Array.from({ length: 14 }, (_, i) => ({ day: i + 1, score: 0 }));
const flatBaseline = computeBaseline(flatDays, ["score"], 14);
assert.strictEqual(flatBaseline.score.median, 0);
assert.strictEqual(flatBaseline.score.scale, 0.01, "Scale floor should be 0.01 when MAD is 0 and median is 0");

// 4. zScore tests
// zScore = (value - median) / scale
const baselineEntry = { median: 60, scale: 2.5 };
assert.strictEqual(zScore(60, baselineEntry), 0, "zScore at median should be 0");
assert.strictEqual(zScore(65, baselineEntry), 2, "zScore of 65 with median 60, scale 2.5 should be 2");
assert.strictEqual(zScore(55, baselineEntry), -2, "zScore of 55 with median 60, scale 2.5 should be -2");

console.log("All baseline tests passed successfully!");
