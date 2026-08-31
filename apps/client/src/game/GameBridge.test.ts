import { describe, expect, it } from "vitest";
import {
  GameBridge,
  TECHNICAL_ENEMY_RENDER_FALLBACK_MANIFEST_ID,
} from "./GameBridge";

describe("GameBridge enemy presentation snapshot", () => {
  it("publishes encounter identity and enemy health as one snapshot", () => {
    const bridge = new GameBridge();

    bridge.setEnemySnapshot({
      encounterKey: "zone_forest:2:3",
      name: "Forest Keeper",
      visualManifestId: "monster_keeper_warrior",
      currentHealth: 175,
      maxHealth: 250,
    });

    expect(bridge.enemyEncounterKey).toBe("zone_forest:2:3");
    expect(bridge.enemyName).toBe("Forest Keeper");
    expect(bridge.enemyVisualManifestId).toBe("monster_keeper_warrior");
    expect(bridge.enemyHealth).toBe(175);
    expect(bridge.enemyMaxHealth).toBe(250);
  });

  it("keeps enemy identity stable when the world view advances independently", () => {
    const bridge = new GameBridge();
    bridge.setEnemySnapshot({
      encounterKey: "zone_forest:1:5",
      name: "Old Enemy",
      visualManifestId: "monster_keeper_warrior",
      currentHealth: 0,
      maxHealth: 100,
    });

    bridge.updateWorld({
      ...bridge.world,
      segmentIndex: 2,
      encounterIndex: 1,
    });

    expect(bridge.enemyEncounterKey).toBe("zone_forest:1:5");
    expect(bridge.enemyHealth).toBe(0);
    expect(bridge.enemyMaxHealth).toBe(100);
  });

  it("clears encounter identity together with the enemy presentation", () => {
    const bridge = new GameBridge();
    bridge.setEnemySnapshot({
      encounterKey: "zone_forest:1:1",
      name: "Enemy",
      visualManifestId: "monster_keeper_warrior",
      currentHealth: 100,
      maxHealth: 100,
    });

    bridge.clearEnemyPresentation();

    expect(bridge.enemyEncounterKey).toBe("");
    expect(bridge.enemyName).toBe("");
    expect(bridge.enemyHealth).toBe(0);
    expect(bridge.enemyMaxHealth).toBe(0);
  });

  it("never promotes the technical fallback to an authoritative enemy", () => {
    const bridge = new GameBridge();

    bridge.setEnemySnapshot({
      encounterKey: "encounter:transition",
      name: "Transient enemy",
      visualManifestId: TECHNICAL_ENEMY_RENDER_FALLBACK_MANIFEST_ID,
      currentHealth: 100,
      maxHealth: 100,
    });

    expect(bridge.enemyEncounterKey).toBe("");
    expect(bridge.enemyName).toBe("");
    expect(bridge.enemyHealth).toBe(0);
    expect(bridge.enemyMaxHealth).toBe(0);
    expect(bridge.enemyVisualManifestId).toBe(TECHNICAL_ENEMY_RENDER_FALLBACK_MANIFEST_ID);
  });

  it("rejects the technical fallback through the legacy split presentation path", () => {
    const bridge = new GameBridge();

    bridge.updateEnemyHealth(100, 100);
    bridge.setEnemyPresentation("Transient enemy", TECHNICAL_ENEMY_RENDER_FALLBACK_MANIFEST_ID);

    expect(bridge.enemyEncounterKey).toBe("");
    expect(bridge.enemyName).toBe("");
    expect(bridge.enemyHealth).toBe(0);
    expect(bridge.enemyMaxHealth).toBe(0);
  });
});
