import {
  RESEARCH_AUTHORED_DEFINITIONS,
  RESEARCH_IDS,
  RESEARCH_UNLOCK_IDS,
  type AuthoredResearchRequirement,
} from "@game/data";
import type { ResearchDefinition, ResearchRequirementDefinition } from "@game/gameplay";

export { RESEARCH_IDS, RESEARCH_UNLOCK_IDS };

export type ResearchContentRequirement = ResearchRequirementDefinition & AuthoredResearchRequirement;

export type ResearchPresentationGroup = "core" | "faction";

export interface ResearchPresentationInfo {
  readonly group: ResearchPresentationGroup;
  readonly description: string;
  readonly effectSummary: string;
  readonly hiddenWhileLocked?: boolean;
}

export const RESEARCH_DEFINITIONS: readonly ResearchDefinition<ResearchContentRequirement>[] =
  RESEARCH_AUTHORED_DEFINITIONS;

const RESEARCH_PRESENTATION = new Map<string, ResearchPresentationInfo>([
  [RESEARCH_IDS.cartography1, { group: "core", description: "Ouvre les expéditions généralistes T4.", effectSummary: "Débloque les expéditions généralistes T4." }],
  [RESEARCH_IDS.cartography2, { group: "core", description: "Étend les expéditions généralistes au T5.", effectSummary: "Débloque les expéditions généralistes T5." }],
  [RESEARCH_IDS.cartography3, { group: "core", description: "Étend les expéditions généralistes au T6 et augmente la capacité d’expédition.", effectSummary: "Débloque les expéditions généralistes T6 et un second slot d’expédition." }],
  [RESEARCH_IDS.cartography4, { group: "core", description: "Étend les expéditions généralistes au T7.", effectSummary: "Débloque les expéditions généralistes T7." }],
  [RESEARCH_IDS.cartography5, { group: "core", description: "Étend les expéditions généralistes au T8.", effectSummary: "Débloque les expéditions généralistes T8." }],
  [RESEARCH_IDS.archaeology1, { group: "faction", description: "Ouvre l’expédition Faction T4.", effectSummary: "Débloque l’expédition Faction T4." }],
  [RESEARCH_IDS.archaeology2, { group: "faction", description: "Étend l’expédition Faction au T5.", effectSummary: "Débloque l’expédition Faction T5." }],
  [RESEARCH_IDS.archaeology3, { group: "faction", description: "Étend l’expédition Faction au T6.", effectSummary: "Débloque l’expédition Faction T6." }],
  [RESEARCH_IDS.archaeology4, { group: "faction", description: "Étend l’expédition Faction au T7.", effectSummary: "Débloque l’expédition Faction T7." }],
  [RESEARCH_IDS.archaeology5, { group: "faction", description: "Étend l’expédition Faction au T8.", effectSummary: "Débloque l’expédition Faction T8." }],
  [RESEARCH_IDS.enchantmentStudy, {
    group: "core",
    description: "Étudie les éclats d’enchantement découverts dans le monde afin d’en comprendre l’usage.",
    effectSummary: "Débloque le service Enchanter chez le Marchand.",
    hiddenWhileLocked: true,
  }],
  [RESEARCH_IDS.yieldAnalysis, {
    group: "core",
    description: "Analyse les sources de ressources afin de comparer le stock détenu au rendement réellement disponible dans l’activité courante.",
    effectSummary: "Débloque le suivi d’une ressource favorite et son rendement dans le Dashboard.",
  }],
  [RESEARCH_IDS.workerOrganization, {
    group: "core",
    description: "Étend l’organisation de la production passive de l’île avec un second ouvrier par métier.",
    effectSummary: "Porte la capacité à 8 ouvriers, avec 2 ouvriers maximum par profession.",
  }],
  [RESEARCH_IDS.bankManagement, {
    group: "core",
    description: "Structure le stockage bancaire en plusieurs coffres spécialisés et autorise l’achat d’extensions auprès du Marchand.",
    effectSummary: "Débloque Banque II et le service marchand Extensions de banque.",
  }],
  [RESEARCH_IDS.instantRefining, {
    group: "core",
    description: "Automatise la transformation des stocks raffinables sans modifier les recettes ni les rendements.",
    effectSummary: "Débloque le raffinage instantané par lot dans les bâtiments de raffinage.",
  }],
  [RESEARCH_IDS.dungeonRelicAnalysis, {
    group: "core",
    description: "Analyse à l’Académie la Relique chargée découverte à Frostpeak Mountain afin d’ouvrir la boucle Donjons.",
    effectSummary: "Débloque les Donjons, les drops de clés/fragments et le drop rare de Runes de faction sur les monstres de faction.",
  }],
]);

/**
 * Presentation labels for canonical authored unlock IDs.
 * Research membership is never authored here: it is derived from each definition.unlockIds.
 */
const RESEARCH_UNLOCK_PRESENTATION = new Map<string, readonly string[]>([
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier4, ["Expéditions généralistes T4"]],
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier5, ["Expéditions généralistes T5"]],
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier6, ["Expéditions généralistes T6"]],
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier7, ["Expéditions généralistes T7"]],
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier8, ["Expéditions généralistes T8"]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier4, ["Expédition Faction T4"]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier5, ["Expédition Faction T5"]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier6, ["Expédition Faction T6"]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier7, ["Expédition Faction T7"]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier8, ["Expédition Faction T8"]],
  [RESEARCH_UNLOCK_IDS.secondExpeditionSlot, ["Second slot d’expédition"]],
  [RESEARCH_UNLOCK_IDS.enchantmentService, ["Service marchand : Enchanter", "Utilisation des éclats d’enchantement"]],
  [RESEARCH_UNLOCK_IDS.resourceYieldTracking, ["Suivi d’une ressource favorite", "Stock actuel", "Rendement de la ressource / h"]],
  [RESEARCH_UNLOCK_IDS.advancedWorkerOrganization, ["8 ouvriers maximum", "2 ouvriers par profession", "Recrutement avancé à 5 000 Silver"]],
  [RESEARCH_UNLOCK_IDS.advancedBankManagement, ["Banque II", "Service marchand : Extensions de banque"]],
  [RESEARCH_UNLOCK_IDS.instantRefining, ["Raffinage instantané par lot", "Recettes et rendements inchangés"]],
  [RESEARCH_UNLOCK_IDS.dungeonRelicAnalyzed, []],
  [RESEARCH_UNLOCK_IDS.dungeonSystem, ["World > Donjons", "Drops de fragments de clé", "Drops de clés complètes"]],
  [RESEARCH_UNLOCK_IDS.factionRuneWorldDrop, ["Drop rare de Runes de faction dans le monde"]],
]);

export function getResearchPresentationGroup(
  researchId: string,
): ResearchPresentationGroup | undefined {
  return RESEARCH_PRESENTATION.get(researchId)?.group;
}

export function getResearchPresentationInfo(
  researchId: string,
): ResearchPresentationInfo | undefined {
  return RESEARCH_PRESENTATION.get(researchId);
}

export function getResearchUnlockedContent(researchId: string): readonly string[] {
  const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === researchId);
  if (definition === undefined) return [];
  return definition.unlockIds.flatMap((unlockId) => RESEARCH_UNLOCK_PRESENTATION.get(unlockId) ?? []);
}
