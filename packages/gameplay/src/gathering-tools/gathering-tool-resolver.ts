import type { ResourceFamily } from "../resources/resource-types.js";
import type { GatheringToolDefinition, GatheringToolType } from "./gathering-tool-types.js";
import { TOOL_FAMILY_MAP } from "./gathering-tool-types.js";

/**
 * Returns the required tool type for a given resource family.
 */
export function getRequiredToolType(family: ResourceFamily): GatheringToolType {
  return TOOL_FAMILY_MAP[family];
}

/**
 * Finds the best matching tool (highest tier) from available tools for a given
 * tool type. Returns `undefined` when no tool of the correct type is available.
 */
export function findMatchingTool(
  toolType: GatheringToolType,
  availableTools: readonly GatheringToolDefinition[],
): GatheringToolDefinition | undefined {
  let best: GatheringToolDefinition | undefined;
  for (const tool of availableTools) {
    if (tool.toolType === toolType) {
      if (best === undefined || tool.tier > best.tier) {
        best = tool;
      }
    }
  }
  return best;
}
