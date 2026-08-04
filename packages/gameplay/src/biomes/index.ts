export type {
  BiomeId,
  BiomeDefinition,
  DecorationDensity,
} from "./biome-types.js";
export { asBiomeId } from "./biome-types.js";

export type {
  BiomeEventMap,
  BiomeRegisteredEvent,
  BiomeResolvedEvent,
  BiomeChangedEvent,
  BiomeAssociatedEvent,
  BiomeDissociatedEvent,
} from "./biome-events.js";

export { BiomeRegistry } from "./biome-registry.js";
export { BiomeResolver } from "./biome-resolver.js";
export { getBiomeDifficultyModifier } from "./biome-modifiers.js";
