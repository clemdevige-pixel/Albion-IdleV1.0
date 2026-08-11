import type { GameBridge } from "../game/GameBridge.js";
import type { ConsumableRuntime } from "../runtime/ConsumableRuntime.js";

interface ConsumableActionsDependencies {
  readonly runtime: Pick<ConsumableRuntime, "useConsumable">;
  readonly bridge: GameBridge;
  readonly syncConsumables: () => void;
  readonly syncInventory: () => void;
  readonly now?: () => number;
}

/** Coordinates consumable results with presentation updates. */
export class ConsumableActions {
  private readonly deps: ConsumableActionsDependencies;
  private readonly now: () => number;

  public constructor(deps: ConsumableActionsDependencies) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
  }

  public use(itemId: string): boolean {
    const result = this.deps.runtime.useConsumable(itemId);
    if (!result.ok) {
      const timestamp = this.now();
      if (result.reason === "hero_dead") {
        this.notifyError(
          `notif_consumable_dead_${String(timestamp)}`,
          "Action impossible : le héros est vaincu.",
          timestamp,
        );
      } else if (result.reason === "cooldown") {
        this.notifyError(
          `notif_consumable_cooldown_${String(timestamp)}`,
          `Potion indisponible : ${String(Math.ceil(result.remainingSeconds))} s`,
          timestamp,
        );
      } else if (result.reason === "resource_full") {
        this.notifyError(
          `notif_consumable_full_${String(timestamp)}`,
          "Impossible à utiliser : points de vie déjà au maximum",
          timestamp,
        );
      }
      return false;
    }

    this.deps.syncConsumables();
    if (result.currentHealth !== undefined && result.maxHealth !== undefined) {
      this.deps.bridge.updatePlayerHealth(result.currentHealth, result.maxHealth);
    }
    this.deps.syncInventory();

    const timestamp = this.now();
    this.deps.bridge.addEconomyNotification({
      id: `notif_consumable_${String(timestamp)}`,
      type: "success",
      message: `Potion de soin : +${String(result.restored)} PV`,
      timestamp,
    });
    return true;
  }

  private notifyError(id: string, message: string, timestamp: number): void {
    this.deps.bridge.addEconomyNotification({
      id,
      type: "error",
      message,
      timestamp,
    });
  }
}
