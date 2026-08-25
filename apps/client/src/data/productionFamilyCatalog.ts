import {
  CRAFTING_CONTENT_TIERS,
  GATHERING_CONTENT_TIERS,
  PRODUCTION_TIER_RULES,
  PRODUCTION_TIERS,
  REFINING_CONTENT_TIERS,
  type GatheringContentTier,
  type ProductionTier,
  type ProductionTierRules,
  type RefiningContentTier,
} from "@game/data";
import type { MasteryId, ResourceFamily, WorkerProfession } from "@game/gameplay";
import {
  FIBER_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  ORE_GATHERING_MASTERY_ID,
  WOOD_GATHERING_MASTERY_ID,
} from "./progressionContentCatalog.js";

export {
  CRAFTING_CONTENT_TIERS,
  GATHERING_CONTENT_TIERS,
  PRODUCTION_CONTENT_TIERS,
  PRODUCTION_TIER_RULES,
  PRODUCTION_TIERS,
  REFINING_CONTENT_TIERS,
  type GatheringContentTier,
  type ProductionTier,
  type ProductionTierRules,
  type RefiningContentTier,
} from "@game/data";

export function isProductionTier(value: unknown): value is ProductionTier {
  return typeof value === "number" && PRODUCTION_TIERS.includes(value as ProductionTier);
}

export function isGatheringContentTier(tier: ProductionTier): tier is GatheringContentTier {
  return GATHERING_CONTENT_TIERS.some((authoredTier) => authoredTier === tier);
}

export function isRefiningContentTier(tier: ProductionTier): tier is RefiningContentTier {
  return REFINING_CONTENT_TIERS.some((authoredTier) => authoredTier === tier);
}

export function getProductionTierRules(tier: ProductionTier): ProductionTierRules {
  return PRODUCTION_TIER_RULES[tier];
}

interface ProductionTierPresentation { readonly resourceName: string; readonly toolName: string; }
interface ProductionFamilyDefinition {
  readonly gameplayFamily: Extract<ResourceFamily, "Wood" | "Ore" | "Hide" | "Fiber">;
  readonly profession: Extract<WorkerProfession, "woodcutter" | "miner" | "skinner" | "fiber_harvester">;
  readonly professionName: string; readonly masteryId: MasteryId; readonly label: string; readonly masterySymbol: string;
  readonly professionIcon: string; readonly visualManifestId: string; readonly gatheringIcon: string; readonly rawIcon: string;
  readonly refinedIcon: string; readonly rawMaterialLabel: string;
  readonly tiers: Readonly<Partial<Record<ProductionTier, ProductionTierPresentation>>>;
}

export const PRODUCTION_FAMILY_CATALOG = {
  wood: { gameplayFamily: "Wood", profession: "woodcutter", professionName: "Bûcheron", masteryId: WOOD_GATHERING_MASTERY_ID, label: "Bois", masterySymbol: "🌲", professionIcon: "/assets/ui/professions/profession-woodcutting.png", visualManifestId: "resource_wood", gatheringIcon: "resource-birch-node.png", rawIcon: "resource-birch-log.png", refinedIcon: "resource-birch-planks.png", rawMaterialLabel: "Bois", tiers: { 3: { resourceName: "Bois de bouleau", toolName: "Hache de compagnon" }, 4: { resourceName: "Bois de pin", toolName: "Hache d'expert" }, 5: { resourceName: "Bois de cèdre", toolName: "Hache de maître" }, 6: { resourceName: "Bois de chêne sanglant", toolName: "Hache de grand maître" }, 7: { resourceName: "Bois cendré", toolName: "Hache ancienne" }, 8: { resourceName: "Bois d'ébène noir", toolName: "Hache ancestrale" } } },
  ore: { gameplayFamily: "Ore", profession: "miner", professionName: "Mineur", masteryId: ORE_GATHERING_MASTERY_ID, label: "Minerai", masterySymbol: "⛏", professionIcon: "/assets/ui/professions/profession-mining.png", visualManifestId: "resource_ore", gatheringIcon: "resource-copper-pickaxe.png", rawIcon: "resource-copper-ore.png", refinedIcon: "resource-copper-ingot.png", rawMaterialLabel: "Minerai", tiers: { 3: { resourceName: "Minerai de cuivre", toolName: "Pioche de compagnon" }, 4: { resourceName: "Minerai de fer", toolName: "Pioche d'expert" }, 5: { resourceName: "Minerai de titane", toolName: "Pioche de maître" }, 6: { resourceName: "Minerai de runite", toolName: "Pioche de grand maître" }, 7: { resourceName: "Minerai de météorite", toolName: "Pioche ancienne" }, 8: { resourceName: "Minerai d'obsidienne", toolName: "Pioche ancestrale" } } },
  hide: { gameplayFamily: "Hide", profession: "skinner", professionName: "Dépeceur", masteryId: HIDE_GATHERING_MASTERY_ID, label: "Peau", masterySymbol: "🦌", professionIcon: "/assets/ui/professions/profession-skinning.png", visualManifestId: "resource_hide", gatheringIcon: "resource-hide.png", rawIcon: "resource-hide.png", refinedIcon: "resource-leather.png", rawMaterialLabel: "Peau", tiers: { 3: { resourceName: "Peau robuste", toolName: "Couteau de dépeçage" }, 4: { resourceName: "Peau épaisse", toolName: "Couteau de dépeçage d'expert" }, 5: { resourceName: "Peau lourde", toolName: "Couteau de dépeçage de maître" }, 6: { resourceName: "Peau renforcée", toolName: "Couteau de dépeçage de grand maître" }, 7: { resourceName: "Peau durcie", toolName: "Couteau de dépeçage ancien" }, 8: { resourceName: "Peau abyssale", toolName: "Couteau de dépeçage ancestral" } } },
  fiber: { gameplayFamily: "Fiber", profession: "fiber_harvester", professionName: "Herboriste", masteryId: FIBER_GATHERING_MASTERY_ID, label: "Fibres", masterySymbol: "🌿", professionIcon: "/assets/ui/professions/profession-fiber-harvesting.png", visualManifestId: "resource_fiber", gatheringIcon: "resource-fiber.png", rawIcon: "resource-fiber.png", refinedIcon: "resource-cloth.png", rawMaterialLabel: "Fibre", tiers: { 3: { resourceName: "Fibre de lin", toolName: "Faucille de compagnon" }, 4: { resourceName: "Fibre fine", toolName: "Faucille d'expert" }, 5: { resourceName: "Fibre céleste", toolName: "Faucille de maître" }, 6: { resourceName: "Fibre écarlate", toolName: "Faucille de grand maître" }, 7: { resourceName: "Fibre solaire", toolName: "Faucille ancienne" }, 8: { resourceName: "Fibre du Néant", toolName: "Faucille ancestrale" } } },
} as const satisfies Record<string, ProductionFamilyDefinition>;

export type ProductionFamilyId = keyof typeof PRODUCTION_FAMILY_CATALOG;
export type SupportedProductionFamily = (typeof PRODUCTION_FAMILY_CATALOG)[ProductionFamilyId]["gameplayFamily"];
export const PRODUCTION_FAMILY_IDS = Object.freeze(Object.keys(PRODUCTION_FAMILY_CATALOG) as ProductionFamilyId[]);
export const PRODUCTION_FAMILIES = Object.freeze(PRODUCTION_FAMILY_IDS.map((id) => PRODUCTION_FAMILY_CATALOG[id].gameplayFamily));
const PRODUCTION_FAMILY_SET = new Set<string>(PRODUCTION_FAMILIES);
export function isSupportedProductionFamily(value: string): value is SupportedProductionFamily { return PRODUCTION_FAMILY_SET.has(value); }
export function getProductionFamilyDefinition(id: ProductionFamilyId) { return PRODUCTION_FAMILY_CATALOG[id]; }
export function getProductionFamilyByGameplayFamily(family: SupportedProductionFamily) { return getProductionFamilyDefinition(getProductionFamilyId(family)); }
export function getProductionFamilyId(family: SupportedProductionFamily): ProductionFamilyId { return family.toLowerCase() as ProductionFamilyId; }
export function getProductionTierPresentation(family: SupportedProductionFamily, tier: ProductionTier): ProductionTierPresentation | undefined {
  const definition = getProductionFamilyByGameplayFamily(family);
  const tiers = definition.tiers as Readonly<Partial<Record<ProductionTier, ProductionTierPresentation>>>;
  return tiers[tier];
}
export function requireProductionTierPresentation(family: SupportedProductionFamily, tier: ProductionTier): ProductionTierPresentation {
  const presentation = getProductionTierPresentation(family, tier);
  if (presentation === undefined) throw new Error(`Production content missing for ${family} T${String(tier)}`);
  return presentation;
}
export function getProductionFamilyByProfession(profession: WorkerProfession) { return PRODUCTION_FAMILY_IDS.map((id) => PRODUCTION_FAMILY_CATALOG[id]).find((definition) => definition.profession === profession); }
export const WORKER_PROFESSION_LABELS = { woodcutter: PRODUCTION_FAMILY_CATALOG.wood.professionName, miner: PRODUCTION_FAMILY_CATALOG.ore.professionName, stonecutter: "Tailleur de pierre", skinner: PRODUCTION_FAMILY_CATALOG.hide.professionName, fiber_harvester: PRODUCTION_FAMILY_CATALOG.fiber.professionName } as const satisfies Record<WorkerProfession, string>;
export function getWorkerResourceLabel(profession: WorkerProfession, tier: ProductionTier): string {
  const productionFamily = getProductionFamilyByProfession(profession);
  if (productionFamily === undefined) return "Pierre";
  return getProductionTierPresentation(productionFamily.gameplayFamily, tier)?.resourceName ?? "Pierre";
}
