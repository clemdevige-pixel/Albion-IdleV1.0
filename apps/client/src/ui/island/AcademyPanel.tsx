import { useState } from "react";
import { getAcademyResearchTier } from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import "./academy.css";

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${String(hours)}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${String(minutes)}m ${String(seconds).padStart(2, "0")}s`;
  return `${String(seconds)}s`;
}

function researchFailureMessage(reason: string): string {
  switch (reason) {
    case "research_slot_occupied": return "Le slot de recherche est déjà occupé.";
    case "requirements_not_met": return "Les prérequis de cette recherche ne sont pas remplis.";
    case "payment_failed": return "Les ressources nécessaires ne sont pas disponibles.";
    case "already_completed": return "Cette recherche est déjà terminée.";
    default: return "Impossible de lancer cette recherche.";
  }
}

function expeditionFailureMessage(reason: string): string {
  switch (reason) {
    case "requirements_not_met": return "Les prérequis de cette expédition ne sont pas remplis.";
    case "no_available_slot": return "Aucun slot d’expédition n’est disponible.";
    case "type_already_active": return "Une expédition de ce type est déjà active.";
    case "invalid_duration": return "Cette durée n’est pas disponible pour cette expédition.";
    default: return "Impossible de lancer cette expédition.";
  }
}

export function AcademyPanel({ level }: { readonly level: number }): JSX.Element {
  // Subscription to the authoritative bridge keeps timers/progression reactive.
  useGameBridge();
  const {
    getAcademyModel,
    startAcademyResearch,
    startAcademyExpedition,
  } = useGameServices();
  const [feedback, setFeedback] = useState<string | null>(null);
  const model = getAcademyModel();
  const researchTier = getAcademyResearchTier(level);

  return (
    <div className="ui-academy">
      <div className="ui-academy__summary">
        <div>
          <span className="ui-island__eyebrow">Académie</span>
          <strong>{researchTier === undefined ? "Tier non authoré" : `Recherche T${String(researchTier)}`}</strong>
        </div>
        <span>1 slot de recherche</span>
      </div>

      {feedback !== null && (
        <div className="ui-academy__feedback" role="status">{feedback}</div>
      )}

      <section className="ui-academy__section">
        <header>
          <strong>Recherches</strong>
          <small>Les déblocages sont accordés automatiquement à la fin du timer.</small>
        </header>
        <div className="ui-academy__list">
          {model.research.map((research) => (
            <article key={research.id} className={`ui-academy__card is-${research.state}`}>
              <div className="ui-academy__card-title">
                <div>
                  <strong>{research.displayName}</strong>
                  <small>T{String(research.tier)} · {formatDuration(research.durationMs)}</small>
                </div>
                <span>{research.state === "completed" ? "Terminée" : research.state === "active" ? "En cours" : research.state === "available" ? "Disponible" : "Verrouillée"}</span>
              </div>
              <div className="ui-academy__meta">
                <span>{String(research.silverCost)} Silver</span>
                {research.materials.map((material) => (
                  <span key={material.itemId}>{material.itemId} ×{String(material.quantity)}</span>
                ))}
              </div>
              {research.remainingDurationMs !== undefined && (
                <div className="ui-academy__timer">Reste {formatDuration(research.remainingDurationMs)}</div>
              )}
              {research.state === "available" && (
                <button
                  type="button"
                  onClick={() => {
                    const result = startAcademyResearch(research.id);
                    setFeedback(result.ok ? `${research.displayName} lancée.` : researchFailureMessage(result.reason));
                  }}
                >
                  Lancer la recherche
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="ui-academy__section">
        <header>
          <strong>Expéditions</strong>
          <small>Les récompenses sont créditées automatiquement à la fin.</small>
        </header>
        <div className="ui-academy__list">
          {model.expeditions.map((expedition) => (
            <article key={expedition.id} className={`ui-academy__card${expedition.active ? " is-active" : ""}`}>
              <div className="ui-academy__card-title">
                <div>
                  <strong>{expedition.displayName}</strong>
                  <small>T{String(expedition.tier)}</small>
                </div>
                <span>{expedition.active ? `Slot ${String((expedition.activeSlotIndex ?? 0) + 1)}` : "Disponible si prérequis"}</span>
              </div>
              {expedition.remainingDurationMs !== undefined ? (
                <div className="ui-academy__timer">Reste {formatDuration(expedition.remainingDurationMs)}</div>
              ) : (
                <div className="ui-academy__durations">
                  {expedition.supportedDurationsMs.map((durationMs) => (
                    <button
                      key={durationMs}
                      type="button"
                      onClick={() => {
                        const result = startAcademyExpedition(expedition.id, durationMs);
                        setFeedback(result.ok ? `${expedition.displayName} lancée.` : expeditionFailureMessage(result.reason));
                      }}
                    >
                      {formatDuration(durationMs)}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
