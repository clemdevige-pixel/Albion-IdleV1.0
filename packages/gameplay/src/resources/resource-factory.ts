import type { ResourceDefinitionId, ResourceId, ResourceInstance } from "./resource-types.js";
import { asResourceId } from "./resource-types.js";
import type { ResourceRegistry } from "./resource-registry.js";

let counter = 0;

/** Reset the internal counter — test-only. */
export function _resetResourceCounter(): void {
  counter = 0;
}

/**
 * Creates a new {@link ResourceInstance} from a registered definition.
 *
 * The instance starts with full charges and `"available"` state.
 */
export function createResource(
  registry: ResourceRegistry,
  definitionId: ResourceDefinitionId,
): ResourceInstance {
  const definition = registry.get(definitionId);
  if (definition === undefined) {
    throw new Error(`Resource definition "${definitionId}" not found in registry`);
  }

  counter += 1;
  const id: ResourceId = asResourceId(`res_${definitionId}_${String(counter)}`);

  return {
    id,
    definitionId: definition.id,
    state: "available",
    currentCharges: definition.maxCharges,
    maxCharges: definition.maxCharges,
    tier: definition.tier,
    family: definition.family,
  };
}
