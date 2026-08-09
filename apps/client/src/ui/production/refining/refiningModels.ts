import type { GameBridgeState, RefiningRequirementVM, RefiningVM } from "../../../game/GameBridge";

export type RefiningFamilyId = "wood" | "ore" | "hide" | "fiber";

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
  readonly activity: RefiningVM;
  readonly requirements: readonly RefiningRequirementModel[];
  readonly availableCycles: number;
  readonly canStart: boolean;
}

export interface RefiningModel {
  readonly tier: 3 | 4;
  readonly families: readonly RefiningFamilyModel[];
  readonly activeJobs: readonly RefiningFamilyModel[];
}

interface RefiningSource {
  readonly tier: 3 | 4;
  readonly refining: RefiningVM;
  readonly metalRefining: RefiningVM;
  readonly leatherRefining: RefiningVM;
  readonly clothRefining: RefiningVM;
}

export function selectRefiningSource(state: GameBridgeState): RefiningSource {
  return {
    tier: state.crafting.productionTier,
    refining: state.refining,
    metalRefining: state.metalRefining,
    leatherRefining: state.leatherRefining,
    clothRefining: state.clothRefining,
  };
}

export function buildRefiningModel(source: RefiningSource): RefiningModel {
  const createFamily = (
    id: RefiningFamilyId,
    label: string,
    rawLabel: string,
    rawIcon: string,
    refinedIcon: string,
    activity: RefiningVM,
  ): RefiningFamilyModel => {
    const requirements = activity.requirements.map((requirement) => ({
      ...requirement,
      label: formatMaterialName(requirement.itemId, rawLabel),
      icon: materialIcon(requirement.itemId, rawIcon, refinedIcon),
    }));
    const availableCycles = requirements.length === 0
      ? 0
      : Math.min(...requirements.map((requirement) => (
        Math.floor(requirement.available / Math.max(1, requirement.quantity))
      )));
    return {
      id,
      label,
      rawLabel,
      rawIcon,
      refinedIcon,
      activity,
      requirements,
      availableCycles,
      canStart: requirements.length > 0
        && requirements.every((requirement) => requirement.available >= requirement.quantity),
    };
  };

  const families = [
    createFamily("wood", "Bois", "Bois", "resource-birch-log.png", "resource-birch-planks.png", source.refining),
    createFamily("ore", "Minerai", "Minerai", "resource-copper-ore.png", "resource-copper-ingot.png", source.metalRefining),
    createFamily("hide", "Peau", "Peau", "resource-hide.png", "resource-leather.png", source.leatherRefining),
    createFamily("fiber", "Fibres", "Fibre", "resource-fiber.png", "resource-cloth.png", source.clothRefining),
  ] as const;

  return {
    tier: source.tier,
    families,
    activeJobs: families.filter((family) => family.activity.status === "refining"),
  };
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
