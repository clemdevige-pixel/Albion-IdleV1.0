import { useSyncExternalStore } from "react";
import { useGameServices } from "../../state/GameContext";
import "./researchRecapOverlay.css";

export function ResearchRecapOverlay(): JSX.Element | null {
  const services = useGameServices();
  const recap = useSyncExternalStore(
    services.subscribeResearchRecap,
    services.getResearchRecap,
    services.getResearchRecap,
  );

  if (recap === null) return null;

  return (
    <div className="research-recap" role="dialog" aria-modal="true" aria-labelledby="research-recap-title">
      <div className="research-recap__panel">
        <small>Recherche terminée</small>
        <h2 id="research-recap-title">{recap.displayName}</h2>
        <p>{recap.effectSummary}</p>
        {recap.unlockedContent.length > 0 && (
          <div className="research-recap__unlocks">
            <strong>Nouveaux contenus débloqués</strong>
            <ul>
              {recap.unlockedContent.map((entry) => <li key={entry}>{entry}</li>)}
            </ul>
          </div>
        )}
        <button type="button" onClick={services.dismissResearchRecap}>Continuer</button>
      </div>
    </div>
  );
}
