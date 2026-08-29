import { useEffect, useMemo, useState } from "react";
import { ItemVisual } from "../../panels/ItemVisual.js";
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

interface ExpeditionRewardRow {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly itemId?: string;
  readonly currency?: "silver";
}

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

  const rewards = useMemo<readonly ExpeditionRewardRow[]>(() => {
    if (item === undefined) return [];
    if (item.reward.kind === "silver") {
      return [
        { key: "silver", label: "Silver", value: item.reward.silverCredited, currency: "silver" },
        {
          key: "enchantment-shards",
          label: "Éclats d’enchantement",
          value: item.reward.shardsCredited,
          itemId: item.reward.shardItemId,
        },
      ];
    }
    return [
      {
        key: "faction-runes",
        label: "Runes de faction",
        value: item.reward.runesCredited,
        itemId: item.reward.itemId,
      },
      {
        key: "key-fragments",
        label: "Fragments de clé",
        value: item.reward.fragmentsCredited,
        itemId: item.reward.fragmentItemId,
      },
      {
        key: "complete-keys",
        label: "Clés complètes",
        value: item.reward.completeKeysCredited,
        itemId: item.reward.keyItemId,
      },
    ].filter((reward) => reward.value > 0);
  }, [item]);

  if (item === undefined) {
    return <></>;
  }

  return (
    <div className="expedition-recap-backdrop dungeon-recap-backdrop" role="presentation">
      <section
        className="expedition-recap dungeon-recap"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expedition-recap-title"
      >
        <header className="dungeon-recap__header">
          <div>
            <span className="expedition-recap__eyebrow">Académie · Retour d’expédition</span>
            <h2 id="expedition-recap-title">Expédition terminée</h2>
          </div>
          <span className="expedition-recap__counter" aria-label={`Expédition ${positionLabel}`}>{positionLabel}</span>
        </header>

        <p className="dungeon-recap__summary">
          <strong>{item.displayName}</strong>
          <span aria-hidden="true">•</span>
          <span>{formatDuration(item.durationMs)}</span>
          <span aria-hidden="true">•</span>
          <strong>{QUALITY_LABELS[item.reward.quality]}</strong>
        </p>

        <div className="dungeon-recap__rewards" aria-label="Récompenses obtenues">
          <h3>Récompenses obtenues</h3>
          {rewards.length > 0 ? (
            <div className="dungeon-recap__reward-list">
              {rewards.map((reward) => (
                <div key={reward.key} className="dungeon-recap__reward-row">
                  <div className="dungeon-recap__reward-identity">
                    <span className="dungeon-recap__reward-icon" aria-hidden="true">
                      {reward.currency === "silver" ? (
                        <span className="dungeon-recap__silver-icon">S</span>
                      ) : reward.itemId !== undefined ? (
                        <ItemVisual itemId={reward.itemId} />
                      ) : null}
                    </span>
                    <span>{reward.label}</span>
                  </div>
                  <strong>+{formatNumber(reward.value)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="dungeon-recap__empty">Aucune récompense obtenue.</p>
          )}
        </div>

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
