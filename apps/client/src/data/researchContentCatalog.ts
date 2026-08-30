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

export interface ResearchUnlockPresentation {
  readonly label: string;
  readonly destination?: string;
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
  [RESEARCH_IDS.blackMarket, {
    group: "core",
    description: "Établit un réseau clandestin capable d’absorber les surplus d’équipements contre du Silver, au prix d’un risque de perte totale du cargo.",
    effectSummary: "Débloque le Marché Noir chez le Marchand.",
  }],
  [RESEARCH_IDS.dungeonRelicAnalysis, {
    group: "core",
    description: "Analyse à l’Académie la Relique chargée découverte à Frostpeak Mountain afin d’ouvrir la boucle Donjons.",
    effectSummary: "Débloque les Donjons, les drops de clés/fragments et le drop rare de Runes de faction sur les monstres de faction.",
  }],
  [RESEARCH_IDS.towerStudy, {
    group: "core",
    description: "Étudie la Tour révélée au terme de la progression du Monde afin d’en comprendre l’accès et les épreuves.",
    effectSummary: "Débloque la Tour sans fin dans le Monde.",
    hiddenWhileLocked: true,
  }],
]);

const RESEARCH_UNLOCK_PRESENTATION = new Map<string, readonly ResearchUnlockPresentation[]>([
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier4, [{ label: "Expéditions généralistes T4", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier5, [{ label: "Expéditions généralistes T5", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier6, [{ label: "Expéditions généralistes T6", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier7, [{ label: "Expéditions généralistes T7", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.silverExpeditionTier8, [{ label: "Expéditions généralistes T8", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier4, [{ label: "Expédition Faction T4", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier5, [{ label: "Expédition Faction T5", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier6, [{ label: "Expédition Faction T6", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier7, [{ label: "Expédition Faction T7", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.factionExpeditionTier8, [{ label: "Expédition Faction T8", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.secondExpeditionSlot, [{ label: "Second slot d’expédition", destination: "Académie > Expéditions" }]],
  [RESEARCH_UNLOCK_IDS.enchantmentService, [
    { label: "Service Enchanter", destination: "Marchand > Enchantement" },
    { label: "Utilisation des éclats d’enchantement", destination: "Marchand > Enchantement" },
  ]],
  [RESEARCH_UNLOCK_IDS.resourceYieldTracking, [
    { label: "Une étoile apparaît sur les ressources dans l’Inventaire", destination: "Inventaire > Ressources" },
    { label: "Cliquez sur l’étoile pour choisir la ressource à suivre", destination: "Inventaire > Ressources" },
    { label: "Le stock actuel et le rendement / h de cette ressource sont ensuite affichés", destination: "Tableau de bord" },
  ]],
  [RESEARCH_UNLOCK_IDS.advancedWorkerOrganization, [
    { label: "8 ouvriers maximum", destination: "Île > Ouvriers" },
    { label: "2 ouvriers par profession", destination: "Île > Ouvriers" },
    { label: "Recrutement avancé à 5 000 Silver", destination: "Île > Ouvriers" },
  ]],
  [RESEARCH_UNLOCK_IDS.advancedBankManagement, [
    { label: "Banque II", destination: "Inventaire > Banque" },
    { label: "Extensions de banque", destination: "Marchand > Banque" },
  ]],
  [RESEARCH_UNLOCK_IDS.instantRefining, [
    { label: "Raffinage instantané par lot", destination: "Île > bâtiments de raffinage" },
    { label: "Recettes et rendements inchangés" },
  ]],
  [RESEARCH_UNLOCK_IDS.blackMarket, [
    { label: "Marché Noir", destination: "Marchand > Marché Noir" },
    { label: "Conversion des équipements excédentaires en Silver via convois" },
  ]],
  [RESEARCH_UNLOCK_IDS.dungeonRelicAnalyzed, []],
  [RESEARCH_UNLOCK_IDS.dungeonSystem, [
    { label: "Donjons", destination: "Monde > Donjons" },
    { label: "Drops de fragments et clés de donjon", destination: "Combat contre les monstres éligibles" },
  ]],
  [RESEARCH_UNLOCK_IDS.factionRuneWorldDrop, [
    { label: "Drop rare de Runes de faction", destination: "Monstres de faction dans le monde" },
  ]],
  [RESEARCH_UNLOCK_IDS.towerSystem, [
    { label: "Tour sans fin", destination: "Monde > Tour" },
  ]],
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

export function getResearchUnlockGuidance(
  researchId: string,
): readonly ResearchUnlockPresentation[] {
  const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === researchId);
  if (definition === undefined) return [];
  return definition.unlockIds.flatMap((unlockId) => RESEARCH_UNLOCK_PRESENTATION.get(unlockId) ?? []);
}

export function getResearchUnlockedContent(researchId: string): readonly string[] {
  return getResearchUnlockGuidance(researchId).map((entry) => entry.label);
}
