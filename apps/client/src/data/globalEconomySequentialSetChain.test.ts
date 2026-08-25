import { describe, expect, it } from "vitest";
import { EQUIPMENT_CRAFT_RECIPES } from "./refiningRecipes.js";

const TIERS = [4, 5, 6, 7, 8] as const;
type TargetTier = (typeof TIERS)[number];
type EquipmentTier = 3 | TargetTier;
type Enchantment = 0 | 3;

interface OwnedItem {
  readonly itemId: string;
  readonly enchantment: Enchantment;
}

function representativeItemIds(tier: EquipmentTier): readonly string[] {
  if (tier === 3) {
    return [
      "item_weapon_bow_t3_longbow",
      "item_iron_helmet",
      "item_leather_armor",
      "item_leather_boots",
    ];
  }
  return [
    `item_weapon_bow_t${String(tier)}_longbow`,
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
  ];
}

function refinedCraftCost(tier: TargetTier): string {
  const totals = new Map<string, number>();
  for (const itemId of representativeItemIds(tier)) {
    const recipe = EQUIPMENT_CRAFT_RECIPES.find((candidate) => candidate.outputItemId === itemId);
    if (recipe === undefined) throw new Error(`Missing craft recipe for ${itemId}`);
    for (const requirement of recipe.requirements) {
      if (!requirement.itemId.startsWith("item_refined_")) continue;
      totals.set(requirement.itemId, (totals.get(requirement.itemId) ?? 0) + requirement.quantity);
    }
  }
  return [...totals.entries()].map(([itemId, quantity]) => `${itemId}:${String(quantity)}`).join(" | ");
}

function craftTierWithoutConsumingPreviousEquipment(
  inventory: Map<string, OwnedItem>,
  sourceTier: EquipmentTier,
  targetTier: TargetTier,
) {
  const sourceItems = representativeItemIds(sourceTier);
  const targetItems = representativeItemIds(targetTier);
  const expectedSourceEnchantment: Enchantment = sourceTier === 3 ? 0 : 3;

  for (const sourceItemId of sourceItems) {
    const ownedPrevious = inventory.get(sourceItemId);
    if (ownedPrevious === undefined) {
      throw new Error(`Missing owned source equipment ${sourceItemId}`);
    }
    if (ownedPrevious.enchantment !== expectedSourceEnchantment) {
      throw new Error(
        `Wrong source state for ${sourceItemId}: expected .${String(expectedSourceEnchantment)}, got .${String(ownedPrevious.enchantment)}`,
      );
    }
  }

  for (const targetItemId of targetItems) {
    const recipe = EQUIPMENT_CRAFT_RECIPES.find((candidate) => candidate.outputItemId === targetItemId);
    if (recipe === undefined) throw new Error(`Missing craft recipe for ${targetItemId}`);
    if (recipe.requirements.some((requirement) => !requirement.itemId.startsWith("item_refined_"))) {
      throw new Error(`${targetItemId} must only consume refined materials`);
    }
    inventory.set(targetItemId, { itemId: targetItemId, enchantment: 0 });
  }

  return {
    sourceState: `T${String(sourceTier)}.${String(expectedSourceEnchantment)}`,
    targetStateAfterCraft: `T${String(targetTier)}.0`,
    retainedSourceItems: sourceItems.length,
    producedItems: targetItems.length,
    refinedCraftCost: refinedCraftCost(targetTier),
  };
}

describe("global economy sequential representative set chain", () => {
  it("retains previous-tier equipment while crafting the next tier from refined materials", () => {
    const inventory = new Map<string, OwnedItem>(
      representativeItemIds(3).map((itemId) => [itemId, { itemId, enchantment: 0 as const }]),
    );

    const rows = TIERS.map((targetTier) => {
      const sourceTier = (targetTier - 1) as EquipmentTier;
      const result = craftTierWithoutConsumingPreviousEquipment(inventory, sourceTier, targetTier);

      for (const itemId of representativeItemIds(targetTier)) {
        inventory.set(itemId, { itemId, enchantment: 3 });
      }

      return {
        transition: `T${String(sourceTier)}->T${String(targetTier)}`,
        ...result,
        carriedState: `T${String(targetTier)}.3`,
      };
    });

    expect(rows).toHaveLength(TIERS.length);
    expect(rows.every((row) => row.retainedSourceItems === 4 && row.producedItems === 4)).toBe(true);
    expect(inventory.size).toBe(24);
    for (const tier of [3, 4, 5, 6, 7, 8] as const) {
      for (const itemId of representativeItemIds(tier)) {
        expect(inventory.has(itemId)).toBe(true);
      }
    }
  });
});