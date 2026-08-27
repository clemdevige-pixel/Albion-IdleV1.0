import { useEffect, useMemo, useState } from "react";
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
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [recap.id]);

  const safeIndex = Math.min(currentIndex, Math.max(0, recap.items.length - 1));
  const item = recap.items[safeIndex];
  const total = recap.items.length;
  const hasNext = safeIndex < total - 1;
  const positionLabel = `${String(safeIndex + 1)}/${String(total)}`;

  const rewards = useMemo(() => {
    if (item === undefined) return [];
    if (item.reward.kind === "silver") {
      return [
        { label: "Silver", value: item.reward.silverCredited },
        { label: "Éclats d’enchantement", value: item.reward.shardsCredited },
      ];
    }
    return [
      { label: "Runes de faction", value: item.reward.runesCredited },
      { label: "Fragments de clé", value: item.reward.fragmentsCredited },
      { label: "Clés complètes", value: item.reward.completeKeysCredited },
    ];
  }, [item]);

  if (item === undefined) {
    return <></>;
  }

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
            <span>Académie · Retour d’expédition</span>
            <h2 id="expedition-recap-title">Expédition terminée</h2>
          </div>
          <span className="expedition-recap__counter" aria-label={`Expédition ${positionLabel}`}>{positionLabel}</span>
        </header>

        <article className="expedition-recap__item">
          <div className="expedition-recap__title-row">
            <div>
              <small>Mission accomplie</small>
              <strong>{item.displayName}</strong>
            </div>
            <span className="expedition-recap__duration">{formatDuration(item.durationMs)}</span>
          </div>

          <div className={`expedition-recap__quality expedition-recap__quality--${item.reward.quality}`}>
            <span>Résultat</span>
            <strong>{QUALITY_LABELS[item.reward.quality]}</strong>
          </div>

          <div className="expedition-recap__loot" aria-label="Récompenses obtenues">
            {rewards.map((reward) => (
              <div key={reward.label} className="expedition-recap__loot-row">
                <span>{reward.label}</span>
                <strong>+ {formatNumber(reward.value)}</strong>
              </div>
            ))}
          </div>
        </article>

        <footer className="expedition-recap__footer">
          <small>Récompenses déjà créditées.</small>
          <button
            type="button"
            onClick={() => {
              if (hasNext) {
                setCurrentIndex((index) => Math.min(index + 1, total - 1));
              } else {
                onDismiss();
              }
            }}
          >
            {hasNext ? "Suivante →" : "Fermer"}
          </button>
        </footer>
      </section>
    </div>
  );
}
