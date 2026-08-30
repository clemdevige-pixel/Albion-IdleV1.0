import { TowerProgressionService } from "@game/gameplay";
import { TowerProgressionSaveProvider } from "../TowerProgressionSaveProvider.js";
import { TowerCombatEncounterSource } from "../TowerCombatEncounterSource.js";
import { TowerCombatRuntimeRouter } from "../TowerCombatRuntimeRouter.js";

export interface TowerFoundation {
  readonly progressionService: TowerProgressionService;
  readonly saveProvider: TowerProgressionSaveProvider;
  readonly encounterSource: TowerCombatEncounterSource;
  readonly combatRouter: TowerCombatRuntimeRouter;
}

/**
 * Creates the persistent Tower progression authority and its transient combat
 * adapters for one save slot. The save-slot-derived seed is only the
 * deterministic new-save fallback; once persisted, the saved Tower seed
 * remains authoritative.
 */
export function createTowerFoundation(saveSlotId: string): TowerFoundation {
  if (saveSlotId.length === 0) throw new Error("Tower foundation requires a save slot id");
  const fallbackSeed = `tower|${saveSlotId}`;
  const progressionService = new TowerProgressionService(fallbackSeed);
  const encounterSource = new TowerCombatEncounterSource(progressionService);
  return {
    progressionService,
    saveProvider: new TowerProgressionSaveProvider(progressionService, fallbackSeed),
    encounterSource,
    combatRouter: new TowerCombatRuntimeRouter(progressionService, encounterSource),
  };
}
