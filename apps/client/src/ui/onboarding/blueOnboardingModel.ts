import type { IslandBuildingId } from "@game/data";
import type { AcademyResearchEntryModel } from "../../runtime/bootstrap/createAcademyPresentationFoundation.js";
import { RESEARCH_IDS } from "../../data/researchContentCatalog.js";

export type BlueOnboardingStepId =
  | "build_gathering"
  | "start_worker"
  | "build_workshop"
  | "craft_t3_chest"
  | "equip_t4"
  | "progress_blue"
  | "unlock_enchantment"
  | "reach_frostpeak"
  | "discover_relic"
  | "charge_relic"
  | "analyze_relic"
  | "enter_t4_dungeon"
  | "clear_t4_dungeon"
  | "artifact_fragments"
  | "artifact_weapons";

export interface BlueOnboardingStep {
  readonly id: BlueOnboardingStepId;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly hint: string;
  readonly informational?: boolean;
}

export type BlueOnboardingRelicState = "unobtained" | "broken" | "charged" | "examined";
export type BlueOnboardingArtifactStage = "artifacts" | "artifact_weapons" | "done";

export interface BlueOnboardingSnapshot {
  readonly buildingIds: ReadonlySet<IslandBuildingId>;
  readonly workerStarted: boolean;
  readonly hasChestArmorTier3OrHigher: boolean;
  readonly hasEquippedTier4OrHigher: boolean;
  readonly hasProgressedBeyondEarlyProduction: boolean;
  readonly academyResearch: readonly AcademyResearchEntryModel[];
  readonly hasReachedFrostpeak: boolean;
  readonly relicState: BlueOnboardingRelicState;
  readonly relicChargeKills: number;
  readonly relicRequiredChargeKills: number;
  readonly dungeonUnlocked: boolean;
  readonly activeDungeon: boolean;
  readonly clearedDungeonTiers: readonly number[];
  readonly artifactWeaponOwned: boolean;
  readonly artifactStage: BlueOnboardingArtifactStage;
  readonly beyondBlueOnboarding: boolean;
}

const GATHERING_BUILDING_IDS: ReadonlySet<IslandBuildingId> = new Set([
  "lumber_camp",
  "mine",
  "hunting_camp",
  "fiber_camp",
]);

function researchState(
  snapshot: BlueOnboardingSnapshot,
  researchId: string,
): AcademyResearchEntryModel["state"] {
  return snapshot.academyResearch.find((entry) => entry.id === researchId)?.state ?? "locked";
}

function hasGatheringBuilding(snapshot: BlueOnboardingSnapshot): boolean {
  return [...GATHERING_BUILDING_IDS].some((id) => snapshot.buildingIds.has(id));
}

export function resolveBlueOnboardingStep(
  snapshot: BlueOnboardingSnapshot,
): BlueOnboardingStep | null {
  if (snapshot.beyondBlueOnboarding) return null;

  const enchantmentState = researchState(snapshot, RESEARCH_IDS.enchantmentStudy);
  const relicAnalysisState = researchState(snapshot, RESEARCH_IDS.dungeonRelicAnalysis);
  const hasClearedT4Dungeon = snapshot.clearedDungeonTiers.includes(4);
  const laterProgressMakesEarlyProductionObsolete =
    snapshot.hasProgressedBeyondEarlyProduction
    || enchantmentState !== "locked"
    || snapshot.hasReachedFrostpeak
    || snapshot.relicState !== "unobtained"
    || snapshot.dungeonUnlocked
    || hasClearedT4Dungeon;

  if (!laterProgressMakesEarlyProductionObsolete) {
    if (!hasGatheringBuilding(snapshot)) {
      return {
        id: "build_gathering",
        eyebrow: "Premiers pas",
        title: "Démarrez une filière de récolte",
        description: "Choisissez un bâtiment de récolte lié aux matériaux dont vous aurez besoin pour votre premier équipement.",
        hint: "Repère : Île → emplacement libre → bâtiment de récolte.",
      };
    }

    if (!snapshot.workerStarted) {
      return {
        id: "start_worker",
        eyebrow: "Production passive",
        title: "Lancez votre premier ouvrier",
        description: "Recrutez un ouvrier correspondant à votre filière et mettez-le au travail. Sa production passive complète la récolte active du héros.",
        hint: "Repère : Île → Maison des ouvriers.",
      };
    }

    if (!snapshot.buildingIds.has("workshop")) {
      return {
        id: "build_workshop",
        eyebrow: "Raffinage",
        title: "Transformez vos premières ressources",
        description: "Raffinez votre récolte puis utilisez ces matériaux pour construire l’Atelier. Cette étape relie production et fabrication d’équipement.",
        hint: "Repère : bâtiments de raffinage, puis Île → Atelier.",
      };
    }

    if (!snapshot.hasChestArmorTier3OrHigher) {
      return {
        id: "craft_t3_chest",
        eyebrow: "Équipement",
        title: "Fabriquez votre armure de torse T3",
        description: "Le torse est la pièce centrale de votre premier équipement. Consultez sa recette et préparez les matériaux nécessaires.",
        hint: "Repère : Île → Atelier → Armures de torse T3.",
      };
    }
  }

  const laterProgressMakesT4EquipmentObsolete =
    enchantmentState === "completed"
    || snapshot.hasReachedFrostpeak
    || snapshot.relicState !== "unobtained"
    || snapshot.dungeonUnlocked
    || hasClearedT4Dungeon;

  if (!laterProgressMakesT4EquipmentObsolete && !snapshot.hasEquippedTier4OrHigher) {
    return {
      id: "equip_t4",
      eyebrow: "Équipement T4",
      title: "Passez progressivement à l’équipement T4",
      description: "La Zone Bleue vous permet maintenant d’améliorer votre équipement. Commencez à remplacer votre équipement T3 par des pièces T4 pour préparer la suite de votre progression.",
      hint: "Repère : fabriquez puis équipez votre première pièce T4.",
    };
  }

  if (enchantmentState === "locked") {
    return {
      id: "progress_blue",
      eyebrow: "Zone Bleue",
      title: "Progressez dans la Zone Bleue",
      description: "Utilisez Progression pour avancer vers de nouveaux segments et Farm pour revenir exploiter un contenu déjà débloqué.",
      hint: "Repère : Monde → Progression / Farm. Inutile de suivre chaque segment comme une checklist.",
    };
  }

  if (enchantmentState !== "completed") {
    const academyBuilt = snapshot.buildingIds.has("academy");
    return {
      id: "unlock_enchantment",
      eyebrow: "Académie",
      title: enchantmentState === "active" ? "Étude de l’enchantement en cours" : "Découvrez l’Académie et l’enchantement",
      description: enchantmentState === "active"
        ? "L’Académie analyse les éclats découverts. Une fois la recherche terminée, le service Enchanter sera disponible chez le Marchand."
        : academyBuilt
          ? "La découverte des éclats a ouvert une nouvelle recherche. Lancez-la pour comprendre leur usage et ouvrir le service Enchanter."
          : "La découverte des éclats a ouvert votre première piste de recherche. Construisez l’Académie, puis lancez l’Étude de l’enchantement pour ouvrir le service Enchanter.",
      hint: academyBuilt
        ? "Repère : Île → Académie → Étude de l’enchantement. Aucun enchantement réel n’est requis."
        : "Repère : Île → emplacement libre → Académie.",
    };
  }

  if (!snapshot.hasReachedFrostpeak) {
    return {
      id: "reach_frostpeak",
      eyebrow: "Zone Bleue",
      title: "Continuez jusqu’à Frostpeak",
      description: "Vous connaissez maintenant les bases de la production et de l’enchantement. Continuez librement votre progression jusqu’à Frostpeak Mountain.",
      hint: "Repère : Monde → Progression.",
    };
  }

  if (snapshot.relicState === "unobtained") {
    return {
      id: "discover_relic",
      eyebrow: "Frostpeak",
      title: "Découvrez la Relique",
      description: "Poursuivez Frostpeak jusqu’à la découverte de la Relique liée aux Donjons. Cette découverte appartient à la progression normale du monde.",
      hint: "Repère : Frostpeak Mountain → Progression.",
    };
  }

  if (snapshot.relicState === "broken") {
    return {
      id: "charge_relic",
      eyebrow: "Relique",
      title: "Chargez la Relique",
      description: `La Relique doit être chargée avant de pouvoir être étudiée à l’Académie. Progression actuelle : ${snapshot.relicChargeKills}/${snapshot.relicRequiredChargeKills}.`,
      hint: "Repère : éliminez les factions demandées par la Relique jusqu’à compléter sa charge.",
    };
  }

  if (relicAnalysisState !== "completed") {
    return {
      id: "analyze_relic",
      eyebrow: "Relique",
      title: relicAnalysisState === "active" ? "Analyse de la Relique en cours" : "Analysez la Relique à l’Académie",
      description: "La Relique est chargée. Son analyse débloque directement les Donjons, les drops de clés/fragments et le drop rare de Runes de faction.",
      hint: "Repère : Île → Académie → Analyse de la Relique.",
    };
  }

  if (!snapshot.dungeonUnlocked) return null;

  if (!hasClearedT4Dungeon) {
    if (!snapshot.activeDungeon) {
      return {
        id: "enter_t4_dungeon",
        eyebrow: "Premier donjon",
        title: "Entrez dans votre premier donjon T4",
        description: "Les Donjons sont accessibles. Consultez les conditions d’entrée et lancez un Donjon T4 lorsque les règles de clés existantes vous le permettent.",
        hint: "Repère : Monde → Donjons. Le guide ne contourne aucun prérequis.",
      };
    }

    return {
      id: "clear_t4_dungeon",
      eyebrow: "Premier donjon",
      title: "Terminez votre donjon T4",
      description: "Allez au bout du Donjon. Sa complétion est suivie par la progression canonique des Donjons.",
      hint: "Repère : poursuivez le Donjon en cours jusqu’au clear.",
    };
  }

  if (snapshot.artifactWeaponOwned || snapshot.artifactStage === "done") return null;

  if (snapshot.artifactStage === "artifacts") {
    return {
      id: "artifact_fragments",
      eyebrow: "Nouvelle progression",
      title: "Comprenez les Artifacts et fragments",
      description: "Les Donjons introduisent des fragments et Artifacts qui servent de composants à une branche spéciale d’équipement.",
      hint: "Cette étape est informative : aucun grind ni craft n’est requis pour continuer.",
      informational: true,
    };
  }

  return {
    id: "artifact_weapons",
    eyebrow: "Nouvelle branche d’équipement",
    title: "Découvrez les armes d’Artifact",
    description: "Les armes d’Artifact utilisent ces composants dans des recettes spéciales, distinctes des armes conventionnelles.",
    hint: "Repère : Île → Atelier → recettes d’armes d’Artifact. Aucun craft n’est requis pour terminer vos premiers pas.",
    informational: true,
  };
}
