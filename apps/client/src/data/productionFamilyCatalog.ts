import type { MasteryId, ResourceFamily, WorkerProfession } from "@game/gameplay";
import {
  FIBER_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  ORE_GATHERING_MASTERY_ID,
  WOOD_GATHERING_MASTERY_ID,
} from "./progressionContentCatalog.js";
export const PRODUCTION_TIERS = [3, 4, 5, 6, 7, 8] as const;
export type ProductionTier = (typeof PRODUCTION_TIERS)[number];

/** Tiers whose legacy/full production surface (including workers) is authored. */
export const PRODUCTION_CONTENT_TIERS = [3, 4, 5] as const satisfies readonly ProductionTier[];

/** Tiers whose active hero gathering content is authored. */
export const GATHERING_CONTENT_TIERS = [3, 4, 5, 6] as const satisfies readonly ProductionTier[];

/** Tiers whose refining recipes are authored. */
export const REFINING_CONTENT_TIERS = [3, 4, 5, 6] as const satisfies readonly ProductionTier[];

/** Tiers whose conventional equipment crafting content is authored. */
export const CRAFTING_CONTENT_TIERS = [3, 4, 5, 6] as const satisfies readonly ProductionTier[];

export function isProductionTier(value: unknown): value is ProductionTier {
  return (
    typeof value === "number" &&
    PRODUCTION_TIERS.includes(value as ProductionTier)
  );
}

export interface ProductionTierRules {
  readonly gatheringBaseTicks: number;
  readonly gatheringToolSpeedModifier: number;
  readonly workerSpeedModifier: number;
  readonly resourceRespawnDurationTicks: number;
}

export const PRODUCTION_TIER_RULES = {
  3: {
    gatheringBaseTicks: 24,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 240,
  },
  4: {
    gatheringBaseTicks: 36,
    gatheringToolSpeedModifier: 0.85,
    workerSpeedModifier: 0.75,
    resourceRespawnDurationTicks: 360,
  },
  5: {
    gatheringBaseTicks: 48,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 360,
  },
  6: {
    gatheringBaseTicks: 60,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 360,
  },
  7: {
    gatheringBaseTicks: 72,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 360,
  },
  8: {
    gatheringBaseTicks: 84,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 360,
  },
} as const satisfies Record<ProductionTier, ProductionTierRules>;

export function getProductionTierRules(
  tier: ProductionTier,
): ProductionTierRules {
  return PRODUCTION_TIER_RULES[tier];
}

interface ProductionTierPresentation {
  readonly resourceName: string;
  readonly toolName: string;
}

interface ProductionFamilyDefinition {
  readonly gameplayFamily: Extract<ResourceFamily, "Wood" | "Ore" | "Hide" | "Fiber">;
  readonly profession: Extract<WorkerProfession, "woodcutter" | "miner" | "skinner" | "fiber_harvester">;
  readonly professionName: string;
  readonly masteryId: MasteryId;
  readonly label: string;
  readonly masterySymbol: string;
  readonly professionIcon: string;
  readonly visualManifestId: string;
  readonly gatheringIcon: string;
  readonly rawIcon: string;
  readonly refinedIcon: string;
  readonly rawMaterialLabel: string;
  readonly tiers: Readonly<Partial<Record<ProductionTier, ProductionTierPresentation>>>;
}

/** Stable cross-domain metadata for the four supported Production families. */
export const PRODUCTION_FAMILY_CATALOG = {
  wood: {
    gameplayFamily: "Wood",
    profession: "woodcutter",
    professionName: "Bûcheron",
    masteryId: WOOD_GATHERING_MASTERY_ID,
    label: "Bois",
    masterySymbol: "🌲",
    professionIcon: "/assets/ui/professions/profession-woodcutting.png",
    visualManifestId: "resource_wood",
    gatheringIcon: "resource-birch-node.png",
    rawIcon: "resource-birch-log.png",
    refinedIcon: "resource-birch-planks.png",
    rawMaterialLabel: "Bois",
    tiers: {
      3: { resourceName: "Bois de bouleau", toolName: "Hache de compagnon" },
      4: { resourceName: "Bois de pin", toolName: "Hache d'expert" },
      5: { resourceName: "Bois de cèdre", toolName: "Hache de maître" },
      6: { resourceName: "Bois de chêne sanglant", toolName: "Hache de grand maître" },
    },
  },
  ore: {
    gameplayFamily: "Ore",
    profession: "miner",
    professionName: "Mineur",
    masteryId: ORE_GATHERING_MASTERY_ID,
    label: "Minerai",
    masterySymbol: "⛏",
    professionIcon: "/assets/ui/professions/profession-mining.png",
    visualManifestId: "resource_ore",
    gatheringIcon: "resource-copper-pickaxe.png",
    rawIcon: "resource-copper-ore.png",
    refinedIcon: "resource-copper-ingot.png",
    rawMaterialLabel: "Minerai",
    tiers: {
      3: { resourceName: "Minerai de cuivre", toolName: "Pioche de compagnon" },
      4: { resourceName: "Minerai de fer", toolName: "Pioche d'expert" },
      5: { resourceName: "Minerai de titane", toolName: "Pioche de maître" },
      6: { resourceName: "Minerai de runite", toolName: "Pioche de grand maître" },
    },
  },
  hide: {
    gameplayFamily: "Hide",
    profession: "skinner",
    professionName: "Dépeceur",
    masteryId: HIDE_GATHERING_MASTERY_ID,
    label: "Peau",
    masterySymbol: "🦌",
    professionIcon: "/assets/ui/professions/profession-skinning.png",
    visualManifestId: "resource_hide",
    gatheringIcon: "resource-hide.png",
    rawIcon: "resource-hide.png",
    refinedIcon: "resource-leather.png",
    rawMaterialLabel: "Peau",
    tiers: {
      3: { resourceName: "Peau robuste", toolName: "Couteau de dépeçage" },
      4: { resourceName: "Peau épaisse", toolName: "Couteau de dépeçage d'expert" },
      5: { resourceName: "Peau lourde", toolName: "Couteau de dépeçage de maître" },
      6: { resourceName: "Peau renforcée", toolName: "Couteau de dépeçage de grand maître" },
    },
  },
  fiber: {
    gameplayFamily: "Fiber",
    profession: "fiber_harvester",
    professionName: "Herboriste",
    masteryId: FIBER_GATHERING_MASTERY_ID,
    label: "Fibres",
    masterySymbol: "🌿",
    professionIcon: "/assets/ui/professions/profession-fiber-harvesting.png",
    visualManifestId: "resource_fiber",
    gatheringIcon: "resource-fiber.png",
    rawIcon: "resource-fiber.png",
    refinedIcon: "resource-cloth.png",
    rawMaterialLabel: "Fibre",
    tiers: {
      3: { resourceName: "Fibre de lin", toolName: "Faucille de compagnon" },
      4: { resourceName: "Fibre fine", toolName: "Faucille d'expert" },
      5: { resourceName: "Fibre céleste", toolName: "Faucille de maître" },
      6: { resourceName: "Fibre écarlate", toolName: "Faucille de grand maître" },
    },
  },
} as const satisfies Record<string, ProductionFamilyDefinition>;

export type ProductionFamilyId = keyof typeof PRODUCTION_FAMILY_CATALOG;
export type SupportedProductionFamily =
  (typeof PRODUCTION_FAMILY_CATALOG)[ProductionFamilyId]["gameplayFamily"];

export const PRODUCTION_FAMILY_IDS = Object.freeze(
  Object.keys(PRODUCTION_FAMILY_CATALOG) as ProductionFamilyId[],
);

export const PRODUCTION_FAMILIES = Object.freeze(
  PRODUCTION_FAMILY_IDS.map((id) => PRODUCTION_FAMILY_CATALOG[id].gameplayFamily),
);

const PRODUCTION_FAMILY_SET = new Set<string>(PRODUCTION_FAMILIES);

export function isSupportedProductionFamily(value: string): value is SupportedProductionFamily {
  return PRODUCTION_FAMILY_SET.has(value);
}

export function getProductionFamilyDefinition(id: ProductionFamilyId) {
  return PRODUCTION_FAMILY_CATALOG[id];
}

export function getProductionFamilyByGameplayFamily(family: SupportedProductionFamily) {
  return getProductionFamilyDefinition(getProductionFamilyId(family));
}

export function getProductionFamilyId(family: SupportedProductionFamily): ProductionFamilyId {
  return family.toLowerCase() as ProductionFamilyId;
}

export function getProductionTierPresentation(
  family: SupportedProductionFamily,
  tier: ProductionTier,
): ProductionTierPresentation | undefined {
  const definition = getProductionFamilyByGameplayFamily(family);
  const tiers = definition.tiers as Readonly<
    Partial<Record<ProductionTier, ProductionTierPresentation>>
  >;

  return tiers[tier];
}

export function requireProductionTierPresentation(
  family: SupportedProductionFamily,
  tier: ProductionTier,
): ProductionTierPresentation {
  const presentation = getProductionTierPresentation(family, tier);

  if (presentation === undefined) {
    throw new Error(
      `Production content missing for ${family} T${String(tier)}`,
    );
  }

  return presentation;
}

export function getProductionFamilyByProfession(profession: WorkerProfession) {
  return PRODUCTION_FAMILY_IDS
    .map((id) => PRODUCTION_FAMILY_CATALOG[id])
    .find((definition) => definition.profession === profession);
}

export const WORKER_PROFESSION_LABELS = {
  woodcutter: PRODUCTION_FAMILY_CATALOG.wood.professionName,
  miner: PRODUCTION_FAMILY_CATALOG.ore.professionName,
  stonecutter: "Tailleur de pierre",
  skinner: PRODUCTION_FAMILY_CATALOG.hide.professionName,
  fiber_harvester: PRODUCTION_FAMILY_CATALOG.fiber.professionName,
} as const satisfies Record<WorkerProfession, string>;

export function getWorkerResourceLabel(
  profession: WorkerProfession,
  tier: ProductionTier,
): string {
  const productionFamily = getProductionFamilyByProfession(profession);

  if (productionFamily === undefined) {
    return "Pierre";
  }

  return getProductionTierPresentation(
    productionFamily.gameplayFamily,
    tier,
  )?.resourceName ?? "Pierre";
}
