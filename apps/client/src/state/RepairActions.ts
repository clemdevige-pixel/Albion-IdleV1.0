import type { EntityId } from "@game/core";
import {
  asEconomyTransactionId,
  type EconomyTransactionRequest,
  type EconomyTransactionResult,
  type PlayerId,
  type WalletId,
} from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge.js";

interface EconomyTransactionExecutor {
  execute(request: EconomyTransactionRequest): EconomyTransactionResult;
}

interface RepairActionsDependencies {
  readonly economyTransactionService: EconomyTransactionExecutor;
  readonly bridge: GameBridge;
  readonly playerId: PlayerId;
  readonly heroId: EntityId;
  readonly walletId: WalletId;
  readonly resyncAll: () => void;
  readonly now?: () => number;
  readonly random?: () => number;
}

/** Coordinates authoritative repair transactions with UI feedback. */
export class RepairActions {
  private readonly deps: RepairActionsDependencies;
  private readonly now: () => number;
  private readonly random: () => number;

  public constructor(deps: RepairActionsDependencies) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.random = deps.random ?? Math.random;
  }

  public repairAll(): boolean {
    const timestamp = this.now();
    const transactionId = asEconomyTransactionId(
      `tx_repair_${String(timestamp)}_${String(this.random()).slice(2, 8)}`,
    );
    const result = this.deps.economyTransactionService.execute({
      type: "bulk_equipment_repair",
      transactionId,
      playerId: this.deps.playerId,
      playerEntityId: this.deps.heroId,
      walletId: this.deps.walletId,
      stationId: "station_general",
    });

    if (!result.ok) {
      this.deps.bridge.addEconomyNotification({
        id: `notif_${transactionId}`,
        type: "error",
        message: result.code === "repair_nothing_to_repair"
          ? "Aucun équipement à réparer"
          : `Réparation impossible : ${result.code.replace("repair_", "")}`,
        timestamp,
      });
      return false;
    }

    const totalCost = result.effects.type === "bulk_equipment_repair"
      ? result.effects.outcome.totalCost
      : 0;
    this.deps.bridge.addTransaction({
      id: transactionId,
      type: "repair",
      description: "Réparation complète de l’équipement",
      amount: totalCost,
      timestamp,
    });
    this.deps.bridge.addEconomyNotification({
      id: `notif_${transactionId}`,
      type: "success",
      message: `Équipement réparé · ${String(totalCost)} Silver`,
      timestamp,
    });
    this.deps.resyncAll();
    return true;
  }
}
