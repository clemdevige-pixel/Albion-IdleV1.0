import type { IslandBuildingId } from "@game/data";
import type { AcademyResearchEntryModel } from "../../runtime/bootstrap/createAcademyPresentationFoundation.js";
import { RESEARCH_IDS } from "../../data/researchContentCatalog.js";

export type BlueOnboardingStepId =
  | "build_gathering"
  | "start_worker"
  | "build_workshop"
  | "craft_t3_armor"
  | "discover_enchantment"
  | "unlock_enchantment"
  | "reach_relic"
  | "analyze_relic"
  | "locate_sanctuaries"
  | "clear_t4_dungeon"
  | "artifact_intro";

export interface BlueOnboardingStep {
  readonly id: BlueOnboardingStepId;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly hint: string;
  readonly informational?: boolean;
}

export interface BlueOnboardingSnapshot {
  readonly buildingIds: ReadonlySet<IslandBuildingId>;
  readonly workerStarted: boolean;
  readonly hasT3Armor: boolean;
  readonly academyResearch: readonly AcademyResearchEntryModel[];
  readonly dungeonUnlocked: boolean;
  readonly clearedDungeonTiers: readonly number[];
  readonly artifactWeaponOwned: boolean;
  readonly artifactIntroDismissed: boolean;
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

  if (!snapshot.hasT3Armor) {
    return {
      id: "craft_t3_armor",
      eyebrow: "Équipement",
      title: "Fabriquez votre première armure T3",
      description: "L’armure est la pièce maîtresse de votre premier équipement. Consultez sa recette et préparez les matériaux nécessaires.",
      hint: "Repère : Île → Atelier → Armures T3.",
    };
  }

  const enchantmentState = researchState(snapshot, RESEARCH_IDS.enchantmentStudy);
  if (enchantmentState === "locked") {
    return {
      id: "discover_enchantment",
      eyebrow: "Zone Bleue",
      title: "Poursuivez votre progression",
      description: "Avancez dans la Zone Bleue. Certains drops vont bientôt révéler une nouvelle piste de recherche liée à l’enchantement.",
      hint: "Repère : Monde → Progression. Le mode Farm reste disponible si vous souhaitez revenir sur un segment.",
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
        ? "Repère : Île → Académie → Étude de l’enchantement."
        : "Repère : Île → emplacement libre → Académie.",
    };
  }

  const relicAnalysisState = researchState(snapshot, RESEARCH_IDS.dungeonRelicAnalysis);
  if (relicAnalysisState === "locked") {
    return {
      id: "reach_relic",
      eyebrow: "Zone Bleue",
      title: "Continuez jusqu’à Frostpeak",
      description: "Vous connaissez maintenant les bases de la production et de l’enchantement. Continuez librement votre progression jusqu’aux profondeurs de la Zone Bleue.",
      hint: "Repère : Monde → Progression. Une découverte à Frostpeak ouvrira la prochaine piste.",
    };
  }

  if (relicAnalysisState !== "completed") {
    return {
      id: "analyze_relic",
      eyebrow: "Relique",
      title: relicAnalysisState === "active" ? "Analyse de la Relique en cours" : "Analysez la Relique chargée",
      description: "La Relique découverte à Frostpeak peut être étudiée à l’Académie. Son analyse révélera où poursuivre vos recherches.",
      hint: "Repère : Île → Académie → Analyse de la Relique.",
    };
  }

  const sanctuaryState = researchState(snapshot, RESEARCH_IDS.dungeonSanctuaryLocation);
  if (!snapshot.dungeonUnlocked || sanctuaryState !== "completed") {
    return {
      id: "locate_sanctuaries",
      eyebrow: "Donjons",
      title: sanctuaryState === "active" ? "Localisation des Sanctuaires en cours" : "Localisez les Sanctuaires",
      description: "Cette recherche ouvre la boucle Donjons ainsi que les clés, fragments et Runes de faction associés.",
      hint: "Repère : Île → Académie → Localisation des Sanctuaires.",
    };
  }

  if (!snapshot.clearedDungeonTiers.includes(4)) {
    return {
      id: "clear_t4_dungeon",
      eyebrow: "Premier donjon",
      title: "Terminez un donjon T4",
      description: "Les Donjons sont maintenant accessibles. Consultez les conditions d’entrée, utilisez une clé adaptée et tentez votre premier clear T4 quand vous le souhaitez.",
      hint: "Repère : Monde → Donjons.",
    };
  }

  if (!snapshot.artifactWeaponOwned && !snapshot.artifactIntroDismissed) {
    return {
      id: "artifact_intro",
      eyebrow: "Nouvelle branche d’équipement",
      title: "Artefacts et armes artefact",
      description: "Les donjons introduisent des fragments et artefacts de faction. Ces composants servent à fabriquer des armes artefact, une nouvelle branche d’équipement distincte des armes conventionnelles.",
      hint: "Consultez les fragments obtenus puis les recettes d’armes artefact à l’Atelier. Vous êtes désormais libre de choisir votre prochaine direction.",
      informational: true,
    };
  }

  return null;
}
