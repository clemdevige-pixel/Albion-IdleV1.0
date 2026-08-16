import type { EnchantmentFailureReason, EnchantmentLevel } from "@game/gameplay";

export type EnchantItemSource = "equipped" | "inventory" | "bank";

export interface EnchantableItemModel {
  readonly itemId: string;
  readonly instanceId: string;
  readonly enchantment: EnchantmentLevel;
  readonly source: EnchantItemSource;
}

export interface EnchantmentMaterialModel {
  readonly itemId: string;
  readonly name: string;
  readonly owned: number;
  readonly required: number;
  readonly missing: number;
}

export interface EnchantmentPreviewModel {
  readonly instanceId: string;
  readonly itemId: string;
  readonly currentLevel: EnchantmentLevel;
  readonly nextLevel: EnchantmentLevel | undefined;
  readonly silverCost: number;
  readonly itemPowerGain: number;
  readonly materials: readonly EnchantmentMaterialModel[];
  readonly canAfford: boolean;
  readonly failureReason: EnchantmentFailureReason | undefined;
}

export interface EnchantmentStockModel {
  readonly itemId: string;
  readonly name: string;
  readonly quantity: number;
}

export interface EnchantModel {
  readonly silver: number;
  readonly incomeRate: number;
  readonly items: readonly EnchantableItemModel[];
  readonly availableTiers: readonly number[];
  readonly selectedInstanceId: string | undefined;
  readonly preview: EnchantmentPreviewModel | undefined;
  readonly stocks: readonly EnchantmentStockModel[];
}
