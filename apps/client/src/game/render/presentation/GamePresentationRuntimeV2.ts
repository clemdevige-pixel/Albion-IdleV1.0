import type Phaser from "phaser";
import type { GameBridge } from "../../GameBridge";
import { selectActiveGathering } from "./GamePresentationState";
import { ActivityPresentationController } from "./ActivityPresentationController";
import { CombatPresentationController } from "./CombatPresentationController";
import {
  invalidateCombatPresentation,
  resetCombatPresentationSession,
} from "./CombatPresentationInvalidation";
import {
  clearPresentedEnemyHealth,
  resetPresentedEnemyHealth,
} from "./CombatPresentedHealth";
import { resolveCombatPresentationTransition } from "./CombatPresentationTransition";
import { WorldPresentationController } from "./WorldPresentationController";
import { WorldTravelPresentationController } from "./WorldTravelPresentationController";

/** Thin coordinator for the specialized presentation controllers. */
export class GamePresentationRuntime {
  private combat: CombatPresentationController | undefined;
  private activity: ActivityPresentationController | undefined;
  private world: WorldPresentationController | undefined;
  private travel: WorldTravelPresentationController | undefined;
  private lastEncounterPresentationKey: string | undefined;
  private lastCombatState: GameBridge["combatState"] | undefined;
  private lastWorldZoneIndex: number | undefined;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly getBridge: () => GameBridge | undefined,
  ) {}

  public create(): void {
    const bridge = this.getBridge();
    resetCombatPresentationSession(bridge?.damageNumbers.at(-1)?.id ?? 0);
    const world = new WorldPresentationController(this.scene, bridge);
    const combat = new CombatPresentationController(this.scene, this.getBridge);
    this.world = world;
    this.combat = combat;
    this.activity = new ActivityPresentationController(this.scene, combat);
    this.travel = new WorldTravelPresentationController(this.scene, combat, world);
    this.lastWorldZoneIndex = bridge?.world.zoneIndex;
  }

  public update(): void {
    const bridge = this.getBridge();
    if (bridge === undefined) return;

    const encounterPresentationKey = bridge.enemyEncounterKey;
    const transition = resolveCombatPresentationTransition({
      previousCombatState: this.lastCombatState,
      nextCombatState: bridge.combatState,
      previousEncounterKey: this.lastEncounterPresentationKey,
      nextEncounterKey: encounterPresentationKey,
    });

    if (transition === "initialize") {
      if (this.hasAuthoritativeEnemySnapshot(bridge)) {
        resetPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
      } else {
        clearPresentedEnemyHealth();
      }
      this.lastEncounterPresentationKey = encounterPresentationKey;
    } else if (transition === "hard_reset") {
      // Defeat/resume, pause/resume and explicit travel are hard encounter
      // boundaries. Clear the old encounter immediately, but never seed the
      // next health bar from stale bridge values while no new combat snapshot
      // has been published yet.
      const latestDamageEventId = bridge.damageNumbers.at(-1)?.id ?? 0;
      invalidateCombatPresentation(latestDamageEventId);
      this.combat?.invalidateEncounterPresentation();
      if (bridge.combatState === "combat" && this.hasAuthoritativeEnemySnapshot(bridge)) {
        resetPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
      }
      this.lastEncounterPresentationKey = encounterPresentationKey;
    } else if (transition === "victory_handoff") {
      // Victory progression is presentation-asynchronous. The new enemy snapshot
      // is already atomic, but the controller intentionally keeps presenting the
      // defeated enemy until its killing impact has finished.
      this.lastEncounterPresentationKey = encounterPresentationKey;
    }

    const gathering = selectActiveGathering(bridge);
    this.combat?.update(bridge);
    this.activity?.update(gathering);

    const zoneIndex = bridge.world.zoneIndex;
    if (
      this.lastWorldZoneIndex !== undefined
      && zoneIndex !== this.lastWorldZoneIndex
      && gathering === undefined
    ) {
      this.travel?.start();
    }
    this.lastWorldZoneIndex = zoneIndex;

    this.world?.update(bridge, gathering);
    this.lastCombatState = bridge.combatState;
  }

  public clear(): void {
    this.travel?.clear();
    this.activity?.clear();
    this.combat?.clear();
    this.world?.clear();
    clearPresentedEnemyHealth();
    this.travel = undefined;
    this.activity = undefined;
    this.combat = undefined;
    this.world = undefined;
    this.lastEncounterPresentationKey = undefined;
    this.lastCombatState = undefined;
    this.lastWorldZoneIndex = undefined;
  }

  private hasAuthoritativeEnemySnapshot(bridge: GameBridge): boolean {
    return bridge.enemyEncounterKey.length > 0
      && bridge.enemyName.length > 0
      && bridge.enemyVisualManifestId.length > 0
      && bridge.enemyMaxHealth > 0;
  }
}
