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
      combatRuntime: { isAutoCastEnabled: () => true } as never,
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
});
