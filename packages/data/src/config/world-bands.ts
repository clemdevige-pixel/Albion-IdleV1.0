export const WORLD_BAND_IDS = [
  "blue",
  "yellow",
  "orange",
  "red",
  "black",
] as const;

export type WorldBandId = (typeof WORLD_BAND_IDS)[number];

export type WorldBandContentStatus = "implemented" | "planned";

export interface WorldBandDefinition {
  readonly id: WorldBandId;
  readonly label: string;
  readonly progressionOrder: number;
  readonly minimumTier: number;
  readonly maximumTier: number;
  readonly contentStatus: WorldBandContentStatus;
}

/**
 * Stable world-band metadata shared by gameplay adapters and presentation.
 * Tier ranges describe the validated direction only; they do not unlock or
 * create equipment tiers by themselves.
 */
export const WORLD_BAND_DEFINITIONS: readonly WorldBandDefinition[] = [
  { id: "blue", label: "Bleue", progressionOrder: 0, minimumTier: 3, maximumTier: 4, contentStatus: "implemented" },
  { id: "yellow", label: "Jaune", progressionOrder: 1, minimumTier: 5, maximumTier: 5, contentStatus: "implemented" },
  { id: "orange", label: "Orange", progressionOrder: 2, minimumTier: 6, maximumTier: 6, contentStatus: "implemented" },
  { id: "red", label: "Rouge", progressionOrder: 3, minimumTier: 7, maximumTier: 7, contentStatus: "implemented" },
  { id: "black", label: "Noire", progressionOrder: 4, minimumTier: 8, maximumTier: 8, contentStatus: "planned" },
] as const;

export function getWorldBandDefinition(bandId: WorldBandId): WorldBandDefinition {
  const definition = WORLD_BAND_DEFINITIONS.find(({ id }) => id === bandId);
  if (definition === undefined) throw new Error(`Unknown world band: ${bandId}`);
  return definition;
}
