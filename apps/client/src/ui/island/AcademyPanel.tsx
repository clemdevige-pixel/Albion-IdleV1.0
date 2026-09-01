import { useEffect, useState } from "react";
import { getAcademyResearchTier } from "@game/data";
import type { ExpeditionDurationMs } from "@game/gameplay";
import {
  getExpeditionPresentationInfo,
  SILVER_EXPEDITION_TYPE_ID,
} from "../../data/expeditionContentCatalog";
import { getResearchPresentationInfo } from "../../data/researchContentCatalog";
import type {
  AcademyExpeditionEntryModel,
  AcademyResearchEntryModel,
} from "../../runtime/bootstrap/createAcademyPresentationFoundation";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { FeatureAttentionBadge } from "../attention/FeatureAttentionBadge";
import {
  FEATURE_UNLOCK_VISITS,
  useFeatureUnlockPending,
  useFeatureUnlockVisit,
} from "../attention/usePlayerAttention";
import { ContextHoverTooltip } from "../shared/ContextHoverTooltip";
import "./academy.css";

const ACADEMY_TIERS = [4, 5, 6, 7, 8] as const;
type AcademyView = "research" | "expeditions";

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
    case "already_active": return "Cette recherche est déjà en cours.";
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
    case "locked": return 2;
    case "completed": return 3;
  }
}

function researchStatusLabel(research: AcademyResearchEntryModel): string {
  if (research.state === "completed") return "Terminée";
  if (research.state === "active") return "En cours";
  if (research.state === "available") return "Disponible";
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

function formatResearchCost(research: AcademyResearchEntryModel): string {
  const parts: string[] = [];
  if (research.silverCost > 0) parts.push(`${String(research.silverCost)} Silver`);
  for (const material of research.materials) {
    parts.push(`${material.itemId} ×${String(material.quantity)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Aucun coût";
}

function ResearchTooltip({ research }: { readonly research: AcademyResearchEntryModel }): JSX.Element {
  const info = getResearchPresentationInfo(research.id);
  return (
    <div className="context-tooltip-content">
      <div className="context-tooltip-content__header">
        <strong>{research.displayName}</strong>
        <small>Recherche T{String(research.tier)} · {formatDuration(research.durationMs)}</small>
      </div>
      {info !== undefined && <div className="context-tooltip-content__body">{info.description}</div>}
      <div className="context-tooltip-content__rows">
        {info !== undefined && (
          <div className="context-tooltip-content__row is-accent">
            <span>Effet</span>
            <b>{info.effectSummary}</b>
          </div>
        )}
        <div className="context-tooltip-content__row">
          <span>Coût</span>
          <b>{formatResearchCost(research)}</b>
        </div>
        <div className="context-tooltip-content__row">
          <span>État</span>
          <b>{researchStatusLabel(research)}</b>
        </div>
      </div>
    </div>
  );
}

function ResearchAction({
  research,
  label,
  onAction,
}: {
  readonly research: AcademyResearchEntryModel;
  readonly label: string;
  readonly onAction: (research: AcademyResearchEntryModel) => void;
}): JSX.Element {
  return (
    <ContextHoverTooltip tooltip={<ResearchTooltip research={research} />}>
      <button className="ui-academy__action" type="button" onClick={() => { onAction(research); }}>
        {label}
      </button>
    </ContextHoverTooltip>
  );
}

function ResearchRow({
  research,
  onAction,
  compact = false,
}: {
  readonly research: AcademyResearchEntryModel;
  readonly onAction?: (research: AcademyResearchEntryModel) => void;
  readonly compact?: boolean;
}): JSX.Element {
  const info = getResearchPresentationInfo(research.id);
  const progress = research.remainingDurationMs === undefined
    ? 0
    : Math.max(0, Math.min(100, 100 * (1 - research.remainingDurationMs / research.durationMs)));

  return (
    <article className={`ui-academy__research-row is-${research.state}${compact ? " is-compact" : ""}`}>
      <div className="ui-academy__research-main">
        <small>T{String(research.tier)} · {formatDuration(research.durationMs)}</small>
        <strong>{research.displayName}</strong>
        {!compact && info !== undefined && <span>{info.effectSummary}</span>}
      </div>
      <div className="ui-academy__research-side">
        <b className={`ui-academy__status is-${research.state}`}>{researchStatusLabel(research)}</b>
        {!compact && <small>{formatResearchCost(research)}</small>}
      </div>

      {research.remainingDurationMs !== undefined && (
        <div className="ui-academy__research-progress">
          <div className="ui-academy__progress" aria-hidden="true">
            <span style={{ width: `${String(progress)}%` }} />
          </div>
          <small>Reste {formatDuration(research.remainingDurationMs)}</small>
        </div>
      )}

      {!compact && research.state === "available" && onAction !== undefined && (
        <ResearchAction research={research} label="Lancer" onAction={onAction} />
      )}
    </article>
  );
}

function ExpeditionTooltip({ expedition }: { readonly expedition: AcademyExpeditionEntryModel }): JSX.Element {
  const info = getExpeditionPresentationInfo(expedition.id);
  const requirement = expedition.typeId === SILVER_EXPEDITION_TYPE_ID
    ? `Cartographie T${String(expedition.tier)}`
    : `Archéologie T${String(expedition.tier)}`;
  return (
    <div className="context-tooltip-content">
      <div className="context-tooltip-content__header">
        <strong>{expedition.displayName}</strong>
        <small>{expeditionKindLabel(expedition)} · T{String(expedition.tier)}</small>
      </div>
      {info !== undefined && <div className="context-tooltip-content__body">{info.description}</div>}
      <div className="context-tooltip-content__rows">
        {info !== undefined && (
          <div className="context-tooltip-content__row is-accent">
            <span>Récompense</span>
            <b>{info.rewardSummary}</b>
          </div>
        )}
        <div className="context-tooltip-content__row">
          <span>Prérequis</span>
          <b>{requirement}</b>
        </div>
        <div className="context-tooltip-content__row">
          <span>État</span>
          <b>{expeditionStatusLabel(expedition)}</b>
        </div>
      </div>
    </div>
  );
}

function ActiveExpeditionRow({
  expedition,
  onCancel,
}: {
  readonly expedition: AcademyExpeditionEntryModel;
  readonly onCancel: (expedition: AcademyExpeditionEntryModel) => void;
}): JSX.Element {
  const info = getExpeditionPresentationInfo(expedition.id);
  const progress = expedition.activeDurationMs === undefined || expedition.remainingDurationMs === undefined
    ? undefined
    : expedition.activeDurationMs <= 0
      ? 100
      : Math.max(
        0,
        Math.min(
          100,
          100 * (1 - expedition.remainingDurationMs / expedition.activeDurationMs),
        ),
      );

  return (
    <article className="ui-academy__research-row ui-academy__active-expedition-row is-active">
      <div className="ui-academy__research-main">
        <small>
          T{String(expedition.tier)}
          {expedition.activeDurationMs === undefined ? "" : ` · ${formatDuration(expedition.activeDurationMs)}`}
        </small>
        <strong>{expedition.displayName}</strong>
        {info !== undefined && <span>{info.rewardSummary}</span>}
      </div>
      <div className="ui-academy__research-side">
        <b className="ui-academy__status is-active">En cours</b>
        <small>Slot {String((expedition.activeSlotIndex ?? 0) + 1)} · {expeditionKindLabel(expedition)}</small>
      </div>
      <button
        className="ui-academy__cancel-expedition"
        type="button"
        onClick={() => { onCancel(expedition); }}
      >
        Annuler
      </button>

      {progress !== undefined && expedition.remainingDurationMs !== undefined && (
        <div className="ui-academy__research-progress">
          <div className="ui-academy__progress" aria-hidden="true">
            <span style={{ width: `${String(progress)}%` }} />
          </div>
          <small>Reste {formatDuration(expedition.remainingDurationMs)}</small>
        </div>
      )}
    </article>
  );
}

export function AcademyPanel({
  level,
  initialView,
}: {
  readonly level: number;
  readonly initialView?: AcademyView;
}): JSX.Element {
  useGameBridge();
  const {
    getAcademyModel,
    startAcademyResearch,
    startAcademyExpedition,
  } = useGameServices();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [view, setView] = useState<AcademyView>(initialView ?? "research");
  const [showResearchHistory, setShowResearchHistory] = useState(false);
  const [requestedExpeditionTier, setRequestedExpeditionTier] = useState<number | undefined>();
  const [requestedExpeditionId, setRequestedExpeditionId] = useState<string | undefined>();
  const [requestedDuration, setRequestedDuration] = useState<ExpeditionDurationMs | undefined>();
  const expeditionUnlockCount = useFeatureUnlockPending(FEATURE_UNLOCK_VISITS.expeditions);

  useFeatureUnlockVisit(
    view === "expeditions" ? FEATURE_UNLOCK_VISITS.expeditions : [],
  );

  useEffect(() => {
    if (initialView !== undefined) setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (feedback === null) return;
    const timeoutId = window.setTimeout(() => { setFeedback(null); }, 3000);
    return () => { window.clearTimeout(timeoutId); };
  }, [feedback]);

  const model = getAcademyModel();
  const researchTier = getAcademyResearchTier(level);
  const availableTiers = ACADEMY_TIERS.filter((tier) => researchTier !== undefined && tier <= researchTier);
  const selectedExpeditionTier = requestedExpeditionTier ?? availableTiers.at(-1) ?? 4;
  const completedResearch = model.research.filter((entry) => entry.state === "completed");
  const activeResearches = model.research.filter((entry) => entry.state === "active");
  const availableResearch = model.research.filter((entry) => {
    const info = getResearchPresentationInfo(entry.id);
    return entry.state !== "completed"
      && entry.state !== "active"
      && researchTier !== undefined
      && entry.tier <= researchTier
      && !(entry.state === "locked" && info?.hiddenWhileLocked === true);
  });
  availableResearch.sort((left, right) => researchPriority(left) - researchPriority(right));

  const activeExpeditions = model.expeditions.filter((entry) => entry.active);
  const tierExpeditions = model.expeditions.filter((entry) => (
    entry.tier === selectedExpeditionTier && !entry.active
  ));
  const selectedExpedition = tierExpeditions.find((entry) => entry.id === requestedExpeditionId)
    ?? tierExpeditions[0];
  const selectedDuration = selectedExpedition?.supportedDurationsMs.find((duration) => duration === requestedDuration)
    ?? selectedExpedition?.supportedDurationsMs[0];
  const selectedExpeditionInfo = selectedExpedition === undefined
    ? undefined
    : getExpeditionPresentationInfo(selectedExpedition.id);

  const handleResearchAction = (entry: AcademyResearchEntryModel): void => {
    const result = startAcademyResearch(entry.id);
    setFeedback(result.ok ? `${entry.displayName} lancée.` : researchFailureMessage(result.reason));
  };

  const handleExpeditionStart = (): void => {
    if (selectedExpedition === undefined || selectedDuration === undefined) return;
    const result = startAcademyExpedition(selectedExpedition.id, selectedDuration);
    setFeedback(result.ok ? `${selectedExpedition.displayName} lancée.` : expeditionFailureMessage(result.reason));
  };

  const handleExpeditionCancel = (entry: AcademyExpeditionEntryModel): void => {
    if (entry.activeSlotIndex === undefined) return;
    const result = model.cancelExpedition(entry.activeSlotIndex);
    setFeedback(
      result.ok
        ? `${entry.displayName} annulée. Aucune récompense obtenue.`
        : "Cette expédition n’est plus active.",
    );
  };

  return (
    <div className="ui-academy">
      <nav className="ui-academy__main-tabs" aria-label="Académie">
        <button type="button" className={view === "research" ? "is-active" : ""} onClick={() => { setView("research"); }}>
          Recherches
        </button>
        <button type="button" className={view === "expeditions" ? "is-active" : ""} onClick={() => { setView("expeditions"); }}>
          Expéditions
          <FeatureAttentionBadge count={expeditionUnlockCount} />
        </button>
      </nav>

      {feedback !== null && <div className="ui-academy__feedback" role="status">{feedback}</div>}

      {view === "research" ? (
        <section className="ui-academy__section">
          <header>
            <div>
              <strong>Recherches</strong>
              <small>Les recherches indépendantes peuvent progresser simultanément.</small>
            </div>
            <button
              className={`ui-academy__history-toggle${showResearchHistory ? " is-active" : ""}`}
              type="button"
              onClick={() => { setShowResearchHistory((current) => !current); }}
            >
              Terminées ({String(completedResearch.length)})
            </button>
          </header>

          {showResearchHistory ? (
            <div className="ui-academy__history">
              {completedResearch.length === 0 ? (
                <div className="ui-island__selection-status">Aucune recherche terminée.</div>
              ) : completedResearch.map((entry) => (
                <ResearchRow key={entry.id} research={entry} compact />
              ))}
            </div>
          ) : (
            <>
              {activeResearches.length > 0 && (
                <div className="ui-academy__active-research">
                  <span className="ui-island__eyebrow">En cours ({String(activeResearches.length)})</span>
                  {activeResearches.map((entry) => (
                    <ResearchRow key={entry.id} research={entry} />
                  ))}
                </div>
              )}

              <div className="ui-academy__research-list">
                {availableResearch.length === 0 ? (
                  <div className="ui-island__selection-status">Aucune recherche restante.</div>
                ) : availableResearch.map((entry) => (
                  <ResearchRow key={entry.id} research={entry} onAction={handleResearchAction} />
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="ui-academy__section ui-academy__section--expeditions">
          <header>
            <div>
              <strong>Expéditions</strong>
              <small>Configurez une expédition passive puis affectez-la à un slot libre.</small>
            </div>
            <span>{String(activeExpeditions.length)} / {String(model.expeditionSlotCapacity)} actifs</span>
          </header>

          {activeExpeditions.length === 0 ? (
            <div className="ui-academy__expedition-stage">
              <span className="ui-island__eyebrow">En cours</span>
              <div className="ui-academy__empty-row">Aucune expédition active.</div>
            </div>
          ) : (
            <div className="ui-academy__active-research ui-academy__active-expeditions-block">
              <span className="ui-island__eyebrow">En cours</span>
              <div className="ui-academy__active-expeditions">
                {activeExpeditions.map((entry) => (
                  <ActiveExpeditionRow
                    key={entry.id}
                    expedition={entry}
                    onCancel={handleExpeditionCancel}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="ui-academy__expedition-stage">
            <span className="ui-island__eyebrow">Tier</span>
            <nav className="ui-academy__tier-tabs" aria-label="Tier d’expédition">
              {availableTiers.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  className={selectedExpeditionTier === tier ? "is-active" : ""}
                  onClick={() => {
                    setRequestedExpeditionTier(tier);
                    setRequestedExpeditionId(undefined);
                    setRequestedDuration(undefined);
                  }}
                >
                  T{String(tier)}
                </button>
              ))}
            </nav>
          </div>

          <div className="ui-academy__expedition-stage">
            <span className="ui-island__eyebrow">Expédition</span>
            <div className="ui-academy__expedition-list" role="listbox" aria-label="Expédition">
              {tierExpeditions.map((entry) => {
                const selected = entry.id === selectedExpedition?.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`ui-academy__expedition-option${selected ? " is-selected" : ""}`}
                    onClick={() => {
                      setRequestedExpeditionId(entry.id);
                      setRequestedDuration(undefined);
                    }}
                  >
                    <strong>{expeditionKindLabel(entry)}</strong>
                    <small>{expeditionStatusLabel(entry)}</small>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedExpedition !== undefined && (
            <div className="ui-academy__expedition-stage ui-academy__expedition-config">
              <div className="ui-academy__launcher-summary">
                <div>
                  <span className="ui-island__eyebrow">Sélection</span>
                  <strong>{selectedExpedition.displayName}</strong>
                </div>
                <b>{selectedExpeditionInfo?.rewardSummary ?? "Récompense non renseignée"}</b>
              </div>

              <div className="ui-academy__duration-picker" role="group" aria-label="Durée">
                {selectedExpedition.supportedDurationsMs.map((durationMs) => (
                  <button
                    key={durationMs}
                    type="button"
                    className={durationMs === selectedDuration ? "is-active" : ""}
                    onClick={() => { setRequestedDuration(durationMs); }}
                  >
                    {formatDuration(durationMs)}
                  </button>
                ))}
              </div>

              <ContextHoverTooltip tooltip={<ExpeditionTooltip expedition={selectedExpedition} />}>
                <button
                  className="ui-academy__launch-button"
                  type="button"
                  disabled={selectedExpedition.startState !== "available" || selectedDuration === undefined}
                  onClick={handleExpeditionStart}
                >
                  {selectedExpedition.startState === "available"
                    ? "Lancer l’expédition"
                    : expeditionStatusLabel(selectedExpedition)}
                </button>
              </ContextHoverTooltip>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
