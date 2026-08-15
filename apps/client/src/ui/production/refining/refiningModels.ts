import type { ProductionTier } from "../../../data/productionFamilyCatalog";
import type { GameBridgeState, RefiningRequirementVM, RefiningVM } from "../../../game/GameBridge";
import {
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
  isProductionTier,
  type ProductionFamilyId,
} from "../../../data/productionFamilyCatalog";

export type RefiningFamilyId = ProductionFamilyId;

export interface RefiningRequirementModel extends RefiningRequirementVM {
  readonly label: string;
  readonly icon: string;
}

export interface RefiningFamilyModel {
  readonly id: RefiningFamilyId;
  readonly label: string;
  readonly rawLabel: string;
  readonly rawIcon: string;
  readonly refinedIcon: string;
  readonly tier: ProductionTier;
  readonly activity: RefiningVM;
  readonly requirements: readonly RefiningRequirementModel[];
  readonly availableCycles: number;
  readonly canStart: boolean;
}

export interface RefiningModel {
  /** @deprecated Refining tiers are family-scoped. */
  readonly tier: ProductionTier;
  readonly families: readonly RefiningFamilyModel[];
  readonly activeJobs: readonly RefiningFamilyModel[];
}

interface RefiningSource {
  readonly refining: RefiningVM;
  readonly metalRefining: RefiningVM;
  readonly leatherRefining: RefiningVM;
  readonly clothRefining: RefiningVM;
}

export function selectRefiningSource(state: GameBridgeState): RefiningSource {
  return {
    refining: state.refining,
    metalRefining: state.metalRefining,
    leatherRefining: state.leatherRefining,
    clothRefining: state.clothRefining,
  };
}

export function buildRefiningModel(source: RefiningSource): RefiningModel {
  const activities = {
    wood: source.refining,
    ore: source.metalRefining,
    hide: source.leatherRefining,
    fiber: source.clothRefining,
  } satisfies Record<RefiningFamilyId, RefiningVM>;

  const createFamily = (id: RefiningFamilyId): RefiningFamilyModel => {
    const definition = getProductionFamilyDefinition(id);
    const activity = activities[id];
    const requirements = activity.requirements.map((requirement) => ({
      ...requirement,
      label: formatMaterialName(requirement.itemId, definition.rawMaterialLabel),
      icon: materialIcon(requirement.itemId, definition.rawIcon, definition.refinedIcon),
    }));
    const availableCycles = requirements.length === 0
      ? 0
      : Math.min(...requirements.map((requirement) => (
        Math.floor(requirement.available / Math.max(1, requirement.quantity))
      )));
    return {
      id,
      label: definition.label,
      rawLabel: definition.rawMaterialLabel,
      rawIcon: definition.rawIcon,
      refinedIcon: definition.refinedIcon,
      tier: inferRefiningTier(activity),
      activity,
      requirements,
      availableCycles,
      canStart: requirements.length > 0
        && requirements.every((requirement) => requirement.available >= requirement.quantity),
    };
  };

  const families = PRODUCTION_FAMILY_IDS.map(createFamily);

  return {
    tier: families[0]?.tier ?? 3,
    families,
    activeJobs: families.filter((family) => family.activity.status === "refining"),
  };
}

function inferRefiningTier(activity: RefiningVM): ProductionTier {
  const rawItemId = activity.requirements.find((requirement) => (
    requirement.itemId.startsWith("item_resource_")
  ))?.itemId;
  const rawTier = rawItemId?.match(/_t(\d+)$/i)?.[1];
  const tier = rawTier === undefined ? 3 : Number(rawTier);
  return isProductionTier(tier) ? tier : 3;
}

function formatMaterialName(itemId: string, rawLabel: string): string {
  const tier = itemId.match(/_t(\d+)$/i)?.[1] ?? "?";
  if (!itemId.startsWith("item_refined_")) return `${rawLabel} brut T${tier}`;
  if (itemId.includes("planks")) return `Planches T${tier}`;
  if (itemId.includes("bar")) return `Lingots T${tier}`;
  if (itemId.includes("leather")) return `Cuir T${tier}`;
  if (itemId.includes("cloth")) return `Tissu T${tier}`;
  return `Ressource raffinée T${tier}`;
}

function materialIcon(itemId: string, rawIcon: string, refinedIcon: string): string {
  return itemId.startsWith("item_refined_") ? refinedIcon : rawIcon;
}
