import type { ExpeditionRecapModel } from "../../runtime/bootstrap/createExpeditionRecapFoundation.js";
import "./expeditionRecap.css";

function formatDuration(durationMs: number): string {
  const hours = durationMs / (60 * 60 * 1000);
  return `${String(hours)}h`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

const QUALITY_LABELS = {
  difficile: "Difficile",
  reussie: "Réussie",
  fructueuse: "Fructueuse",
  exceptionnelle: "Exceptionnelle",
} as const;

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
                  <div><span>Résultat</span><strong>{QUALITY_LABELS[item.reward.quality]}</strong></div>
                  <div><span>Silver</span><strong>{formatNumber(item.reward.silverCredited)}</strong></div>
                  <div><span>Éclats d’enchantement</span><strong>{formatNumber(item.reward.shardsCredited)}</strong></div>
                </div>
              ) : (
                <div className="expedition-recap__reward">
                  <div><span>Résultat</span><strong>{QUALITY_LABELS[item.reward.quality]}</strong></div>
                  <div><span>Runes de faction</span><strong>{formatNumber(item.reward.runesCredited)}</strong></div>
                  <div><span>Fragments de clé</span><strong>{formatNumber(item.reward.fragmentsCredited)}</strong></div>
                  <div><span>Clés complètes</span><strong>{formatNumber(item.reward.completeKeysCredited)}</strong></div>
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
