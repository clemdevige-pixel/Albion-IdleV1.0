import { useCombatHudActions, useCombatStateUiModel } from "../ui/combat-hud/combatHudSelectors";

/** Defeat recovery remains an explicit player action. */
export function CombatStateBar(): JSX.Element | null {
  const { combatState, isGathering } = useCombatStateUiModel();
  const actions = useCombatHudActions();

  if (isGathering || combatState !== "defeat") return null;

  return (
    <div className="combat-state-group combat-state-group--defeat">
      <div className="combat-defeat-actions">
        <div className="combat-defeat-actions__copy">
          <strong>Exploration interrompue</strong>
          <span>La progression est en pause.</span>
        </div>
        <button type="button" onClick={() => { actions.resumeExploration(); }}>
          Reprendre l’exploration
        </button>
      </div>
    </div>
  );
}
