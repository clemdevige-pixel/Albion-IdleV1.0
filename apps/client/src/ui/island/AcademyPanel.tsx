import { useState } from "react";
import { getAcademyResearchTier } from "@game/data";
import type { ExpeditionDurationMs } from "@game/gameplay";
import {
  SILVER_EXPEDITION_TYPE_ID,
} from "../../data/expeditionContentCatalog";
import {
  getResearchPresentationGroup,
  type ResearchPresentationGroup,
} from "../../data/researchContentCatalog";
import type {
  AcademyExpeditionEntryModel,
  AcademyResearchEntryModel,
} from "../../runtime/bootstrap/createAcademyPresentationFoundation";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import "./academy.css";

const ACADEMY_TIERS = [4, 5, 6, 7, 8] as const;

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

function researchPriority(research: AcademyResearchEntryModel): number {
  switch (research.state) {
    case "active": return 0;
    case "available": return 1;
    case "locked": return research.relicGateState === "ready" ? 2 : 3;
    case "completed": return 4;
  }
}

function researchStatusLabel(research: AcademyResearchEntryModel): string {
  if (research.state === "completed") return "Terminée";
  if (research.state === "active") return "En cours";
  if (research.state === "available") return "Disponible";
  if (research.relicGateState === "ready") return "Relique prête à examiner";
  if (research.relicGateState === "waiting") return "En attente de la relique";
  return "Verrouillée";
}

function expeditionStatusLabel(expedition: AcademyExpeditionEntryModel): string {
  if (expedition.active) return `Slot ${String((expedition.activeSlotIndex ?? 0) + 1)}`;
  switch (expedition.startState) {
    case "available": return "Disponible";
    case "requirements_locked": return "Verrouillée";
    case "type_active": return "Type déjà actif";
    case "no_available_slot": return "Slots occupés";
  }
}

function expeditionKindLabel(expedition: AcademyExpeditionEntryModel): string {
  return expedition.typeId === SILVER_EXPEDITION_TYPE_ID ? "Silver" : "Faction";
}

function ResearchCard({
  research,
  onAction,
}: {
  readonly research: AcademyResearchEntryModel;
  readonly onAction: (research: AcademyResearchEntryModel) => void;
}): JSX.Element {
  const progress = research.remainingDurationMs === undefined
    ? 0
    : Math.max(0, Math.min(100, 100 * (1 - research.remainingDurationMs / research.durationMs)));

  return (
    <article className={`ui-academy__card is-${research.state}`}>
      <div className="ui-academy__card-title">
        <div>
          <small>T{String(research.tier)} · {formatDuration(research.durationMs)}</small>
          <strong>{research.displayName}</strong>
        </div>
        <span className={`ui-academy__status is-${research.state}`}>
          {researchStatusLabel(research)}
        </span>
      </div>

      <div className="ui-academy__meta">
        <span>{research.silverCost > 0 ? `${String(research.silverCost)} Silver` : "Sans coût Silver"}</span>
        {research.materials.map((material) => (
          <span key={material.itemId}>{material.itemId} ×{String(material.quantity)}</span>
        ))}
      </div>

      {research.remainingDurationMs !== undefined && (
        <>
          <div className="ui-academy__progress" aria-hidden="true">
            <span style={{ width: `${String(progress)}%` }} />
          </div>
          <div className="ui-academy__timer">Reste {formatDuration(research.remainingDurationMs)}</div>
        </>
      )}

      {research.relicGateState === "ready" && research.state === "locked" && (
        <button className="ui-academy__action" type="button" onClick={() => { onAction(research); }}>
          Envoyer la relique à l’Académie
        </button>
      )}
      {research.state === "available" && (
        <button className="ui-academy__action" type="button" onClick={() => { onAction(research); }}>
          Lancer la recherche
        </button>
      )}
    </article>
  );
}

function ExpeditionCard({
  expedition,
  onStart,
}: {
  readonly expedition: AcademyExpeditionEntryModel;
  readonly onStart: (
    expedition: AcademyExpeditionEntryModel,
    durationMs: ExpeditionDurationMs,
  ) => void;
}): JSX.Element {
  const canStart = expedition.startState === "available";
  const statusClass = expedition.active ? "active" : expedition.startState;

  return (
    <article className={`ui-academy__card ui-academy__expedition-card is-${statusClass}`}>
      <div className="ui-academy__card-title">
        <div>
          <small>{expeditionKindLabel(expedition)} · T{String(expedition.tier)}</small>
          <strong>{expedition.displayName}</strong>
        </div>
        <span className={`ui-academy__status is-${statusClass}`}>
          {expeditionStatusLabel(expedition)}
        </span>
      </div>

      {expedition.remainingDurationMs !== undefined ? (
        <div className="ui-academy__timer">Reste {formatDuration(expedition.remainingDurationMs)}</div>
      ) : (
        <div className="ui-academy__durations" role="group" aria-label={`Durée · ${expedition.displayName}`}>
          {expedition.supportedDurationsMs.map((durationMs) => (
            <button
              key={durationMs}
              type="button"
              disabled={!canStart}
              onClick={() => { onStart(expedition, durationMs); }}
            >
              {formatDuration(durationMs)}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export function AcademyPanel({ level }: { readonly level: number }): JSX.Element {
  useGameBridge();
  const {
    getAcademyModel,
    startAcademyResearch,
    startAcademyExpedition,
  } = useGameServices();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [researchScope, setResearchScope] = useState<ResearchPresentationGroup>("core");
  const [requestedExpeditionTier, setRequestedExpeditionTier] = useState<number | undefined>();
  const model = getAcademyModel();
  const researchTier = getAcademyResearchTier(level);
  const selectedExpeditionTier = requestedExpeditionTier ?? researchTier ?? 4;
  const availableTiers = ACADEMY_TIERS.filter((tier) => researchTier !== undefined && tier <= researchTier);
  const research = model.research.filter((entry) => (
    getResearchPresentationGroup(entry.id) === researchScope
  ));
  research.sort((left, right) => researchPriority(left) - researchPriority(right));
  const activeExpeditions = model.expeditions.filter((entry) => entry.active);
  const tierExpeditions = model.expeditions.filter((entry) => (
    entry.tier === selectedExpeditionTier && !entry.active
  ));

  const handleResearchAction = (entry: AcademyResearchEntryModel): void => {
    const result = startAcademyResearch(entry.id);
    setFeedback(
      result.ok && result.action === "relic_examined"
        ? "Relique envoyée à l’Académie et examinée."
        : result.ok
          ? `${entry.displayName} lancée.`
          : researchFailureMessage(result.reason),
    );
  };

  const handleExpeditionStart = (
    expedition: AcademyExpeditionEntryModel,
    durationMs: ExpeditionDurationMs,
  ): void => {
    const result = startAcademyExpedition(expedition.id, durationMs);
    setFeedback(result.ok ? `${expedition.displayName} lancée.` : expeditionFailureMessage(result.reason));
  };

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
          <div>
            <strong>Recherches</strong>
            <small>Un seul projet peut être étudié à la fois.</small>
          </div>
        </header>

        <nav className="ui-academy__tabs" aria-label="Famille de recherche">
          <button
            type="button"
            className={researchScope === "core" ? "is-active" : ""}
            onClick={() => { setResearchScope("core"); }}
          >
            Socle
          </button>
          <button
            type="button"
            className={researchScope === "faction" ? "is-active" : ""}
            onClick={() => { setResearchScope("faction"); }}
          >
            Factions
          </button>
        </nav>

        <div className="ui-academy__list">
          {research.map((entry) => (
            <ResearchCard key={entry.id} research={entry} onAction={handleResearchAction} />
          ))}
        </div>
      </section>

      <section className="ui-academy__section">
        <header>
          <div>
            <strong>Expéditions</strong>
            <small>Activités passives parallèles, y compris hors ligne.</small>
          </div>
          <span>{String(activeExpeditions.length)} / {String(model.expeditionSlotCapacity)} actif</span>
        </header>

        <div className="ui-academy__slots" aria-label="Slots d’expédition">
          {model.expeditionSlotCapacity === 0 ? (
            <div className="ui-academy__slot is-locked">
              <strong>Slots verrouillés</strong>
              <small>Cartographie I requise</small>
            </div>
          ) : Array.from({ length: model.expeditionSlotCapacity }, (_, slotIndex) => {
            const active = activeExpeditions.find((entry) => entry.activeSlotIndex === slotIndex);
            return (
              <div key={slotIndex} className={`ui-academy__slot${active === undefined ? " is-empty" : " is-active"}`}>
                <strong>Slot {String(slotIndex + 1)}</strong>
                <small>{active?.displayName ?? "Libre"}</small>
              </div>
            );
          })}
        </div>

        {activeExpeditions.length > 0 && (
          <div className="ui-academy__active-expeditions">
            {activeExpeditions.map((entry) => (
              <ExpeditionCard key={entry.id} expedition={entry} onStart={handleExpeditionStart} />
            ))}
          </div>
        )}

        <nav className="ui-academy__tabs ui-academy__tabs--tiers" aria-label="Tier d’expédition">
          {ACADEMY_TIERS.map((tier) => {
            const locked = !availableTiers.includes(tier);
            return (
              <button
                key={tier}
                type="button"
                className={selectedExpeditionTier === tier ? "is-active" : ""}
                disabled={locked}
                title={locked ? `Académie T${String(tier)} requise` : undefined}
                onClick={() => { setRequestedExpeditionTier(tier); }}
              >
                T{String(tier)}{locked ? " 🔒" : ""}
              </button>
            );
          })}
        </nav>

        <div className="ui-academy__list">
          {tierExpeditions.map((entry) => (
            <ExpeditionCard key={entry.id} expedition={entry} onStart={handleExpeditionStart} />
          ))}
        </div>
      </section>
    </div>
  );
}