import {
  DestinyBoardService,
  ExperienceService,
  FameService,
  MasteryService,
  ProgressionOrchestrator,
  type MasteryId,
} from "@game/gameplay";
import { ITEM_DEFINITIONS } from "../../data/itemContentCatalog.js";
import {
  DESTINY_NODES,
  FIBER_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  MASTERY_DEFINITIONS,
  ORE_GATHERING_MASTERY_ID,
  WOOD_GATHERING_MASTERY_ID,
} from "../../data/progressionContentCatalog.js";
import { resolveWeaponMastery } from "../../data/weaponContentCatalog.js";
import { isDevSandboxMode } from "../devSandbox.js";
import { registerDevSandboxPostLoadAdjustment } from "../devSandboxPostLoad.js";

const DEV_WEAPON_SPECIALIZATION_LEVEL = 40;

function getCumulativeXpForLevel(
  masteryService: MasteryService,
  masteryId: MasteryId,
  level: number,
): number {
  const table = masteryService._getTable(masteryId);
  if (table === undefined) throw new Error(`Missing mastery table for ${String(masteryId)}`);
  let totalXp = 0;
  for (let currentLevel = 0; currentLevel < level; currentLevel += 1) {
    totalXp += table.getRequiredXp(currentLevel);
  }
  return totalXp;
}

export function applyDevSandboxWeaponMasteries(
  experienceService: ExperienceService,
  masteryService: MasteryService,
): void {
  if (!isDevSandboxMode()) return;

  const uniqueRoutes = new Map<string, NonNullable<ReturnType<typeof resolveWeaponMastery>>>();
  for (const itemId of Object.keys(ITEM_DEFINITIONS)) {
    const route = resolveWeaponMastery(itemId);
    if (route !== undefined) uniqueRoutes.set(String(route.weaponId), route);
  }

  const familyXp = new Map<MasteryId, number>();

  for (const route of uniqueRoutes.values()) {
    const definition = MASTERY_DEFINITIONS.find((entry) => entry.id === route.weaponId);
    const table = masteryService._getTable(route.weaponId);
    if (definition === undefined || table === undefined) {
      throw new Error(`Missing dev sandbox specialization mastery definition: ${String(route.weaponId)}`);
    }

    const targetLevel = Math.min(DEV_WEAPON_SPECIALIZATION_LEVEL, definition.maxLevel);
    const targetXp = getCumulativeXpForLevel(masteryService, route.weaponId, targetLevel);
    if (!masteryService.isMasteryUnlocked(route.weaponId)) masteryService.discoverMastery(route.weaponId);
    experienceService._restore(route.weaponId, table, definition.maxLevel, targetXp);
    familyXp.set(route.familyId, (familyXp.get(route.familyId) ?? 0) + targetXp);
  }

  for (const [familyId, xp] of familyXp) {
    const definition = MASTERY_DEFINITIONS.find((entry) => entry.id === familyId);
    const table = masteryService._getTable(familyId);
    if (definition === undefined || table === undefined) {
      throw new Error(`Missing dev sandbox family mastery definition: ${String(familyId)}`);
    }
    if (!masteryService.isMasteryUnlocked(familyId)) masteryService.discoverMastery(familyId);
    experienceService._restore(familyId, table, definition.maxLevel, xp);
  }
}

/** Framework-agnostic progression and mastery service assembly. */
export function createProgressionFoundation() {
  const experienceService = new ExperienceService();
  const fameService = new FameService(experienceService);
  const masteryService = new MasteryService(experienceService);
  const destinyBoardService = new DestinyBoardService(experienceService);
  const progressionOrchestrator = new ProgressionOrchestrator(
    experienceService,
    fameService,
    masteryService,
    destinyBoardService,
  );

  progressionOrchestrator.initialize({
    masteryDefinitions: MASTERY_DEFINITIONS,
    destinyNodes: DESTINY_NODES,
  });

  for (const masteryId of [
    WOOD_GATHERING_MASTERY_ID,
    ORE_GATHERING_MASTERY_ID,
    HIDE_GATHERING_MASTERY_ID,
    FIBER_GATHERING_MASTERY_ID,
  ]) {
    masteryService.discoverMastery(masteryId);
  }

  const applyDevMasteryPreset = (): void => {
    applyDevSandboxWeaponMasteries(experienceService, masteryService);
  };
  applyDevMasteryPreset();
  registerDevSandboxPostLoadAdjustment(applyDevMasteryPreset);

  return {
    experienceService,
    fameService,
    masteryService,
    destinyBoardService,
    progressionOrchestrator,
  };
}

export type ProgressionFoundation = ReturnType<
  typeof createProgressionFoundation
>;
