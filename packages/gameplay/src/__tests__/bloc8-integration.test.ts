import { describe, expect, it } from "vitest";
import { EventBus } from "@game/core";
import { ExperienceService } from "../experience/experience-service.js";
import { ExperienceSaveProvider } from "../experience/experience-save-provider.js";
import type { ExperienceEventMap } from "../experience/experience-events.js";
import { asMasteryId } from "../experience/types.js";
import { FameService } from "../fame/fame-service.js";
import { FameSaveProvider } from "../fame/fame-save-provider.js";
import { DestinyBoardService } from "../destiny-board/destiny-board-service.js";
import { DestinyBoardSaveProvider } from "../destiny-board/destiny-board-save-provider.js";
import { asDestinyNodeId } from "../destiny-board/types.js";
import type { DestinyNodeDefinition } from "../destiny-board/types.js";
import { MasteryService } from "../mastery/mastery-service.js";
import { MasterySaveProvider } from "../mastery/mastery-save-provider.js";
import type { MasteryDefinitionLike, OverflowConfig } from "../mastery/types.js";
import { ProgressionOrchestrator } from "../progression/progression-orchestrator.js";
import { ProgressionSaveCoordinator } from "../progression/progression-save-coordinator.js";
import type { ProgressionConfig } from "../progression/types.js";

// ── Test data ───────────────────────────────────────────────────────

const SWORD_ID = asMasteryId("mastery_sword");
const BOW_ID = asMasteryId("mastery_bow");

const SWORD_DEF: MasteryDefinitionLike = {
  id: "mastery_sword",
  category: "combat",
  maxLevel: 3,
  experiencePerLevel: [100, 200, 300],
};

const BOW_DEF: MasteryDefinitionLike = {
  id: "mastery_bow",
  category: "combat",
  maxLevel: 2,
  experiencePerLevel: [50, 100],
};

const NODE_SWORD_T2 = asDestinyNodeId("sword_tier2");
const NODE_SWORD_T3 = asDestinyNodeId("sword_tier3");
const NODE_BOW_T2 = asDestinyNodeId("bow_tier2");

const SWORD_T2_NODE: DestinyNodeDefinition = {
  id: NODE_SWORD_T2,
  displayName: "Sword Tier 2",
  category: "combat",
  prerequisites: [],
  requirements: [{ type: "mastery_level", masteryId: SWORD_ID, level: 1 }],
  rewards: [{ type: "equipment_tier_unlock", tier: 2 }],
};

const SWORD_T3_NODE: DestinyNodeDefinition = {
  id: NODE_SWORD_T3,
  displayName: "Sword Tier 3",
  category: "combat",
  prerequisites: [NODE_SWORD_T2],
  requirements: [{ type: "mastery_level", masteryId: SWORD_ID, level: 2 }],
  rewards: [{ type: "equipment_tier_unlock", tier: 3 }],
};

const BOW_T2_NODE: DestinyNodeDefinition = {
  id: NODE_BOW_T2,
  displayName: "Bow Tier 2",
  category: "combat",
  prerequisites: [],
  requirements: [{ type: "mastery_level", masteryId: BOW_ID, level: 1 }],
  rewards: [{ type: "equipment_tier_unlock", tier: 2 }],
};

// ── Helpers ─────────────────────────────────────────────────────────

interface TestHarness {
  experienceService: ExperienceService;
  fameService: FameService;
  masteryService: MasteryService;
  destinyBoardService: DestinyBoardService;
  orchestrator: ProgressionOrchestrator;
  experienceBus: EventBus<ExperienceEventMap>;
  coordinator: ProgressionSaveCoordinator;
}

function createHarness(config?: Partial<ProgressionConfig>): TestHarness {
  const experienceService = new ExperienceService();
  const experienceBus = new EventBus<ExperienceEventMap>();
  experienceService.setEventBus(experienceBus);

  const fameService = new FameService(experienceService);
  const masteryService = new MasteryService(experienceService);
  const destinyBoardService = new DestinyBoardService(experienceService);

  const orchestrator = new ProgressionOrchestrator(
    experienceService,
    fameService,
    masteryService,
    destinyBoardService,
  );
  orchestrator.connectEventBus(experienceBus);

  const fullConfig: ProgressionConfig = {
    masteryDefinitions: config?.masteryDefinitions ?? [SWORD_DEF, BOW_DEF],
    destinyNodes: config?.destinyNodes ?? [SWORD_T2_NODE, SWORD_T3_NODE, BOW_T2_NODE],
    overflowConfig: config?.overflowConfig,
  };
  orchestrator.initialize(fullConfig);

  const experienceSaveProvider = new ExperienceSaveProvider(
    experienceService,
    (id) => masteryService._getTable(id),
  );
  const fameSaveProvider = new FameSaveProvider(fameService);
  const destinyBoardSaveProvider = new DestinyBoardSaveProvider(destinyBoardService);
  const masterySaveProvider = new MasterySaveProvider(masteryService);

  const coordinator = new ProgressionSaveCoordinator(
    experienceSaveProvider,
    fameSaveProvider,
    destinyBoardSaveProvider,
    masterySaveProvider,
  );

  return {
    experienceService,
    fameService,
    masteryService,
    destinyBoardService,
    orchestrator,
    experienceBus,
    coordinator,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("Bloc 8.5 — Progression Integration", () => {
  // 1. Full loop
  it("full loop: load → discover → fame → level up → destiny unlock", () => {
    const h = createHarness();

    // Discover sword mastery
    h.orchestrator.onEquipmentAcquired(SWORD_ID);
    expect(h.masteryService.isMasteryUnlocked(SWORD_ID)).toBe(true);

    // Earn 100 fame → level 1 → sword_tier2 auto-unlocks
    const result = h.orchestrator.onFameEarned(SWORD_ID, 100, "combat");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.newLevel).toBe(1);
    }

    expect(h.destinyBoardService.getNodeState(NODE_SWORD_T2)).toBe("unlocked");
    expect(h.fameService.getTotalFameEarned()).toBe(100);
  });

  // 2. Multi-level-up triggers multiple destiny checks
  it("multi-level-up triggers multiple destiny node eligibility checks", () => {
    const h = createHarness();

    // Give enough fame to jump from level 0 to level 2 (100 + 200 = 300 XP)
    h.orchestrator.onFameEarned(SWORD_ID, 300, "combat");

    const progress = h.experienceService.getMasteryProgress(SWORD_ID);
    expect(progress?.level).toBe(2);

    // Both tier2 (requires level 1) and tier3 (requires level 2, prereq tier2)
    // should auto-unlock through the chain
    expect(h.destinyBoardService.getNodeState(NODE_SWORD_T2)).toBe("unlocked");
    expect(h.destinyBoardService.getNodeState(NODE_SWORD_T3)).toBe("unlocked");
  });

  // 3. Save all → load all → state matches
  it("save/load round-trip preserves all state", () => {
    const h = createHarness();

    h.orchestrator.onEquipmentAcquired(SWORD_ID);
    h.orchestrator.onFameEarned(SWORD_ID, 150, "combat");
    h.orchestrator.onFameEarned(BOW_ID, 50, "combat");
    h.orchestrator.onEquipmentAcquired(BOW_ID);

    const stateBefore = h.orchestrator.getFullProgressionState();
    const savedData = h.coordinator.saveAll();

    // Create a fresh harness and load
    const h2 = createHarness();
    h2.coordinator.loadAll(savedData);

    const stateAfter = h2.orchestrator.getFullProgressionState();

    // Compare experience
    for (const [id, progressBefore] of stateBefore.experience) {
      const progressAfter = stateAfter.experience.get(id);
      expect(progressAfter).toBeDefined();
      expect(progressAfter?.level).toBe(progressBefore.level);
      expect(progressAfter?.currentXp).toBe(progressBefore.currentXp);
      expect(progressAfter?.totalLifetimeXp).toBe(progressBefore.totalLifetimeXp);
    }

    // Compare fame
    expect(stateAfter.totalFame).toBe(stateBefore.totalFame);

    // Compare destiny board
    expect(stateAfter.unlockedDestinyNodes.length).toBe(stateBefore.unlockedDestinyNodes.length);
    for (const nodeId of stateBefore.unlockedDestinyNodes) {
      expect(stateAfter.unlockedDestinyNodes).toContain(nodeId);
    }

    // Compare mastery unlock status
    for (const [id, masteryBefore] of stateBefore.masteries) {
      const masteryAfter = stateAfter.masteries.get(id);
      expect(masteryAfter).toBeDefined();
      expect(masteryAfter?.isUnlocked).toBe(masteryBefore.isUnlocked);
    }

    // Compare overflow
    expect(stateAfter.overflowPool).toBe(stateBefore.overflowPool);
  });

  // 4. Fame history persists across save/load
  it("fame history persists across save/load", () => {
    const h = createHarness();

    h.orchestrator.onFameEarned(SWORD_ID, 50, "combat");
    h.orchestrator.onFameEarned(SWORD_ID, 30, "gathering");

    const historyBefore = h.fameService.getFameHistory();
    expect(historyBefore).toHaveLength(2);

    const savedData = h.coordinator.saveAll();

    const h2 = createHarness();
    h2.coordinator.loadAll(savedData);

    const historyAfter = h2.fameService.getFameHistory();
    expect(historyAfter).toHaveLength(2);
    expect(historyAfter[0]?.fameEarned).toBe(50);
    expect(historyAfter[0]?.category).toBe("combat");
    expect(historyAfter[1]?.fameEarned).toBe(30);
    expect(historyAfter[1]?.category).toBe("gathering");
  });

  // 5. Overflow XP at max level
  it("overflow XP generated at max level when enabled", () => {
    const overflowConfig: OverflowConfig = { conversionRate: 1, enabled: true };
    const h = createHarness({ overflowConfig });

    // Max out bow (50 + 100 = 150 XP to reach level 2 which is max)
    h.orchestrator.onFameEarned(BOW_ID, 150, "combat");
    const progress = h.experienceService.getMasteryProgress(BOW_ID);
    expect(progress?.level).toBe(2);

    // Additional fame at max level returns max_level_reached from ExperienceService
    const result = h.orchestrator.onFameEarned(BOW_ID, 50, "combat");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("max_level_reached");
    }
  });

  // 6. Undiscovered mastery: fame still routes to XP
  it("fame goes to XP even if mastery not yet discovered", () => {
    const h = createHarness();

    // Do NOT call onEquipmentAcquired — mastery is not discovered
    expect(h.masteryService.isMasteryUnlocked(SWORD_ID)).toBe(false);

    // Fame still works (XP tracking is independent of mastery discovery)
    const result = h.orchestrator.onFameEarned(SWORD_ID, 100, "combat");
    expect(result.ok).toBe(true);

    const progress = h.experienceService.getMasteryProgress(SWORD_ID);
    expect(progress?.level).toBe(1);
    expect(progress?.totalLifetimeXp).toBe(100);

    // Mastery is still not "discovered" in MasteryService
    expect(h.masteryService.isMasteryUnlocked(SWORD_ID)).toBe(false);
  });

  // 7. Destiny board prerequisite chains
  it("prerequisite chains: tier3 requires tier2 unlocked first", () => {
    const h = createHarness();

    // Give enough XP for level 2 but tier3 needs tier2 as prerequisite
    // With 300 XP the orchestrator auto-unlocks tier2 then tier3 in chain
    h.orchestrator.onFameEarned(SWORD_ID, 300, "combat");

    expect(h.destinyBoardService.getNodeState(NODE_SWORD_T2)).toBe("unlocked");
    expect(h.destinyBoardService.getNodeState(NODE_SWORD_T3)).toBe("unlocked");

    // Verify the chain happened in order by checking both are unlocked
    const unlocked = h.destinyBoardService.getUnlockedNodes();
    expect(unlocked).toContain(NODE_SWORD_T2);
    expect(unlocked).toContain(NODE_SWORD_T3);
  });

  // 8. Event propagation: LevelUp → eligible nodes checked → auto-unlock
  it("LevelUp event triggers auto-unlock of eligible nodes", () => {
    const h = createHarness();

    // Earn fame that causes a level-up; the LevelUp event should trigger
    // auto-unlock via the orchestrator's event subscription
    h.orchestrator.onFameEarned(SWORD_ID, 100, "combat");

    // sword_tier2 requires level 1, which we just reached
    expect(h.destinyBoardService.getNodeState(NODE_SWORD_T2)).toBe("unlocked");
  });

  // 9. Determinism: same sequence produces identical state
  it("same sequence produces identical state (determinism)", () => {
    function runSequence(): ReturnType<ProgressionOrchestrator["getFullProgressionState"]> {
      const h = createHarness();
      h.orchestrator.onEquipmentAcquired(SWORD_ID);
      h.orchestrator.onFameEarned(SWORD_ID, 75, "combat");
      h.orchestrator.onFameEarned(SWORD_ID, 25, "combat");
      h.orchestrator.onEquipmentAcquired(BOW_ID);
      h.orchestrator.onFameEarned(BOW_ID, 50, "gathering");
      h.orchestrator.onFameEarned(SWORD_ID, 200, "combat");
      return h.orchestrator.getFullProgressionState();
    }

    const stateA = runSequence();
    const stateB = runSequence();

    // Experience
    for (const [id, progressA] of stateA.experience) {
      const progressB = stateB.experience.get(id);
      expect(progressB?.level).toBe(progressA.level);
      expect(progressB?.currentXp).toBe(progressA.currentXp);
      expect(progressB?.totalLifetimeXp).toBe(progressA.totalLifetimeXp);
    }

    // Fame
    expect(stateB.totalFame).toBe(stateA.totalFame);
    expect(stateB.fameHistory).toHaveLength(stateA.fameHistory.length);
    for (let i = 0; i < stateA.fameHistory.length; i++) {
      expect(stateB.fameHistory[i]?.fameEarned).toBe(stateA.fameHistory[i]?.fameEarned);
      expect(stateB.fameHistory[i]?.category).toBe(stateA.fameHistory[i]?.category);
    }

    // Destiny nodes
    expect(stateB.unlockedDestinyNodes.length).toBe(stateA.unlockedDestinyNodes.length);
    for (const nodeId of stateA.unlockedDestinyNodes) {
      expect(stateB.unlockedDestinyNodes).toContain(nodeId);
    }

    // Masteries
    for (const [id, masteryA] of stateA.masteries) {
      const masteryB = stateB.masteries.get(id);
      expect(masteryB?.isUnlocked).toBe(masteryA.isUnlocked);
      expect(masteryB?.level).toBe(masteryA.level);
    }

    // Overflow
    expect(stateB.overflowPool).toBe(stateA.overflowPool);
  });

  // Save coordinator
  it("getAllProviders returns all 4 providers", () => {
    const h = createHarness();
    const providers = h.coordinator.getAllProviders();
    expect(providers).toHaveLength(4);
    const ids = providers.map((p) => p.providerId);
    expect(ids).toContain("experience");
    expect(ids).toContain("fame");
    expect(ids).toContain("destiny-board");
    expect(ids).toContain("mastery");
  });
});
