# mini-unit-convert

Convert between units of length, mass, and temperature in pure JavaScript with zero dependencies.

## Usage

```js
import { convert, addUnit } from "mini-unit-convert";

// Length: meters to feet
convert(1, "m", "ft"); // 3.2808398950131

// Mass: kilograms to pounds
convert(1, "kg", "lb"); // 2.2046226218488

// Temperature: Celsius to Fahrenheit (affine — offset applied)
convert(0, "C", "F"); // 32

// Add a custom unit to an existing category
addUnit("length", "in", 0.0254);
convert(12, "in", "m"); // 0.3048
```

## Why this exists

Most unit-conversion libraries pull in large tables for every unit system and a
graph resolver to find paths between any two units. That flexibility is rarely
needed; the common case is converting within a single category (length, mass,
temperature) using known base-unit ratios. This library bakes the conversion
factors directly into a flat table and resolves `convert(value, from, to)` in a
single lookup — no graph, no walk. The trade-off: you cannot convert across
categories, and every unit must be pre-registered relative to its category's
base unit.

## The awkward edge: temperature

Temperature is the one category that cannot be handled by a single
multiplicative factor, because the Celsius and Fahrenheit scales have
non-zero origins. Rather than special-casing temperature throughout the
library, every unit may optionally carry a `toBase` / `fromBase` function pair
that defaults to identity. Length and mass units leave these absent and use a
plain ratio; temperature units provide them. If you register a custom unit
that also has an offset (e.g. Rankine), supply those functions.

The library converts via the base unit of each category: `value → fromBase →
base → toBase`. Because of the two function calls, results are subject to
floating-point rounding; compare with a tolerance, not `===`.

## Exports

- `convert(value, fromUnit, toUnit)` — returns a number, or `null` if either
  unit is unknown or the two units belong to different categories.
- `addUnit(category, unit, factorOrSpec)` — registers a new unit. `factorOrSpec`
  is either a number (ratio to the base unit) or an object
  `{ factor, toBase, fromBase }`.
- `UNITS` — the live unit table (read or extend at your own risk).
- `BASE_UNIT` — map of category → base unit symbol.

## Run the tests

```sh
node --test
```
