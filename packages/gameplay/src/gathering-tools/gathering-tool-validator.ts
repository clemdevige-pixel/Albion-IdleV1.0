import type { ResourceFamily } from "../resources/resource-types.js";
import type { GatheringToolDefinition } from "./gathering-tool-types.js";
import { TOOL_FAMILY_MAP } from "./gathering-tool-types.js";

export type GatheringToolValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

/**
 * Validates whether a tool is suitable for gathering a resource of the given
 * family at the required tier.
 */
export function validateTool(
  tool: GatheringToolDefinition | undefined,
  resourceFamily: ResourceFamily,
  requiredTier: number,
): GatheringToolValidationResult {
  if (tool === undefined) {
    return { valid: false, reason: "No tool provided" };
  }

  const expectedType = TOOL_FAMILY_MAP[resourceFamily];
  if (tool.toolType !== expectedType) {
    return {
      valid: false,
      reason: `Wrong tool type: expected "${expectedType}" for ${resourceFamily}, got "${tool.toolType}"`,
    };
  }

  if (tool.tier < requiredTier) {
    return {
      valid: false,
      reason: `Tool tier ${tool.tier} is below required tier ${requiredTier}`,
    };
  }

  return { valid: true };
}
