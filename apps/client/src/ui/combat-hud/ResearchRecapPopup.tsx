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
    <div className="expedition-recap-backdrop" role="presentation">
      <section
        className="expedition-recap"
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-recap-title"
      >
        <header className="expedition-recap__header">
          <div>
            <span>Académie · Retour de recherche</span>
            <h2 id="research-recap-title">Recherche terminée</h2>
          </div>
          <span className="expedition-recap__counter" aria-label="Recherche terminée">1/1</span>
        </header>

        <article className="expedition-recap__item">
          <div className="expedition-recap__title-row">
            <div>
              <small>Étude achevée</small>
              <strong>{recap.displayName}</strong>
            </div>
            <span className="expedition-recap__duration">Acquise</span>
          </div>

          <div className="expedition-recap__quality expedition-recap__quality--fructueuse">
            <span>Effet</span>
            <strong>{recap.effectSummary}</strong>
          </div>

          {recap.unlockedContent.length > 0 && (
            <div className="expedition-recap__loot" aria-label="Contenu débloqué">
              {recap.unlockedContent.map((content) => (
                <div key={content} className="expedition-recap__loot-row">
                  <span>Débloqué</span>
                  <strong>{content}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

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
