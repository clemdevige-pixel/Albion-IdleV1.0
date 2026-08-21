export type {
  DamageType,
  DamageSourceType,
  DamageRequest,
  DamageResult,
  PostMitigationDamageResolver,
} from "./types.js";
export type { HealthData } from "./components.js";
export { HealthComponent } from "./components.js";
export type { AttackerDamageStats, DefenderDamageStats, DamageCalculation } from "./damage-calculator.js";
export {
  calculateDamage,
  calculateResistanceMitigation,
  RESISTANCE_SCALING_CONSTANT,
} from "./damage-calculator.js";
export { DamageValidator } from "./damage-validator.js";
export { DamageManager } from "./damage-manager.js";
export type { DamageContext } from "./damage-context.js";
export type {
  DamageEventMap,
  DamageDealtEvent,
  EntityKilledEvent,
  HealthChangedEvent,
  HealAppliedEvent,
} from "./damage-events.js";
