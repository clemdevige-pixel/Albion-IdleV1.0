import type { RecipeDefinition } from "./recipe-types.js";

export interface RecipeRegisteredEvent {
  readonly recipe: RecipeDefinition;
}

export interface RecipeResolvedEvent {
  readonly recipe: RecipeDefinition;
}

export interface RecipeEventMap {
  readonly "recipe:registered": RecipeRegisteredEvent;
  readonly "recipe:resolved": RecipeResolvedEvent;
}
