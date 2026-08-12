import { useSyncExternalStore } from "react";
import { useGameBridge } from "../../state/GameContext";
import { combatStopController } from "../../runtime/CombatStopController";

export function CombatStopButton(): JSX.Element | null {
  const bridge = useGameBridge();
  const state = useSyncExternalStore(
    (listener) => combatStopController.subscribe(listener),
    () => combatStopController.getState(),
    () => combatStopController.getState(),
  );

  const visible = bridge.combatState === "combat" || state !== "running";
  if (!visible) return null;

  const handleClick = (): void => {
    if (state === "running") {
      if (!combatStopController.requestStopAfterSegment()) return;
      bridge.addEconomyNotification({
        id: `notif_combat_stop_${String(Date.now())}`,
        type: "success",
        message: "Arrêt demandé : le combat s'arrêtera à la fin du segment en cours.",
        timestamp: Date.now(),
      });
      return;
    }

    if (combatStopController.resume()) {
      bridge.addEconomyNotification({
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
        minWidth: 154,
        height: 34,
        padding: "0 14px",
        border: "1px solid rgba(220, 190, 128, 0.55)",
        borderRadius: 6,
        background: state === "paused"
          ? "rgba(55, 105, 72, 0.92)"
          : state === "stop_requested"
            ? "rgba(118, 82, 42, 0.92)"
            : "rgba(80, 45, 42, 0.92)",
        color: "#f4ead3",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.28)",
      }}
    >
      {label}
    </button>
  );
}
