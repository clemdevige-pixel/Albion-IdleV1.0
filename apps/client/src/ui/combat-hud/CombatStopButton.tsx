import { useSyncExternalStore } from "react";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { combatStopController } from "../../runtime/CombatStopController";

interface CombatStopButtonProps {
  /** Keeps the control mounted outside the transient `combat` presentation state. */
  readonly persistent?: boolean;
  /** Compact visual variant for dense HUD/dashboard layouts. */
  readonly compact?: boolean;
}

export function CombatStopButton({
  persistent = false,
  compact = false,
}: CombatStopButtonProps): JSX.Element | null {
  const bridge = useGameBridge();
  const { bridge: gameBridge } = useGameServices();
  const state = useSyncExternalStore(
    (listener) => combatStopController.subscribe(listener),
    () => combatStopController.getState(),
    () => combatStopController.getState(),
  );

  const visible = persistent || bridge.combatState === "combat" || state !== "running";
  if (!visible) return null;

  const handleClick = (): void => {
    if (state === "running") {
      if (!combatStopController.requestStopAfterSegment()) return;
      gameBridge.addEconomyNotification({
        id: `notif_combat_stop_${String(Date.now())}`,
        type: "success",
        message: "Arrêt demandé : le combat s'arrêtera à la fin du segment en cours.",
        timestamp: Date.now(),
      });
      return;
    }

    if (combatStopController.resume()) {
      gameBridge.addEconomyNotification({
        id: `notif_combat_resume_${String(Date.now())}`,
        type: "success",
        message: state === "paused" ? "Combat repris." : "Arrêt du combat annulé.",
        timestamp: Date.now(),
      });
    }
  };

  const label = state === "paused"
    ? "Reprendre le combat"
    : state === "stop_requested"
      ? "Annuler l'arrêt"
      : "Arrêter le combat";

  return (
    <button
      type="button"
      onClick={handleClick}
      title={state === "running"
        ? "Le combat s'arrêtera après la fin du segment en cours."
        : undefined}
      style={{
        minWidth: compact ? 104 : 154,
        height: compact ? 29 : 34,
        padding: compact ? "0 10px" : "0 14px",
        border: "1px solid rgba(220, 190, 128, 0.55)",
        borderRadius: compact ? 4 : 6,
        background: state === "paused"
          ? "rgba(55, 105, 72, 0.92)"
          : state === "stop_requested"
            ? "rgba(118, 82, 42, 0.92)"
            : "rgba(80, 45, 42, 0.92)",
        color: "#f4ead3",
        fontSize: compact ? 10 : 12,
        fontWeight: 700,
        letterSpacing: compact ? "0.025em" : "0.02em",
        cursor: "pointer",
        boxShadow: compact
          ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 4px rgba(0, 0, 0, 0.24)"
          : "0 2px 8px rgba(0, 0, 0, 0.28)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
