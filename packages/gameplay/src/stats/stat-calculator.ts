import type { StatDefinition, StatModifier } from "./types.js";

export function calculateStat(
  base: number,
  modifiers: readonly StatModifier[],
  definition: StatDefinition,
): number {
  const flats: number[] = [];
  const percents: number[] = [];
  const multipliers: StatModifier[] = [];

  for (const mod of modifiers) {
    switch (mod.type) {
      case "flat":
        flats.push(mod.value);
        break;
      case "percent":
        percents.push(mod.value);
        break;
      case "multiplier":
        multipliers.push(mod);
        break;
    }
  }

  let value = base;

  for (const flat of flats) {
    value += flat;
  }

  const percentSum = percents.reduce((sum, p) => sum + p, 0);
  value *= 1 + percentSum / 100;

  multipliers.sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const mult of multipliers) {
    value *= mult.value;
  }

  return Math.min(Math.max(value, definition.min), definition.max);
}
