export type OnboardingMilestoneId =
  | "build_gathering"
  | "recruit_worker"
  | "refine_and_workshop"
  | "craft_t3_chest"
  | "blue_progression"
  | "enchantment_research"
  | "reach_frostpeak"
  | "discover_relic"
  | "research_relic"
  | "unlock_dungeons"
  | "enter_t4_dungeon"
  | "clear_t4_dungeon"
  | "introduce_artifacts"
  | "introduce_artifact_weapons";

export type OnboardingModuleHint = "island" | "world" | "academy" | "merchant" | "dungeons" | "crafting";

export interface OnboardingContentEntry {
  readonly id: OnboardingMilestoneId;
  readonly title: string;
  readonly description: string;
  readonly moduleHint: OnboardingModuleHint;
  readonly phase: "guided" | "light" | "academy" | "dungeon" | "explanation";
}

export const ONBOARDING_CONTENT: Readonly<Record<OnboardingMilestoneId, OnboardingContentEntry>> = {
  build_gathering: {
    id: "build_gathering",
    title: "Construisez votre première filière",
    description: "Construisez un bâtiment de récolte adapté aux matériaux dont vous avez besoin. L’île soutient directement votre progression d’équipement.",
    moduleHint: "island",
    phase: "guided",
  },
  recruit_worker: {
    id: "recruit_worker",
    title: "Recrutez et lancez un ouvrier",
    description: "Un ouvrier produit passivement. Vous pouvez continuer à récolter activement avec votre héros en parallèle.",
    moduleHint: "island",
    phase: "guided",
  },
  refine_and_workshop: {
    id: "refine_and_workshop",
    title: "Passez de la ressource à l’équipement",
    description: "Raffinez vos premières ressources puis construisez l’Atelier : récolte, raffinage et fabrication forment une seule chaîne de production.",
    moduleHint: "island",
    phase: "guided",
  },
  craft_t3_chest: {
    id: "craft_t3_chest",
    title: "Fabriquez votre armure de torse T3",
    description: "Le torse est la pièce centrale de votre premier équipement. Une armure de torse T3 ou supérieure suffit pour poursuivre.",
    moduleHint: "crafting",
    phase: "guided",
  },
  blue_progression: {
    id: "blue_progression",
    title: "Progressez dans la Zone Bleue",
    description: "Utilisez Progression pour avancer et Farm pour revenir exploiter un contenu déjà débloqué. Vous n’avez pas besoin de suivre chaque segment pas à pas.",
    moduleHint: "world",
    phase: "light",
  },
  enchantment_research: {
    id: "enchantment_research",
    title: "Étudiez l’Enchantement à l’Académie",
    description: "La recherche Étude de l’Enchantement introduit l’Académie et débloque le service Enchanter. Aucun enchantement réel n’est requis pour cette étape.",
    moduleHint: "academy",
    phase: "academy",
  },
  reach_frostpeak: {
    id: "reach_frostpeak",
    title: "Atteignez Frostpeak Mountain",
    description: "Continuez librement votre progression dans la Zone Bleue jusqu’à Frostpeak Mountain.",
    moduleHint: "world",
    phase: "light",
  },
  discover_relic: {
    id: "discover_relic",
    title: "Découvrez la Relique de Frostpeak",
    description: "La progression de Frostpeak contient une Relique liée aux Donjons. Sa découverte est gérée par la progression du monde, pas par ce guide.",
    moduleHint: "world",
    phase: "academy",
  },
  research_relic: {
    id: "research_relic",
    title: "Analysez la Relique à l’Académie",
    description: "L’Analyse de la Relique révèle la recherche suivante nécessaire pour comprendre où se trouvent les sanctuaires.",
    moduleHint: "academy",
    phase: "academy",
  },
  unlock_dungeons: {
    id: "unlock_dungeons",
    title: "Localisez les Sanctuaires",
    description: "Terminez la recherche Localisation des Sanctuaires. Elle débloque les Donjons et leurs règles de clés via la progression canonique.",
    moduleHint: "academy",
    phase: "academy",
  },
  enter_t4_dungeon: {
    id: "enter_t4_dungeon",
    title: "Entrez dans votre premier Donjon T4",
    description: "Ouvrez la vue Donjons et lancez un Donjon T4 lorsque les règles de clés existantes vous donnent accès. Le guide ne contourne aucun prérequis.",
    moduleHint: "dungeons",
    phase: "dungeon",
  },
  clear_t4_dungeon: {
    id: "clear_t4_dungeon",
    title: "Terminez votre premier Donjon T4",
    description: "Allez au bout du Donjon. Sa complétion est suivie par la progression canonique des Donjons.",
    moduleHint: "dungeons",
    phase: "dungeon",
  },
  introduce_artifacts: {
    id: "introduce_artifacts",
    title: "Comprenez les Artifacts",
    description: "Les Donjons alimentent une progression d’Artifacts et de fragments. Ces composants servent à accéder à une branche spéciale d’équipement.",
    moduleHint: "dungeons",
    phase: "explanation",
  },
  introduce_artifact_weapons: {
    id: "introduce_artifact_weapons",
    title: "Découvrez les armes d’Artifact",
    description: "Les armes d’Artifact sont une branche de fabrication spéciale utilisant ces composants. Consultez-les dans la fabrication : vous n’avez pas besoin d’en fabriquer une pour terminer vos premiers pas.",
    moduleHint: "crafting",
    phase: "explanation",
  },
};
