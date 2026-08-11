import { useState } from "react";
import { ActiveGatheringGame } from "../../../hud/ActiveGatheringGame";
import { WORKER_PROFESSION_LABELS } from "../../../data/productionFamilyCatalog";
import type { GatheringResourceModel } from "./gatheringModels";
import type { GatheringActions } from "./useGatheringActions";

interface GatheringResourceCardProps {
  readonly resource: GatheringResourceModel;
  readonly tier: 3 | 4;
  readonly recruitmentCost: number;
  readonly actions: GatheringActions;
}

export function GatheringResourceCard({ resource, tier, recruitmentCost, actions }: GatheringResourceCardProps): JSX.Element {
  const [confirmRecruitment, setConfirmRecruitment] = useState(false);
  const { activity, heroMastery, worker } = resource;
  const heroActive = activity.status === "gathering";
  const otherTierActive = activity.activeCycle !== undefined && !heroActive;
  const workerMasteryBlocked = worker !== undefined
    && worker.mastery < activity.requiredMasteryLevel
    && !(worker.state === "working" && worker.productionTier === tier);

  return (
    <article className={`ui-gathering-card${heroActive ? " is-active" : ""}`}>
      <header className="ui-gathering-card__header">
        <div className="ui-gathering-card__icon"><img src={`/assets/resources/${resource.icon}`} alt="" /></div>
        <div className="ui-gathering-card__identity">
          <span>{resource.label} · Ressource T{String(tier)}</span>
          <strong>{activity.resourceName}</strong>
          <small>{activity.isMasteryUnlocked ? "Disponible" : "Palier verrouillé"}</small>
        </div>
        <div className="ui-gathering-card__reserve"><small>Réserve</small><b>{String(activity.storedQuantity)}</b></div>
      </header>

      <dl className="ui-gathering-card__facts">
        <div><dt>Outil</dt><dd>{resource.tool}</dd></div>
        <div><dt>Maîtrise</dt><dd>{String(activity.masteryLevel)}</dd></div>
        <div><dt>Rendement</dt><dd>1 par cycle</dd></div>
        <div><dt>Accès</dt><dd>{activity.isMasteryUnlocked ? `T${String(tier)} débloqué` : `Niveau ${String(activity.requiredMasteryLevel)} requis`}</dd></div>
      </dl>

      <section className="ui-gathering-card__role ui-gathering-card__role--hero">
        <header>
          <div><span>Héros</span><small>{resource.tool}</small></div>
          <b>Maîtrise {String(heroMastery.level)}</b>
        </header>
        <div className="ui-gathering-card__mastery">
          <div>
            <span>Récolte du {resource.label.toLocaleLowerCase("fr-FR")}</span>
            <small>{String(heroMastery.currentXp)} / {String(heroMastery.xpToNextLevel)} XP</small>
          </div>
          <ProgressBar value={heroMastery.progressPercent} />
        </div>
        <header className="ui-gathering-card__hero-status">
          <small>Rendement : 1 / cycle</small>
          <b className={heroActive || otherTierActive ? "is-active" : ""}>
            {heroActive
              ? "En récolte"
              : otherTierActive
                ? `T${String(activity.activeCycle?.resourceTier)} en cours`
                : activity.isMasteryUnlocked ? "Disponible" : "Bloqué"}
          </b>
        </header>
        <ProgressBar value={activity.progress} />
        <button
          className={`ui-gathering-card__hero-action${heroActive || otherTierActive ? " is-stop" : ""}`}
          type="button"
          disabled={!heroActive && !otherTierActive && !activity.isMasteryUnlocked}
          onClick={() => { actions.toggleHero(resource.id); }}
        >
          {heroActive
            ? "Arrêter la récolte"
            : otherTierActive
              ? `Arrêter la récolte T${String(activity.activeCycle?.resourceTier)}`
              : "Récolter avec le héros"}
        </button>

        {heroActive && activity.activeMiniGame !== undefined && (
          <ActiveGatheringGame
            cycleId={activity.activeMiniGame.cycleId}
            strikesUsed={activity.activeMiniGame.strikesUsed}
            durationSeconds={activity.durationSeconds}
            onStrike={(quality) => actions.strike(activity.resourceFamily, quality)}
          />
        )}
      </section>

      <section className="ui-gathering-card__role ui-gathering-card__worker">
        <h3>Worker</h3>
        {worker === undefined ? (
          <>
            <div><span>Emplacement worker libre</span><small>{WORKER_PROFESSION_LABELS[resource.profession]} · Profession permanente</small></div>
            {confirmRecruitment ? (
              <div className="ui-gathering-card__confirm">
                <p>Recruter ce worker pour {String(recruitmentCost)} Silver ?</p>
                <button type="button" onClick={() => { if (actions.recruitWorker(resource.profession)) setConfirmRecruitment(false); }}>Confirmer</button>
                <button type="button" onClick={() => { setConfirmRecruitment(false); }}>Annuler</button>
              </div>
            ) : (
              <button type="button" onClick={() => { setConfirmRecruitment(true); }}>Recruter · {String(recruitmentCost)} S</button>
            )}
          </>
        ) : (
          <>
            <div className="ui-gathering-card__worker-summary">
              <div>
                <span>{worker.displayName} · {worker.professionName}</span>
                <small>T{String(worker.productionTier)} · Maîtrise {String(worker.mastery)} · {String(worker.yieldPerCycle)} / {String(worker.durationSeconds)} s</small>
              </div>
              <b className={`is-${worker.state}`}>{worker.state === "working" ? "Actif" : worker.state === "paused" ? "En pause" : "Disponible"}</b>
            </div>
            <ProgressBar value={worker.progress} />
            <small className="ui-gathering-card__worker-xp">{String(worker.masteryXp)} / {String(worker.masteryXpToNext)} XP worker</small>
            <button type="button" disabled={workerMasteryBlocked} onClick={() => { actions.toggleWorker(resource.profession); }}>
              {workerMasteryBlocked
                ? `Maîtrise ${String(activity.requiredMasteryLevel)} requise`
                : worker.productionTier !== tier
                  ? `Affecter au T${String(tier)}`
                  : worker.state === "working" ? "Mettre en pause" : "Lancer la production"}
            </button>
          </>
        )}
      </section>
    </article>
  );
}

function ProgressBar({ value }: { readonly value: number }): JSX.Element {
  const progress = Math.max(0, Math.min(100, value));
  return <div className="ui-gathering-progress" aria-label={`${String(Math.round(progress))}%`}><span style={{ width: `${String(progress)}%` }} /></div>;
}
