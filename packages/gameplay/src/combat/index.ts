export type {
  CombatSessionId,
  EncounterId,
  CombatState,
  EnemySpawn,
  EncounterDefinition,
  CombatSessionData,
  CombatResult,
  CombatFailureReason,
} from "./types.js";
export { asCombatSessionId, asEncounterId } from "./types.js";

export { validateTransition, transitionCombatState } from "./combat-state-machine.js";
export type { StatefulSession } from "./combat-state-machine.js";

export { CombatSession } from "./combat-session.js";

export type {
  CombatEventMap,
  CombatStartedEvent,
  CombatEndedEvent,
  EnemyKilledEvent,
  HeroKilledEvent,
  AttackExecutedEvent,
  CombatTickEvent,
} from "./combat-events.js";

export { CombatService } from "./combat-service.js";

export { CombatOrchestrator } from "./combat-orchestrator.js";
export type {
  CombatOrchestratorDeps,
  CombatOrchestratorState,
  OrchestratedTickResult,
} from "./combat-orchestrator.js";
