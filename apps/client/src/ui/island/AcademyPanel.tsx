import { useState } from "react";
import { getAcademyResearchTier } from "@game/data";
import type { ExpeditionDurationMs } from "@game/gameplay";
import {
  getExpeditionPresentationInfo,
  SILVER_EXPEDITION_TYPE_ID,
} from "../../data/expeditionContentCatalog";
import {
  getResearchPresentationGroup,
  getResearchPresentationInfo,
  type ResearchPresentationGroup,
} from "../../data/researchContentCatalog";
import type {
  AcademyExpeditionEntryModel,
  AcademyResearchEntryModel,
} from "../../runtime/bootstrap/createAcademyPresentationFoundation";
import { useGameBridge, useGameServices } from "../../state/GameContext";
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
    <ContextHoverTooltip tooltip={<ResearchTooltip research={research} />}>
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

        {!compact && research.relicGateState === "ready" && research.state === "locked" && onAction !== undefined && (
          <button className="ui-academy__action" type="button" onClick={() => { onAction(research); }}>
            Envoyer la relique
          </button>
        )}
        {!compact && research.state === "available" && onAction !== undefined && (
          <button className="ui-academy__action" type="button" onClick={() => { onAction(research); }}>
            Lancer
          </button>
        )}
      </article>
    </ContextHoverTooltip>
  );
}

function ExpeditionTooltip({ expedition }: { readonly expedition: AcademyExpeditionEntryModel }): JSX.Element {
  const info = getExpeditionPresentationInfo(expedition.id);
  const requirement = expedition.typeId === SILVER_EXPEDITION_TYPE_ID
    ? `Cartographie T${String(expedition.tier)}`
    : `Étude de faction + Cartographie T${String(expedition.tier)}`;
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

function ActiveExpeditionRow({ expedition }: { readonly expedition: AcademyExpeditionEntryModel }): JSX.Element {
  const info = getExpeditionPresentationInfo(expedition.id);
  return (
    <ContextHoverTooltip tooltip={<ExpeditionTooltip expedition={expedition} />}>
      <div className="ui-academy__active-row">
        <div>
          <small>Slot {String((expedition.activeSlotIndex ?? 0) + 1)} · {expeditionKindLabel(expedition)}</small>
          <strong>{expedition.displayName}</strong>
        </div>
        <div>
          <b>{expedition.remainingDurationMs === undefined ? "Active" : formatDuration(expedition.remainingDurationMs)}</b>
          {info !== undefined && <small>{info.rewardSummary}</small>}
        </div>
      </div>
    </ContextHoverTooltip>
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
  const [view, setView] = useState<AcademyView>("research");
  const [researchScope, setResearchScope] = useState<ResearchPresentationGroup>("core");
  const [showResearchHistory, setShowResearchHistory] = useState(false);
  const [requestedExpeditionTier, setRequestedExpeditionTier] = useState<number | undefined>();
  const [requestedExpeditionId, setRequestedExpeditionId] = useState<string | undefined>();
  const [requestedDuration, setRequestedDuration] = useState<ExpeditionDurationMs | undefined>();

  const model = getAcademyModel();
  const researchTier = getAcademyResearchTier(level);
  const selectedExpeditionTier = requestedExpeditionTier ?? researchTier ?? 4;
  const availableTiers = ACADEMY_TIERS.filter((tier) => researchTier !== undefined && tier <= researchTier);
  const completedResearch = model.research.filter((entry) => entry.state === "completed");
  const activeResearch = model.research.find((entry) => entry.state === "active");
  const availableResearch = model.research.filter((entry) => (
    entry.state !== "completed"
    && entry.state !== "active"
    && getResearchPresentationGroup(entry.id) === researchScope
  ));
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
    setFeedback(
      result.ok && result.action === "relic_examined"
        ? "Relique envoyée à l’Académie et examinée."
        : result.ok
          ? `${entry.displayName} lancée.`
          : researchFailureMessage(result.reason),
    );
  };

  const handleExpeditionStart = (): void => {
    if (selectedExpedition === undefined || selectedDuration === undefined) return;
    const result = startAcademyExpedition(selectedExpedition.id, selectedDuration);
    setFeedback(result.ok ? `${selectedExpedition.displayName} lancée.` : expeditionFailureMessage(result.reason));
  };

  return (
    <div className="ui-academy">
      <div className="ui-academy__summary">
        <div>
          <span className="ui-island__eyebrow">Académie</span>
          <strong>{researchTier === undefined ? "Tier non authoré" : `Recherche T${String(researchTier)}`}</strong>
        </div>
        <span>{activeResearch === undefined ? "Recherche inactive" : `${activeResearch.displayName} en cours`}</span>
      </div>

      <nav className="ui-academy__main-tabs" aria-label="Académie">
        <button type="button" className={view === "research" ? "is-active" : ""} onClick={() => { setView("research"); }}>
          Recherches
        </button>
        <button type="button" className={view === "expeditions" ? "is-active" : ""} onClick={() => { setView("expeditions"); }}>
          Expéditions
        </button>
      </nav>

      {feedback !== null && <div className="ui-academy__feedback" role="status">{feedback}</div>}

      {view === "research" ? (
        <section className="ui-academy__section">
          <header>
            <div>
              <strong>Recherches</strong>
              <small>La liste principale montre uniquement ce qu’il reste à accomplir.</small>
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
              {activeResearch !== undefined && (
                <div className="ui-academy__active-research">
                  <span className="ui-island__eyebrow">En cours</span>
                  <ResearchRow research={activeResearch} />
                </div>
              )}

              <nav className="ui-academy__sub-tabs" aria-label="Famille de recherche">
                <button
                  type="button"
                  className={researchScope === "core" ? "is-active" : ""}
                  onClick={() => { setResearchScope("core"); }}
                >
                  Général
                </button>
                <button
                  type="button"
                  className={researchScope === "faction" ? "is-active" : ""}
                  onClick={() => { setResearchScope("faction"); }}
                >
                  Factions
                </button>
              </nav>

              <div className="ui-academy__research-list">
                {availableResearch.length === 0 ? (
                  <div className="ui-island__selection-status">Aucune recherche restante dans cette catégorie.</div>
                ) : availableResearch.map((entry) => (
                  <ResearchRow key={entry.id} research={entry} onAction={handleResearchAction} />
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="ui-academy__section">
          <header>
            <div>
              <strong>Expéditions</strong>
              <small>Choisissez un tier, une expédition et une durée avant de lancer.</small>
            </div>
            <span>{String(activeExpeditions.length)} / {String(model.expeditionSlotCapacity)} actifs</span>
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
              {activeExpeditions.map((entry) => <ActiveExpeditionRow key={entry.id} expedition={entry} />)}
            </div>
          )}

          <nav className="ui-academy__tier-tabs" aria-label="Tier d’expédition">
            {ACADEMY_TIERS.map((tier) => {
              const locked = !availableTiers.includes(tier);
              return (
                <button
                  key={tier}
                  type="button"
                  className={selectedExpeditionTier === tier ? "is-active" : ""}
                  disabled={locked}
                  title={locked ? `Académie T${String(tier)} requise` : undefined}
                  onClick={() => {
                    setRequestedExpeditionTier(tier);
                    setRequestedExpeditionId(undefined);
                    setRequestedDuration(undefined);
                  }}
                >
                  T{String(tier)}{locked ? " 🔒" : ""}
                </button>
              );
            })}
          </nav>

          <div className="ui-academy__expedition-browser">
            <div className="ui-academy__expedition-list" role="listbox" aria-label="Expédition">
              {tierExpeditions.map((entry) => {
                const info = getExpeditionPresentationInfo(entry.id);
                const selected = entry.id === selectedExpedition?.id;
                return (
                  <ContextHoverTooltip key={entry.id} tooltip={<ExpeditionTooltip expedition={entry} />}>
                    <button
                      type="button"
                      className={`ui-academy__expedition-option${selected ? " is-selected" : ""}`}
                      onClick={() => {
                        setRequestedExpeditionId(entry.id);
                        setRequestedDuration(undefined);
                      }}
                    >
                      <span>
                        <small>{expeditionKindLabel(entry)}</small>
                        <strong>{entry.displayName}</strong>
                      </span>
                      <span>
                        <b>{info?.rewardSummary ?? "Récompense non renseignée"}</b>
                        <small>{expeditionStatusLabel(entry)}</small>
                      </span>
                    </button>
                  </ContextHoverTooltip>
                );
              })}
            </div>

            {selectedExpedition !== undefined && (
              <div className="ui-academy__expedition-launcher">
                <div className="ui-academy__launcher-summary">
                  <span className="ui-island__eyebrow">Sélection</span>
                  <strong>{selectedExpedition.displayName}</strong>
                  <small>{selectedExpeditionInfo?.rewardSummary ?? "Récompense non renseignée"}</small>
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

                <button
                  className="ui-academy__launch-button"
                  type="button"
                  disabled={selectedExpedition.startState !== "available" || selectedDuration === undefined}
                  title={selectedExpedition.startState === "available" ? undefined : expeditionStatusLabel(selectedExpedition)}
                  onClick={handleExpeditionStart}
                >
                  {selectedExpedition.startState === "available"
                    ? "Lancer l’expédition"
                    : expeditionStatusLabel(selectedExpedition)}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
