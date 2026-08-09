import { useCombatHudActions, useCombatStateUiModel } from "../ui/combat-hud/combatHudSelectors";

/**
 * Displays the combat state and exposes the explicit recovery action after a
 * defeat. A defeat never restarts exploration by itself.
 */
export function CombatStateBar(): JSX.Element | null {
  const { combatState, isGathering } = useCombatStateUiModel();
  const actions = useCombatHudActions();

  const isDefeated = combatState === "defeat";

  // Phaser already renders the gathering state and its resource metadata.
  // Hiding the generic React state badge prevents a duplicate "Repos" label.
  if (isGathering || !isDefeated) {
    return null;
  }

  return (
    <div className="combat-state-group combat-state-group--defeat">
      <div className="combat-defeat-actions">
        <span>
          La progression est arrêtée. Modifiez votre équipement si nécessaire.
        </span>
        <button
          type="button"
          onClick={() => {
            actions.resumeExploration();
          }}
        >
          Reprendre l’exploration
        </button>
      </div>
    </div>
  );
}
