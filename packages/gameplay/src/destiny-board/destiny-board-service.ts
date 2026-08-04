import type { EventBus } from "@game/core";
import type { ExperienceService } from "../experience/experience-service.js";
import type { DestinyBoardEventMap } from "./destiny-board-events.js";
import {
  type DestinyBoardResult,
  type DestinyNodeDefinition,
  type DestinyNodeId,
  type DestinyNodeState,
  type DestinyRequirement,
  type DestinyReward,
  destinyOk,
  destinyFail,
} from "./types.js";

interface NodeEntry {
  definition: DestinyNodeDefinition;
  state: DestinyNodeState;
}

/**
 * Manages the Destiny Board — the progression tree that tracks
 * what the player has unlocked (27_PROGRESSION_SYSTEM, 29_MASTERY_SYSTEM).
 *
 * Nodes represent mastery milestones. Unlocking is permanent.
 * The board is data-driven: node definitions are registered at runtime.
 */
export class DestinyBoardService {
  private readonly nodes = new Map<DestinyNodeId, NodeEntry>();
  private readonly unlocked = new Set<DestinyNodeId>();
  private eventBus: EventBus<DestinyBoardEventMap> | undefined;

  constructor(private readonly experienceService: ExperienceService) {}

  /** Optionally wire an event bus for UI notifications. */
  setEventBus(bus: EventBus<DestinyBoardEventMap>): void {
    this.eventBus = bus;
  }

  /** Register a node definition. Rejects duplicates and invalid definitions. */
  registerNode(definition: DestinyNodeDefinition): DestinyBoardResult<void> {
    if (definition.id === "" || definition.displayName === "") {
      return destinyFail("invalid_definition");
    }
    if (this.nodes.has(definition.id)) {
      return destinyFail("duplicate_node");
    }
    this.nodes.set(definition.id, { definition, state: "locked" });
    return destinyOk(undefined);
  }

  /** Get the current state of a node, or undefined if not registered. */
  getNodeState(nodeId: DestinyNodeId): DestinyNodeState | undefined {
    return this.nodes.get(nodeId)?.state;
  }

  /** Get all unlocked node IDs. */
  getUnlockedNodes(): readonly DestinyNodeId[] {
    return [...this.unlocked];
  }

  /** Check whether a node's requirements are met. */
  checkRequirements(
    nodeId: DestinyNodeId,
  ): DestinyBoardResult<{ met: boolean; details: { requirement: DestinyRequirement; satisfied: boolean }[] }> {
    const entry = this.nodes.get(nodeId);
    if (entry === undefined) {
      return destinyFail("node_not_found");
    }

    const details: { requirement: DestinyRequirement; satisfied: boolean }[] = [];
    let allMet = true;

    for (const req of entry.definition.requirements) {
      const satisfied = this.isRequirementMet(req);
      details.push({ requirement: req, satisfied });
      if (!satisfied) {
        allMet = false;
      }
    }

    return destinyOk({ met: allMet, details });
  }

  /**
   * Attempt to unlock a node. Checks prerequisites (all must be unlocked)
   * and requirements (mastery level). Unlocks permanently if all are met.
   */
  tryUnlock(
    nodeId: DestinyNodeId,
  ): DestinyBoardResult<{ nodeId: DestinyNodeId; rewards: readonly DestinyReward[] }> {
    const entry = this.nodes.get(nodeId);
    if (entry === undefined) {
      return destinyFail("node_not_found");
    }

    if (this.unlocked.has(nodeId)) {
      return destinyFail("node_already_unlocked");
    }

    // Check prerequisites
    for (const prereq of entry.definition.prerequisites) {
      if (!this.unlocked.has(prereq)) {
        return destinyFail("prerequisites_not_met");
      }
    }

    // Check requirements
    for (const req of entry.definition.requirements) {
      if (!this.isRequirementMet(req)) {
        return destinyFail("requirements_not_met");
      }
    }

    // Unlock
    entry.state = "unlocked";
    this.unlocked.add(nodeId);

    const rewards = entry.definition.rewards;
    this.eventBus?.publish("NodeUnlocked", { nodeId, rewards });

    // Check if any new nodes became eligible
    for (const [id, other] of this.nodes) {
      if (this.unlocked.has(id)) continue;
      if (this.isNodeEligible(other)) {
        this.eventBus?.publish("NodeEligible", { nodeId: id });
      }
    }

    return destinyOk({ nodeId, rewards });
  }

  /** Get all nodes whose prerequisites AND requirements are met but not yet unlocked. */
  getEligibleNodes(): readonly DestinyNodeId[] {
    const eligible: DestinyNodeId[] = [];
    for (const [id, entry] of this.nodes) {
      if (this.unlocked.has(id)) continue;
      if (this.isNodeEligible(entry)) {
        eligible.push(id);
      }
    }
    return eligible;
  }

  /** Get all registered nodes with their definitions and states. */
  getAllNodes(): ReadonlyMap<DestinyNodeId, { definition: DestinyNodeDefinition; state: DestinyNodeState }> {
    return this.nodes;
  }

  /** @internal — used by save provider. */
  _getUnlockedSet(): ReadonlySet<DestinyNodeId> {
    return this.unlocked;
  }

  /** @internal — used by save provider to restore state. */
  _restoreUnlocked(ids: ReadonlySet<DestinyNodeId>): void {
    this.unlocked.clear();
    for (const id of ids) {
      if (this.nodes.has(id)) {
        this.unlocked.add(id);
        const entry = this.nodes.get(id);
        if (entry !== undefined) {
          entry.state = "unlocked";
        }
      }
    }
  }

  private isRequirementMet(req: DestinyRequirement): boolean {
    switch (req.type) {
      case "mastery_level": {
        const progress = this.experienceService.getMasteryProgress(req.masteryId);
        if (progress === undefined) return false;
        return progress.level >= req.level;
      }
    }
  }

  private isNodeEligible(entry: NodeEntry): boolean {
    // All prerequisites must be unlocked
    for (const prereq of entry.definition.prerequisites) {
      if (!this.unlocked.has(prereq)) return false;
    }
    // All requirements must be met
    for (const req of entry.definition.requirements) {
      if (!this.isRequirementMet(req)) return false;
    }
    return true;
  }
}
