import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

const EquipmentSlot = z.enum(["head", "chest", "boots", "weapon", "off_hand", "cape"]);
const WeaponFamily = z.enum([
  "sword", "axe", "mace", "hammer", "spear", "dagger",
  "bow", "crossbow", "gloves", "fire_staff", "frost_staff", "holy_staff",
  "nature_staff", "arcane_staff", "none",
]);
const ArmorFamily = z.enum(["plate", "leather", "cloth", "none"]);
const WeaponHandling = z.enum(["one_handed", "two_handed", "none"]);

export const EquipmentDefinitionSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  slot: EquipmentSlot,
  weaponFamily: WeaponFamily,
  armorFamily: ArmorFamily,
  equipmentType: z.string(),
  handling: WeaponHandling,
  stats: z.record(z.string(), z.number()),
  passiveAbilityId: z.string().nullable(),
  activeAbilityId: z.string().nullable(),
  maxDurability: z.number().int().gt(0),
  repairModifier: z.number().gt(0),
  setId: z.string().nullable(),
});

export type EquipmentDefinition = z.infer<typeof EquipmentDefinitionSchema>;

export const equipmentCategory = defineDataCategory({
  category: "equipment" as const,
  schema: EquipmentDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [
      { targetCategory: "items", targetId: r.itemId },
    ];
    if (r.passiveAbilityId) {
      refs.push({ targetCategory: "abilities", targetId: r.passiveAbilityId });
    }
    if (r.activeAbilityId) {
      refs.push({ targetCategory: "abilities", targetId: r.activeAbilityId });
    }
    return refs;
  },
});
