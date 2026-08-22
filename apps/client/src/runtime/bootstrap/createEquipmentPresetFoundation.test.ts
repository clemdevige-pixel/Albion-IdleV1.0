import { describe, expect, it, vi } from "vitest";
import type { EntityId } from "@game/core";
import { createEquipmentPresetFoundation } from "./createEquipmentPresetFoundation.js";

const HERO_ID = 1 as EntityId;

function createFixture(unlocked: boolean) {
  const loadouts = new Map<string, { id: string; name: string; slots: readonly [] }>();
  const equipmentManager = {
    getLoadouts: vi.fn(() => [...loadouts.values()]),
    saveCurrentLoadout: vi.fn((_entityId: EntityId, loadoutId: string, name: string) => {
      const loadout = { id: loadoutId, name, slots: [] as const };
      loadouts.set(loadoutId, loadout);
      return { ok: true as const, value: loadout };
    }),
    applyLoadout: vi.fn((_entityId: EntityId, loadoutId: string) => ({
      ok: true as const,
      value: { loadoutId, changedSlots: [] as const },
    })),
    deleteLoadout: vi.fn((_entityId: EntityId, loadoutId: string) => loadouts.delete(loadoutId)),
  };
  const foundation = createEquipmentPresetFoundation({
    equipmentManager,
    researchService: { hasUnlock: () => unlocked },
    heroId: HERO_ID,
  });
  return { foundation, equipmentManager };
}

describe("createEquipmentPresetFoundation", () => {
  it("keeps the existing loadout capability inaccessible before Research unlock", () => {
    const { foundation, equipmentManager } = createFixture(false);

    expect(foundation.isUnlocked()).toBe(false);
    expect(foundation.getPresets()).toEqual([]);
    expect(foundation.savePreset(1, "Farm")).toEqual({ ok: false, reason: "presets_locked" });
    expect(foundation.applyPreset(1)).toEqual({ ok: false, reason: "presets_locked" });
    expect(equipmentManager.saveCurrentLoadout).not.toHaveBeenCalled();
  });

  it("exposes exactly three stable preset slots and delegates to EquipmentManager", () => {
    const { foundation, equipmentManager } = createFixture(true);

    expect(foundation.savePreset(1, "Farm").ok).toBe(true);
    expect(foundation.savePreset(2, "Progression").ok).toBe(true);
    expect(foundation.savePreset(3, "Dungeon").ok).toBe(true);
    expect(foundation.savePreset(4, "Invalid")).toEqual({ ok: false, reason: "invalid_preset" });

    expect(foundation.getPresets().map((preset) => preset.id)).toEqual([
      "equipment_preset_1",
      "equipment_preset_2",
      "equipment_preset_3",
    ]);
    expect(foundation.applyPreset(2)).toMatchObject({ ok: true });
    expect(equipmentManager.applyLoadout).toHaveBeenCalledWith(HERO_ID, "equipment_preset_2");
  });
});
