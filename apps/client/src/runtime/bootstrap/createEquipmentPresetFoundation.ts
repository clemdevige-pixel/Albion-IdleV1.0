import type { EntityId } from "@game/core";
import type {
  EquipmentLoadout,
  EquipmentLoadoutApplyOutcome,
  EquipmentResult,
} from "@game/gameplay";
import { RESEARCH_UNLOCK_IDS } from "../../data/researchContentCatalog.js";

export const EQUIPMENT_PRESET_CAPACITY = 3;
export type EquipmentPresetIndex = 1 | 2 | 3;

export type EquipmentPresetMutationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: "presets_locked" | "invalid_preset" }
  | EquipmentResult<T>;

interface EquipmentPresetPort {
  getLoadouts(entityId: EntityId): readonly EquipmentLoadout[];
  saveCurrentLoadout(
    entityId: EntityId,
    loadoutId: string,
    name: string,
  ): EquipmentResult<EquipmentLoadout>;
  applyLoadout(
    entityId: EntityId,
    loadoutId: string,
  ): EquipmentResult<EquipmentLoadoutApplyOutcome>;
  deleteLoadout(entityId: EntityId, loadoutId: string): boolean;
}

interface ResearchUnlockPort {
  hasUnlock(unlockId: string): boolean;
}

export interface EquipmentPresetFoundationDependencies {
  readonly equipmentManager: EquipmentPresetPort;
  readonly researchService: ResearchUnlockPort;
  readonly heroId: EntityId;
}

function presetId(index: EquipmentPresetIndex): string {
  return `equipment_preset_${String(index)}`;
}

function isPresetIndex(index: number): index is EquipmentPresetIndex {
  return Number.isInteger(index) && index >= 1 && index <= EQUIPMENT_PRESET_CAPACITY;
}

export function createEquipmentPresetFoundation(
  dependencies: EquipmentPresetFoundationDependencies,
) {
  const isUnlocked = (): boolean => dependencies.researchService.hasUnlock(
    RESEARCH_UNLOCK_IDS.equipmentPresets,
  );

  const getPresets = (): readonly EquipmentLoadout[] => {
    if (!isUnlocked()) return [];
    const byId = new Map(
      dependencies.equipmentManager
        .getLoadouts(dependencies.heroId)
        .map((loadout) => [loadout.id, loadout] as const),
    );
    return ([1, 2, 3] as const).flatMap((index) => {
      const loadout = byId.get(presetId(index));
      return loadout === undefined ? [] : [loadout];
    });
  };

  const savePreset = (
    index: number,
    name: string,
  ): EquipmentPresetMutationResult<EquipmentLoadout> => {
    if (!isUnlocked()) return { ok: false, reason: "presets_locked" };
    if (!isPresetIndex(index)) return { ok: false, reason: "invalid_preset" };
    return dependencies.equipmentManager.saveCurrentLoadout(
      dependencies.heroId,
      presetId(index),
      name,
    );
  };

  const applyPreset = (
    index: number,
  ): EquipmentPresetMutationResult<EquipmentLoadoutApplyOutcome> => {
    if (!isUnlocked()) return { ok: false, reason: "presets_locked" };
    if (!isPresetIndex(index)) return { ok: false, reason: "invalid_preset" };
    return dependencies.equipmentManager.applyLoadout(dependencies.heroId, presetId(index));
  };

  const deletePreset = (index: number): boolean => {
    if (!isUnlocked() || !isPresetIndex(index)) return false;
    return dependencies.equipmentManager.deleteLoadout(dependencies.heroId, presetId(index));
  };

  return {
    isUnlocked,
    getPresets,
    savePreset,
    applyPreset,
    deletePreset,
  };
}

export type EquipmentPresetFoundation = ReturnType<typeof createEquipmentPresetFoundation>;
