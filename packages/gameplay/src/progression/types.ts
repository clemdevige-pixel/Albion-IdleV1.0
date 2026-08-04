import type { MasteryDefinitionLike, OverflowConfig } from "../mastery/types.js";
import type { DestinyNodeDefinition } from "../destiny-board/types.js";

/** Configuration for the full progression system. */
export interface ProgressionConfig {
  readonly masteryDefinitions: readonly MasteryDefinitionLike[];
  readonly destinyNodes: readonly DestinyNodeDefinition[];
  readonly overflowConfig?: OverflowConfig | undefined;
}
