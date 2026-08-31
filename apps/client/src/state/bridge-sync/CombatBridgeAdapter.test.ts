import { describe, expect, it, vi } from "vitest";
import { GameBridge } from "../../game/GameBridge";
import { CombatBridgeAdapter } from "./CombatBridgeAdapter";

describe("CombatBridgeAdapter", () => {
  it("presents authoritative hero health during initial combat bootstrap", () => {
    const bridge = new GameBridge();
    const adapter = new CombatBridgeAdapter({
      bridge,
      heroId: 1 as never,
      abilityManager: {} as never,
      damageManager: {} as never,
      statsManager: {} as never,
      combatRuntime: {
        isAutoCastEnabled: () => true,
        getActiveEnemyId: () => 2 as never,
      } as never,
      worldRuntime: {} as never,
      updateWorldBridge: vi.fn(),
    });

    expect(bridge.playerHealth).toBe(100);
    expect(bridge.playerMaxHealth).toBe(100);

    adapter.presentInitialCombat({
      combatState: "combat",
      playerHealth: { currentHealth: 237, maxHealth: 412 },
    });

    expect(bridge.playerHealth).toBe(237);
    expect(bridge.playerMaxHealth).toBe(412);
  });

  it("changes presentation encounter identity when a new enemy entity spawns", () => {
    const bridge = new GameBridge();
    let activeEnemyId = 11;
    const adapter = new CombatBridgeAdapter({
      bridge,
      heroId: 1 as never,
      abilityManager: {
        getAbilities: () => [],
      } as never,
      damageManager: {
        getHealth: () => ({ currentHealth: 100, maxHealth: 100 }),
      } as never,
      statsManager: {} as never,
      combatRuntime: {
        isAutoCastEnabled: () => true,
        getLoopState: () => "combat",
        getActiveEnemyId: () => activeEnemyId as never,
      } as never,
      worldRuntime: {
        getActiveZoneDef: () => ({ defId: "zone_test" }),
        currentSegment: 0,
      } as never,
      updateWorldBridge: vi.fn(),
    });

    adapter.presentInitialCombat({
      combatState: "combat",
      activeEnemy: {
        id: 11 as never,
        currentHealth: 100,
        maxHealth: 100,
        name: "Same monster",
        visualManifestId: "same_manifest",
      },
    });
    expect(bridge.enemyEncounterKey).toBe("enemy:11");

    activeEnemyId = 12;
    adapter.presentTick({
      combatState: "combat",
      spawnedEnemy: {
        id: 12 as never,
        name: "Same monster",
        visualManifestId: "same_manifest",
      } as never,
    });

    expect(bridge.enemyEncounterKey).toBe("enemy:12");
    expect(bridge.enemyHealth).toBe(100);
    expect(bridge.enemyMaxHealth).toBe(100);
  });
});
