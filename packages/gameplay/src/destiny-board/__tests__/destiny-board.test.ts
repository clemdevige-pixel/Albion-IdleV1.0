import { describe, expect, it } from "vitest";
import { EventBus } from "@game/core";
import { ExperienceTable } from "../../experience/experience-table.js";
import { ExperienceService } from "../../experience/experience-service.js";
import { asMasteryId } from "../../experience/types.js";
import { DestinyBoardService } from "../destiny-board-service.js";
import { DestinyBoardSaveProvider } from "../destiny-board-save-provider.js";
import { asDestinyNodeId } from "../types.js";
import type { DestinyBoardEventMap } from "../destiny-board-events.js";
import type { DestinyNodeDefinition } from "../types.js";

const SWORD = asMasteryId("mastery_sword");
const BOW = asMasteryId("mastery_bow");

const NODE_T3 = asDestinyNodeId("sword_t3");
const NODE_T4 = asDestinyNodeId("sword_t4");
const NODE_T5 = asDestinyNodeId("sword_t5");
const NODE_BOW_T3 = asDestinyNodeId("bow_t3");
const NODE_UNKNOWN = asDestinyNodeId("unknown_node");

/** Simple table: level 0->1 costs 100, 1->2 costs 200, ... */
function makeTable(): ExperienceTable {
  return new ExperienceTable([100, 200, 300, 400, 500]);
}

function makeExpService(): ExperienceService {
  const exp = new ExperienceService();
  exp.registerMastery(SWORD, makeTable(), 5);
  exp.registerMastery(BOW, makeTable(), 5);
  return exp;
}

function makeNode(overrides: Partial<DestinyNodeDefinition> & { id: DestinyNodeDefinition["id"] }): DestinyNodeDefinition {
  return {
    displayName: String(overrides.id),
    category: "weapons",
    prerequisites: [],
    requirements: [],
    rewards: [],
    ...overrides,
  };
}

// ── Registration ────────────────────────────────────────────────────
describe("DestinyBoardService.registerNode", () => {
  it("registers a node successfully", () => {
    const board = new DestinyBoardService(makeExpService());
    const result = board.registerNode(makeNode({ id: NODE_T3 }));
    expect(result).toEqual({ ok: true, value: undefined });
    expect(board.getNodeState(NODE_T3)).toBe("locked");
  });

  it("rejects duplicate nodes", () => {
    const board = new DestinyBoardService(makeExpService());
    board.registerNode(makeNode({ id: NODE_T3 }));
    const result = board.registerNode(makeNode({ id: NODE_T3 }));
    expect(result).toEqual({ ok: false, reason: "duplicate_node" });
  });

  it("rejects invalid definition (empty id)", () => {
    const board = new DestinyBoardService(makeExpService());
    const result = board.registerNode(makeNode({ id: asDestinyNodeId(""), displayName: "test" }));
    expect(result).toEqual({ ok: false, reason: "invalid_definition" });
  });

  it("rejects invalid definition (empty displayName)", () => {
    const board = new DestinyBoardService(makeExpService());
    const result = board.registerNode(makeNode({ id: NODE_T3, displayName: "" }));
    expect(result).toEqual({ ok: false, reason: "invalid_definition" });
  });
});

// ── Requirements checking ───────────────────────────────────────────
describe("DestinyBoardService.checkRequirements", () => {
  it("returns met=true when mastery level is sufficient", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);
    board.registerNode(makeNode({
      id: NODE_T3,
      requirements: [{ type: "mastery_level", masteryId: SWORD, level: 1 }],
    }));

    // Level up sword to 1
    exp.addExperience(SWORD, 100, "combat");

    const result = board.checkRequirements(NODE_T3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.met).toBe(true);
    expect(result.value.details).toHaveLength(1);
    expect(result.value.details[0]!.satisfied).toBe(true);
  });

  it("returns met=false when mastery level is insufficient", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);
    board.registerNode(makeNode({
      id: NODE_T4,
      requirements: [{ type: "mastery_level", masteryId: SWORD, level: 3 }],
    }));

    const result = board.checkRequirements(NODE_T4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.met).toBe(false);
    expect(result.value.details[0]!.satisfied).toBe(false);
  });

  it("returns failure for unknown node", () => {
    const board = new DestinyBoardService(makeExpService());
    const result = board.checkRequirements(NODE_UNKNOWN);
    expect(result).toEqual({ ok: false, reason: "node_not_found" });
  });
});

// ── Unlocking ───────────────────────────────────────────────────────
describe("DestinyBoardService.tryUnlock", () => {
  it("unlocks a node with no prerequisites and met requirements", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);
    board.registerNode(makeNode({
      id: NODE_T3,
      requirements: [{ type: "mastery_level", masteryId: SWORD, level: 1 }],
      rewards: [{ type: "equipment_tier_unlock", tier: 3 }],
    }));

    exp.addExperience(SWORD, 100, "combat");

    const result = board.tryUnlock(NODE_T3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nodeId).toBe(NODE_T3);
    expect(result.value.rewards).toEqual([{ type: "equipment_tier_unlock", tier: 3 }]);
    expect(board.getNodeState(NODE_T3)).toBe("unlocked");
  });

  it("rejects unlock when prerequisites not met", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);
    board.registerNode(makeNode({ id: NODE_T3 }));
    board.registerNode(makeNode({
      id: NODE_T4,
      prerequisites: [NODE_T3],
    }));

    const result = board.tryUnlock(NODE_T4);
    expect(result).toEqual({ ok: false, reason: "prerequisites_not_met" });
  });

  it("rejects unlock when mastery level requirement not met", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);
    board.registerNode(makeNode({
      id: NODE_T4,
      requirements: [{ type: "mastery_level", masteryId: SWORD, level: 3 }],
    }));

    // Sword is at level 0
    const result = board.tryUnlock(NODE_T4);
    expect(result).toEqual({ ok: false, reason: "requirements_not_met" });
  });

  it("rejects already-unlocked node", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);
    board.registerNode(makeNode({ id: NODE_T3 }));

    board.tryUnlock(NODE_T3);
    const result = board.tryUnlock(NODE_T3);
    expect(result).toEqual({ ok: false, reason: "node_already_unlocked" });
  });

  it("rejects unknown node", () => {
    const board = new DestinyBoardService(makeExpService());
    const result = board.tryUnlock(NODE_UNKNOWN);
    expect(result).toEqual({ ok: false, reason: "node_not_found" });
  });

  it("handles multiple prerequisite chain", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);

    board.registerNode(makeNode({ id: NODE_T3 }));
    board.registerNode(makeNode({ id: NODE_T4, prerequisites: [NODE_T3] }));
    board.registerNode(makeNode({ id: NODE_T5, prerequisites: [NODE_T3, NODE_T4] }));

    // Cannot unlock T5 without T3 and T4
    expect(board.tryUnlock(NODE_T5)).toEqual({ ok: false, reason: "prerequisites_not_met" });

    // Unlock T3, still can't unlock T5
    board.tryUnlock(NODE_T3);
    expect(board.tryUnlock(NODE_T5)).toEqual({ ok: false, reason: "prerequisites_not_met" });

    // Unlock T4, now can unlock T5
    board.tryUnlock(NODE_T4);
    const result = board.tryUnlock(NODE_T5);
    expect(result.ok).toBe(true);
  });
});

// ── Eligible nodes ──────────────────────────────────────────────────
describe("DestinyBoardService.getEligibleNodes", () => {
  it("returns nodes whose prerequisites and requirements are all met", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);

    board.registerNode(makeNode({ id: NODE_T3 }));
    board.registerNode(makeNode({
      id: NODE_T4,
      prerequisites: [NODE_T3],
      requirements: [{ type: "mastery_level", masteryId: SWORD, level: 1 }],
    }));
    board.registerNode(makeNode({ id: NODE_BOW_T3 }));

    // T3 and BOW_T3 have no prereqs/reqs, so they are eligible
    const eligible1 = board.getEligibleNodes();
    expect(eligible1).toContain(NODE_T3);
    expect(eligible1).toContain(NODE_BOW_T3);
    expect(eligible1).not.toContain(NODE_T4);

    // Unlock T3 and level sword
    board.tryUnlock(NODE_T3);
    exp.addExperience(SWORD, 100, "combat");

    const eligible2 = board.getEligibleNodes();
    expect(eligible2).not.toContain(NODE_T3); // already unlocked
    expect(eligible2).toContain(NODE_T4); // prereqs + reqs met
  });

  it("returns empty when nothing is eligible", () => {
    const board = new DestinyBoardService(makeExpService());
    board.registerNode(makeNode({
      id: NODE_T4,
      requirements: [{ type: "mastery_level", masteryId: SWORD, level: 99 }],
    }));
    expect(board.getEligibleNodes()).toEqual([]);
  });
});

// ── Events ──────────────────────────────────────────────────────────
describe("DestinyBoardService events", () => {
  it("emits NodeUnlocked on successful unlock", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);
    const bus = new EventBus<DestinyBoardEventMap>();
    board.setEventBus(bus);

    const events: unknown[] = [];
    bus.subscribe("NodeUnlocked", (e) => events.push(e));

    board.registerNode(makeNode({
      id: NODE_T3,
      rewards: [{ type: "equipment_tier_unlock", tier: 3 }],
    }));
    board.tryUnlock(NODE_T3);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      nodeId: NODE_T3,
      rewards: [{ type: "equipment_tier_unlock", tier: 3 }],
    });
  });

  it("emits NodeEligible when a new node becomes eligible after unlock", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);
    const bus = new EventBus<DestinyBoardEventMap>();
    board.setEventBus(bus);

    const eligibleEvents: unknown[] = [];
    bus.subscribe("NodeEligible", (e) => eligibleEvents.push(e));

    board.registerNode(makeNode({ id: NODE_T3 }));
    board.registerNode(makeNode({ id: NODE_T4, prerequisites: [NODE_T3] }));

    board.tryUnlock(NODE_T3);

    // T4 should now be eligible
    expect(eligibleEvents).toContainEqual({ nodeId: NODE_T4 });
  });
});

// ── Save / Restore ──────────────────────────────────────────────────
describe("DestinyBoardSaveProvider", () => {
  it("round-trips unlocked nodes", () => {
    const exp = makeExpService();
    const board = new DestinyBoardService(exp);
    board.registerNode(makeNode({ id: NODE_T3 }));
    board.registerNode(makeNode({ id: NODE_BOW_T3 }));
    board.tryUnlock(NODE_T3);

    const provider = new DestinyBoardSaveProvider(board);
    const saved = provider.save();

    // Create a fresh board with same definitions
    const board2 = new DestinyBoardService(exp);
    board2.registerNode(makeNode({ id: NODE_T3 }));
    board2.registerNode(makeNode({ id: NODE_BOW_T3 }));

    const provider2 = new DestinyBoardSaveProvider(board2);
    provider2.load(saved);

    expect(board2.getNodeState(NODE_T3)).toBe("unlocked");
    expect(board2.getNodeState(NODE_BOW_T3)).toBe("locked");
    expect(board2.getUnlockedNodes()).toEqual([NODE_T3]);
  });

  it("has correct providerId", () => {
    const provider = new DestinyBoardSaveProvider(
      new DestinyBoardService(makeExpService()),
    );
    expect(provider.providerId).toBe("destiny-board");
  });
});

// ── getAllNodes ──────────────────────────────────────────────────────
describe("DestinyBoardService.getAllNodes", () => {
  it("returns all registered nodes with their states", () => {
    const board = new DestinyBoardService(makeExpService());
    board.registerNode(makeNode({ id: NODE_T3 }));
    board.registerNode(makeNode({ id: NODE_BOW_T3 }));
    board.tryUnlock(NODE_T3);

    const all = board.getAllNodes();
    expect(all.size).toBe(2);
    expect(all.get(NODE_T3)?.state).toBe("unlocked");
    expect(all.get(NODE_BOW_T3)?.state).toBe("locked");
  });
});
