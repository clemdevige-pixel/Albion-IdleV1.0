import type { ResearchRecapModel } from "../../runtime/bootstrap/createResearchRecapFoundation.js";
import "./expeditionRecap.css";

export function ResearchRecapPopup({
  recap,
  onDismiss,
}: {
  readonly recap: ResearchRecapModel;
  readonly onDismiss: () => void;
}): JSX.Element {
  return (
    <div className="expedition-recap-backdrop dungeon-recap-backdrop" role="presentation">
      <section
        className="expedition-recap dungeon-recap research-recap"
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-recap-title"
      >
        <header className="dungeon-recap__header">
          <div>
            <span className="expedition-recap__eyebrow">Académie · Retour de recherche</span>
            <h2 id="research-recap-title">Recherche terminée</h2>
          </div>
          <span className="expedition-recap__counter" aria-label="Recherche terminée">1/1</span>
        </header>

        <p className="dungeon-recap__summary">
          <strong>{recap.displayName}</strong>
          <span aria-hidden="true">•</span>
          <span>Étude achevée</span>
        </p>

        <div className="research-recap__effect">
          <span>Ce que vous venez de débloquer</span>
          <strong>{recap.effectSummary}</strong>
        </div>

        {recap.unlockGuidance.length > 0 && (
          <div className="research-recap__unlocks" aria-label="Contenu débloqué et accès">
            <h3>Où en profiter</h3>
            <div className="research-recap__unlock-list">
              {recap.unlockGuidance.map((entry, index) => (
                <div key={`${entry.label}-${String(index)}`} className="research-recap__unlock-row">
                  <div>
                    <small>Débloqué</small>
                    <strong>{entry.label}</strong>
                  </div>
                  {entry.destination !== undefined && (
                    <div className="research-recap__destination">
                      <small>Accès</small>
                      <strong>{entry.destination}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="expedition-recap__footer">
          <small>Effets déjà appliqués.</small>
          <button type="button" onClick={onDismiss}>
            Fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
