import type Phaser from "phaser";
import type { GameBridge, GatheringVM } from "../../GameBridge";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";
import { EnvironmentSystem } from "../systems/EnvironmentSystem";
import { WorldStatusSystem } from "../systems/WorldStatusSystem";

interface PendingEnvironmentPresentation {
  readonly manifestId: string;
  readonly biomeTheme: string;
  readonly width: number;
  readonly height: number;
}

/** Coordinates the environment and world-status presentation. */
export class WorldPresentationController {
  private readonly environmentSystem: EnvironmentSystem;
  private readonly statusSystem: WorldStatusSystem;
  private holdEnvironment = false;
  private pendingEnvironment: PendingEnvironmentPresentation | undefined;

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
    const world = bridge.world;
    const environment = {
      manifestId: world.environmentVisualManifestId,
      biomeTheme: world.biomeTheme,
      width: this.scene.scale.width,
      height: this.scene.scale.height,
    } satisfies PendingEnvironmentPresentation;

    if (this.holdEnvironment) {
      this.pendingEnvironment = environment;
    } else {
      this.applyEnvironment(environment);
    }

    if (gathering !== undefined) {
      this.statusSystem.presentGathering(gathering);
      return;
    }

    this.statusSystem.presentCombat({
      combatState: bridge.combatState,
      biomeName: world.biomeName,
      zoneName: world.zoneName,
      encounterType: world.encounterType,
      segmentIndex: world.segmentIndex,
      segmentCount: world.segmentCount,
      zoneProgress: world.zoneProgress,
    });
  }

  public beginEnvironmentHold(): void {
    this.holdEnvironment = true;
    this.pendingEnvironment = undefined;
  }

  public commitHeldEnvironment(): void {
    if (this.pendingEnvironment === undefined) return;
    this.applyEnvironment(this.pendingEnvironment);
    this.pendingEnvironment = undefined;
  }

  public endEnvironmentHold(): void {
    this.commitHeldEnvironment();
    this.holdEnvironment = false;
  }

  public clear(): void {
    this.pendingEnvironment = undefined;
    this.holdEnvironment = false;
    this.environmentSystem.clear();
    this.statusSystem.clear();
  }

  private applyEnvironment(environment: PendingEnvironmentPresentation): void {
    this.environmentSystem.setEnvironment(
      renderManifestRegistry.requireEnvironment(environment.manifestId),
      environment.biomeTheme,
      environment.width,
      environment.height,
    );
  }
}
