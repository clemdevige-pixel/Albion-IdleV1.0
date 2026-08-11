import type Phaser from "phaser";

interface RegisteredActor {
  readonly body: Phaser.GameObjects.Container;
  readonly homeX: number;
  readonly homeY: number;
  motionTween: Phaser.Tweens.Tween | undefined;
  ambientTween: Phaser.Tweens.Tween | undefined;
  ambientMotionKey: string;
}

export interface ActorAmbientMotionPresentation {
  readonly distance: number;
  readonly durationMs: number;
  readonly delayMs?: number;
}

export interface ActorApproachPresentation {
  readonly body: Phaser.GameObjects.Container;
  readonly distance: number;
  readonly durationMs: number;
}

export interface ActorHitReactionPresentation {
  readonly body: Phaser.GameObjects.Container;
  readonly recoilDistance: number;
}

/**
 * Owns generic actor motion and impact reactions.
 *
 * Weapon selection and gameplay outcomes remain outside this system.
 */
export class ActorSystem {
  private readonly actors = new Map<
    Phaser.GameObjects.Container,
    RegisteredActor
  >();
  private readonly timers = new Set<Phaser.Time.TimerEvent>();

  public constructor(private readonly scene: Phaser.Scene) {}

  public register(
    body: Phaser.GameObjects.Container,
    homeX: number,
    ambientMotion?: ActorAmbientMotionPresentation,
  ): void {
    const actor: RegisteredActor = {
      body,
      homeX,
      homeY: body.y,
      motionTween: undefined,
      ambientTween: undefined,
      ambientMotionKey: "",
    };
    this.actors.set(body, actor);
    if (ambientMotion !== undefined) {
      this.setAmbientMotion(body, ambientMotion);
    }
  }

  public setAmbientMotion(
    body: Phaser.GameObjects.Container,
    presentation: ActorAmbientMotionPresentation,
  ): void {
    const actor = this.requireActor(body);
    const motionKey = [
      presentation.distance,
      presentation.durationMs,
      presentation.delayMs ?? 0,
    ].join(":");
    if (motionKey === actor.ambientMotionKey) return;

    actor.ambientTween?.stop();
    actor.body.y = actor.homeY;
    actor.ambientMotionKey = motionKey;
    actor.ambientTween = this.scene.tweens.add({
      targets: actor.body,
      y: actor.homeY - presentation.distance,
      duration: presentation.durationMs,
      delay: presentation.delayMs ?? 0,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
  }

  public presentApproach(presentation: ActorApproachPresentation): void {
    const actor = this.requireActor(presentation.body);
    this.stopMotion(actor);
    actor.body.x = actor.homeX;

    const tween = this.scene.tweens.add({
      targets: actor.body,
      x: actor.homeX + presentation.distance,
      duration: presentation.durationMs,
      ease: "Power2",
      yoyo: true,
      hold: 35,
      onComplete: () => {
        actor.body.x = actor.homeX;
        this.clearMotion(actor, tween);
      },
    });

    actor.motionTween = tween;
  }

  public presentHitReaction(
    presentation: ActorHitReactionPresentation,
  ): void {
    const actor = this.requireActor(presentation.body);
    this.stopMotion(actor);
    actor.body.x = actor.homeX;

    const tween = this.scene.tweens.add({
      targets: actor.body,
      x: actor.homeX + presentation.recoilDistance,
      duration: 45,
      yoyo: true,
      repeat: 2,
      ease: "Sine.InOut",
      onComplete: () => {
        actor.body.x = actor.homeX;
        this.clearMotion(actor, tween);
      },
    });

    actor.motionTween = tween;
    actor.body.setAlpha(0.42);

    const timer = this.scene.time.delayedCall(100, () => {
      this.timers.delete(timer);
      actor.body.setAlpha(1);
    });
    this.timers.add(timer);
  }

  public clear(): void {
    for (const timer of this.timers) {
      timer.remove(false);
    }
    this.timers.clear();

    for (const actor of this.actors.values()) {
      this.stopMotion(actor);
      actor.ambientTween?.stop();
      actor.ambientTween = undefined;
      actor.body.y = actor.homeY;
      actor.body.x = actor.homeX;
      actor.body.setAlpha(1);
    }
    this.actors.clear();
  }

  private requireActor(
    body: Phaser.GameObjects.Container,
  ): RegisteredActor {
    const actor = this.actors.get(body);
    if (actor === undefined) {
      throw new Error("Actor must be registered before presentation");
    }
    return actor;
  }

  private stopMotion(actor: RegisteredActor): void {
    actor.motionTween?.stop();
    actor.motionTween = undefined;
  }

  private clearMotion(
    actor: RegisteredActor,
    tween: Phaser.Tweens.Tween,
  ): void {
    if (actor.motionTween === tween) {
      actor.motionTween = undefined;
    }
  }
}
