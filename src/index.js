/**
 * Public surface of mini-unit-convert.
 *
 * Re-exports the conversion function, the unit table, the base-unit map, and
 * `addUnit` for registering custom units at runtime.
 */

export { convert, addUnit, UNITS, BASE_UNIT } from "./core.js";
