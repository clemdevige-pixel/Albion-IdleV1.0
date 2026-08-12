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
      className={`combat-stop-button combat-stop-button--${state}`}
      onClick={handleClick}
      title={state === "running"
        ? "Le combat s'arrêtera après la fin du segment en cours."
        : undefined}
    >
      {label}
    </button>
  );
}
