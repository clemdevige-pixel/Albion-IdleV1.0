import { useSyncExternalStore } from "react";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { combatStopController } from "../../runtime/CombatStopController";

interface CombatStopButtonProps {
  /** Keeps the control mounted outside the transient `combat` presentation state. */
  readonly persistent?: boolean;
  /** Compact visual variant for dense HUD/dashboard layouts. */
  readonly compact?: boolean;
  /** Expands the shared control to the full width of its parent layout. */
  readonly fullWidth?: boolean;
}

export function CombatStopButton({
  persistent = false,
  compact = false,
  fullWidth = false,
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
      if (!combatStopController.requestStopAfterEncounter()) return;
      gameBridge.addEconomyNotification({
        id: `notif_combat_stop_${String(Date.now())}`,
        type: "success",
        message: "Arrêt demandé : le combat s'arrêtera après l'ennemi en cours.",
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
  const isResumeAction = state === "paused";

  return (
    <button
      type="button"
      onClick={handleClick}
      title={state === "running"
        ? "Le combat s'arrêtera après l'ennemi en cours."
        : undefined}
      style={{
        width: fullWidth ? "100%" : undefined,
        minWidth: compact ? 110 : 154,
        height: compact ? 28 : 34,
        padding: compact ? "0 11px" : "0 14px",
        border: isResumeAction
          ? "1px solid #c08a1e"
          : state === "stop_requested"
            ? "1px solid rgba(190, 139, 57, 0.72)"
            : "1px solid rgba(155, 76, 68, 0.72)",
        borderRadius: compact ? 4 : 6,
        background: isResumeAction
          ? "linear-gradient(#e3b943, #a97612)"
          : state === "stop_requested"
            ? "rgba(52, 39, 21, 0.94)"
            : "rgba(44, 23, 22, 0.94)",
        color: isResumeAction ? "#15100a" : "#ead8ce",
        fontSize: compact ? 9 : 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        cursor: "pointer",
        boxShadow: isResumeAction
          ? "inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 6px rgba(0,0,0,0.26)"
          : "inset 0 1px 0 rgba(255,255,255,0.035)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
