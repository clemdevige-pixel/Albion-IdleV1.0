import type Phaser from "phaser";
import type { GameBridge, GatheringVM } from "../../GameBridge";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";
import { EnvironmentSystem } from "../systems/EnvironmentSystem";
import { WorldStatusSystem } from "../systems/WorldStatusSystem";

/** Coordinates the environment and world-status presentation. */
export class WorldPresentationController {
  private readonly environmentSystem: EnvironmentSystem;
  private readonly statusSystem: WorldStatusSystem;

  public constructor(
    private readonly scene: Phaser.Scene,
    bridge: GameBridge | undefined,
  ) {
    const { width, height } = scene.scale;
    this.environmentSystem = new EnvironmentSystem(scene);
    const initialEnvironment = renderManifestRegistry.requireEnvironment(
      bridge?.world.environmentVisualManifestId
        ?? renderManifestRegistry.requireDefaultEnvironment().id,
    );
    this.environmentSystem.create(initialEnvironment, width, height);
    this.statusSystem = new WorldStatusSystem(
      scene,
      width,
      renderManifestRegistry.requireDefaultWorldStatus(),
    );
  }

  public update(bridge: GameBridge, gathering: GatheringVM | undefined): void {
    if (gathering !== undefined) {
      this.statusSystem.presentGathering(gathering);
      return;
    }

    const world = bridge.world;
    this.statusSystem.presentCombat({
      combatState: bridge.combatState,
      biomeName: world.biomeName,
      zoneName: world.zoneName,
      encounterType: world.encounterType,
      segmentIndex: world.segmentIndex,
      segmentCount: world.segmentCount,
      zoneProgress: world.zoneProgress,
    });
    this.environmentSystem.setEnvironment(
      renderManifestRegistry.requireEnvironment(
        world.environmentVisualManifestId,
      ),
      world.biomeTheme,
      this.scene.scale.width,
      this.scene.scale.height,
    );
  }

  public clear(): void {
    this.environmentSystem.clear();
    this.statusSystem.clear();
  }
}
