import type { ExpeditionRecapModel } from "../../runtime/bootstrap/createExpeditionRecapFoundation.js";
import "./expeditionRecap.css";

function formatDuration(durationMs: number): string {
  const hours = durationMs / (60 * 60 * 1000);
  return `${String(hours)}h`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function ExpeditionRecapPopup({
  recap,
  onDismiss,
}: {
  readonly recap: ExpeditionRecapModel;
  readonly onDismiss: () => void;
}): JSX.Element {
  return (
    <div className="expedition-recap-backdrop" role="presentation">
      <section
        className="expedition-recap"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expedition-recap-title"
      >
        <header className="expedition-recap__header">
          <div>
            <span>Académie</span>
            <h2 id="expedition-recap-title">
              {recap.items.length > 1 ? "Expéditions terminées" : "Expédition terminée"}
            </h2>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Fermer le récapitulatif">×</button>
        </header>

        <div className="expedition-recap__list">
          {recap.items.map((item) => (
            <article key={`${String(recap.id)}-${item.expeditionId}`} className="expedition-recap__item">
              <div className="expedition-recap__title-row">
                <strong>{item.displayName}</strong>
                <span>{formatDuration(item.durationMs)}</span>
              </div>

              {item.reward.kind === "silver" ? (
                <div className="expedition-recap__reward">
                  <span>Silver crédité</span>
                  <strong>{formatNumber(item.reward.silverCredited)}</strong>
                </div>
              ) : (
                <div className="expedition-recap__reward">
                  <span>Runes de faction créditées</span>
                  <strong>{formatNumber(item.reward.runesCredited)}</strong>
                </div>
              )}
            </article>
          ))}
        </div>

        <footer className="expedition-recap__footer">
          <small>Les récompenses ont déjà été créditées automatiquement.</small>
          <button type="button" onClick={onDismiss}>Fermer</button>
        </footer>
      </section>
    </div>
  );
}
