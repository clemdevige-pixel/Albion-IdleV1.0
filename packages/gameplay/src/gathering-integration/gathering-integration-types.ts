import type { ResourceFamily } from "../resources/resource-types.js";
import type { ResourceNodeId } from "../resource-nodes/resource-node-types.js";
import type { GatheringToolId } from "../gathering-tools/gathering-tool-types.js";

export interface GatheringCycleResult {
  readonly nodeId: ResourceNodeId;
  readonly resourceFamily: ResourceFamily;
  readonly resourceTier: number;
  readonly quantityGathered: number;
  readonly toolUsed: GatheringToolId;
  readonly nodeExhausted: boolean;
}
