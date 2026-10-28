import { test } from "node:test";
import assert from "node:assert/strict";

import { convert, addUnit, UNITS, BASE_UNIT } from "../src/index.js";

const EPS = 1e-9;

/**
 * Helper: assert two numbers are within EPS. Floating-point arithmetic means
 * chained affine conversions (especially temperature) will not be bit-identical
 * even when the mathematical result is exact.
 */
function assertClose(actual, expected, msg) {
  assert.ok(
    Math.abs(actual - expected) < EPS,
    `${msg ?? ""}: expected ~${expected}, got ${actual}`
  );
}

test("length conversions via base metre", () => {
  assertClose(convert(1, "m", "ft"), 3.2808398950131);
  assertClose(convert(1, "km", "m"), 1000);
  assertClose(convert(1, "in", "m"), 0.0254);
  assertClose(convert(12, "in", "ft"), 1);
  assertClose(convert(1, "mi", "km"), 1.609344);
  assertClose(convert(100, "cm", "m"), 1);
  assertClose(convert(1000, "mm", "m"), 1);
  assertClose(convert(1, "yd", "m"), 0.9144);
});

test("mass conversions via base kilogram", () => {
  assertClose(convert(1, "kg", "lb"), 2.2046226218488);
  assertClose(convert(1000, "g", "kg"), 1);
  assertClose(convert(1, "t", "kg"), 1000);
  assertClose(convert(1, "oz", "g"), 28.349523125);
  assertClose(convert(16, "oz", "lb"), 1);
  assertClose(convert(1, "mg", "g"), 0.001);
});

test("temperature: same scale is identity", () => {
  assertClose(convert(25, "C", "C"), 25);
  assertClose(convert(300, "K", "K"), 300);
  assertClose(convert(72, "F", "F"), 72);
});

test("temperature: freezing and boiling points", () => {
  assertClose(convert(0, "C", "F"), 32);
  assertClose(convert(100, "C", "F"), 212);
  assertClose(convert(0, "C", "K"), 273.15);
  assertClose(convert(273.15, "K", "C"), 0);
  assertClose(convert(32, "F", "C"), 0);
  assertClose(convert(212, "F", "C"), 100);
});

test("temperature: C ↔ F roundtrip stays within tolerance", () => {
  for (const c of [-40, -1, 0, 37, 100, 1000]) {
    const roundTrip = convert(convert(c, "C", "F"), "F", "C");
    assertClose(roundTrip, c, `C→F→C for ${c}`);
  }
});

test("temperature: absolute zero", () => {
  assertClose(convert(0, "K", "C"), -273.15);
  assertClose(convert(0, "K", "F"), -459.67);
  assertClose(convert(-273.15, "C", "K"), 0);
});

test("negative and zero values for length/mass", () => {
  assertClose(convert(-5, "m", "cm"), -500);
  assertClose(convert(0, "kg", "g"), 0);
  assertClose(convert(-10, "lb", "kg"), -4.5359237);
});

test("unknown unit returns null", () => {
  assert.equal(convert(1, "m", "unknown"), null);
  assert.equal(convert(1, "unknown", "m"), null);
  assert.equal(convert(1, "foo", "bar"), null);
});

test("cross-category conversion returns null", () => {
  assert.equal(convert(1, "m", "kg"), null);
  assert.equal(convert(1, "C", "lb"), null);
  assert.equal(convert(1, "km", "F"), null);
});

test("addUnit with a numeric factor registers a ratio unit", () => {
  addUnit("length", "nautical_mile", 1852);
  assertClose(convert(1, "nautical_mile", "m"), 1852);
  assertClose(convert(1852, "m", "nautical_mile"), 1);
  // Clean up so other tests are not affected.
  delete UNITS.length.nautical_mile;
});

test("addUnit with explicit toBase/fromBase supports affine units", () => {
  // Rankine: R = K * 9/5  (absolute scale, no offset)
  addUnit("temperature", "R", {
    factor: 5 / 9,
    toBase: v => v * (5 / 9),
    fromBase: v => v / (5 / 9),
  });
  assertClose(convert(0, "K", "R"), 0);
  assertClose(convert(273.15, "K", "R"), 491.67);
  assertClose(convert(491.67, "R", "K"), 273.15);
  delete UNITS.temperature.R;
});

test("BASE_UNIT exposes the base symbol per category", () => {
  assert.equal(BASE_UNIT.length, "m");
  assert.equal(BASE_UNIT.mass, "kg");
  assert.equal(BASE_UNIT.temperature, "K");
});

test("addUnit throws on unknown category", () => {
  assert.throws(() => addUnit("volume", "l", 0.001), /Unknown category/);
});

test("convert handles NaN input by propagating it", () => {
  // We do not guard against NaN: the base conversions are arithmetic, so NaN
  // flows through naturally. This test documents that behaviour.
  const result = convert(NaN, "m", "ft");
  assert.ok(Number.isNaN(result));
});

test("convert handles Infinity input", () => {
  const result = convert(Infinity, "m", "ft");
  assert.equal(result, Infinity);
});
