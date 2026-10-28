/**
 * Core conversion engine.
 *
 * Design: every unit is registered relative to its category's base unit.
 * Length  base = metre (m)
 * Mass    base = kilogram (kg)
 * Temperature base = kelvin (K)
 *
 * A unit is either:
 *   - a plain ratio (number)  — used for length and mass, where converting
 *     to the base is just multiplication.
 *   - a spec { factor, toBase, fromBase } — used for temperature, whose
 *     scales have non-zero origins so conversion is affine, not linear.
 *
 * toBase(value)  : convert a value in THIS unit to the base unit.
 * fromBase(value): convert a base-unit value back to THIS unit.
 *
 * For a plain ratio `r`, toBase is `v => v * r` and fromBase is `v => v / r`.
 * We could store every unit as a spec, but keeping the short form makes the
 * length/mass tables readable and avoids wrapping every entry in closures.
 */

/** @typedef {"length" | "mass" | "temperature"} Category */

/**
 * @typedef UnitSpec
 * @property {number}  factor   - Ratio to the base unit (used in error messages).
 * @property {(v: number) => number} toBase   - Convert from this unit to the base unit.
 * @property {(v: number) => number} fromBase - Convert from the base unit to this unit.
 */

/** @type {Record<string, Record<string, UnitSpec>>} */
export const UNITS = {
  length: {
    // base: metre
    m:  { factor: 1,     toBase: v => v,         fromBase: v => v },
    cm: { factor: 0.01,  toBase: v => v * 0.01,  fromBase: v => v / 0.01 },
    mm: { factor: 0.001, toBase: v => v * 0.001, fromBase: v => v / 0.001 },
    km: { factor: 1000,  toBase: v => v * 1000,  fromBase: v => v / 1000 },
    in: { factor: 0.0254, toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
    ft: { factor: 0.3048, toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    yd: { factor: 0.9144, toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
    mi: { factor: 1609.344, toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
  },
  mass: {
    // base: kilogram
    kg:  { factor: 1,    toBase: v => v,        fromBase: v => v },
    g:   { factor: 0.001, toBase: v => v * 0.001, fromBase: v => v / 0.001 },
    mg:  { factor: 1e-6, toBase: v => v * 1e-6,  fromBase: v => v / 1e-6 },
    t:   { factor: 1000, toBase: v => v * 1000,  fromBase: v => v / 1000 },
    lb:  { factor: 0.45359237, toBase: v => v * 0.45359237, fromBase: v => v / 0.45359237 },
    oz:  { factor: 0.028349523125, toBase: v => v * 0.028349523125, fromBase: v => v / 0.028349523125 },
  },
  temperature: {
    // base: kelvin
    K: {
      factor: 1,
      toBase: v => v,
      fromBase: v => v,
    },
    C: {
      factor: 1,
      toBase: v => v + 273.15,
      fromBase: v => v - 273.15,
    },
    F: {
      factor: 5 / 9,
      // F → K: (F - 32) * 5/9 + 273.15
      toBase: v => (v - 32) * (5 / 9) + 273.15,
      // K → F: (K - 273.15) * 9/5 + 32
      fromBase: v => (v - 273.15) * (9 / 5) + 32,
    },
  },
};

/**
 * Maps each category to its base unit symbol. Used so the public API can look
 * up which category a unit belongs to without scanning the whole table.
 */
export const BASE_UNIT = {
  length: "m",
  mass: "kg",
  temperature: "K",
};

/**
 * Register a new unit.
 *
 * @param {Category} category
 * @param {string} unit - Symbol to register.
 * @param {number | { factor?: number, toBase?: (v: number) => number, fromBase?: (v: number) => number }} spec
 *   If a number, it is the ratio to the base unit (toBase = v*spec,
 *   fromBase = v/spec). If an object, `factor` defaults to 1 and `toBase` /
 *   `fromBase` default to identity.
 */
export function addUnit(category, unit, spec) {
  if (!UNITS[category]) {
    throw new Error(`Unknown category: ${category}`);
  }
  if (typeof spec === "number") {
    UNITS[category][unit] = {
      factor: spec,
      toBase: v => v * spec,
      fromBase: v => v / spec,
    };
    return;
  }
  const factor = spec.factor ?? 1;
  UNITS[category][unit] = {
    factor,
    toBase: spec.toBase ?? (v => v * factor),
    fromBase: spec.fromBase ?? (v => v / factor),
  };
}

/**
 * Convert a numeric value from one unit to another.
 *
 * Returns `null` if either unit is unknown or the two units belong to
 * different categories. Does NOT throw on unknown units — callers may treat
 * a failed lookup as a recoverable condition.
 *
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} toUnit
 * @returns {number | null}
 */
export function convert(value, fromUnit, toUnit) {
  let fromCat = null;
  let fromSpec = null;
  let toCat = null;
  let toSpec = null;

  for (const cat of Object.keys(UNITS)) {
    if (UNITS[cat][fromUnit] && !fromSpec) {
      fromCat = cat;
      fromSpec = UNITS[cat][fromUnit];
    }
    if (UNITS[cat][toUnit] && !toSpec) {
      toCat = cat;
      toSpec = UNITS[cat][toUnit];
    }
  }

  if (!fromSpec || !toSpec) return null;
  if (fromCat !== toCat) return null;

  const baseValue = fromSpec.toBase(value);
  return toSpec.fromBase(baseValue);
}
