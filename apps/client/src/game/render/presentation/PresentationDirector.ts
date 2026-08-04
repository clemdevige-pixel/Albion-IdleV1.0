import type { DamageNumberEvent } from "../../GameBridge";
import {
  PresentationQueue,
  type PresentationCommand,
} from "./PresentationQueue";

const COMBAT_EVENT_KIND = "combat_event";

export interface CombatPresentationCommand
  extends PresentationCommand<DamageNumberEvent> {
  readonly kind: typeof COMBAT_EVENT_KIND;
}

export interface PresentationDirectorHandlers {
  readonly presentCombatEvent: (event: DamageNumberEvent) => void;
}

/**
 * Translates presentation-neutral bridge events into visual commands.
 *
 * The director never decides damage, death or rewards. It only schedules how
 * already-authoritative gameplay events are shown.
 */
export class PresentationDirector {
  private readonly queue = new PresentationQueue();

  public constructor(
    private readonly handlers: PresentationDirectorHandlers,
  ) {}

  public enqueueCombatEvent(event: DamageNumberEvent): void {
    const command: CombatPresentationCommand = {
      id: `combat:${String(event.id)}`,
      kind: COMBAT_EVENT_KIND,
      payload: event,
      enqueuedAt: event.timestamp,
    };

    this.queue.enqueue(command);
  }

  public update(maxCommandsPerFrame = 16): void {
    let processed = 0;

    while (processed < maxCommandsPerFrame) {
      const command = this.queue.dequeue();
      if (command === undefined) {
        return;
      }

      this.present(command);
      processed += 1;
    }
  }

  public clear(): void {
    this.queue.clear();
  }

  private present(command: PresentationCommand): void {
    if (command.kind === COMBAT_EVENT_KIND) {
      this.handlers.presentCombatEvent(command.payload as DamageNumberEvent);
    }
  }
}
