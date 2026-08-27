import type { ProductionTier } from "../../../data/productionFamilyCatalog";
import { ActiveGatheringGame } from "../../../hud/ActiveGatheringGame";
import type { GatheringResourceModel } from "./gatheringModels";
import type { GatheringActions } from "./useGatheringActions";

interface GatheringResourceCardProps {
  readonly resource: GatheringResourceModel;
  readonly tier: ProductionTier;
  readonly actions: GatheringActions;
}

export function GatheringResourceCard({ resource, tier, actions }: GatheringResourceCardProps): JSX.Element {
  const { activity, heroMastery } = resource;
  const heroActive = activity.status === "gathering"
    && activity.activeCycle?.resourceTier === tier;
  const otherTierActive = activity.activeCycle !== undefined && !heroActive;
  const cycleProgress = heroActive ? Math.max(0, Math.min(100, activity.progress)) : 0;
  const remainingSeconds = heroActive
    ? Math.max(0, activity.durationSeconds * (1 - cycleProgress / 100))
    : activity.durationSeconds;

  return (
    <article className={`ui-gathering-card${heroActive ? " is-active" : ""}`}>
      <header className="ui-gathering-card__header">
        <div className="ui-gathering-card__icon"><img src={`/assets/resources/${resource.icon}`} alt="" /></div>
        <div className="ui-gathering-card__identity">
          <span>Ressource T{String(tier)}</span>
          <strong>{activity.resourceName}</strong>
          <small>{activity.isMasteryUnlocked ? "Disponible" : "Palier verrouillé"}</small>
        </div>
        <div className="ui-gathering-card__reserve">
          <small>Réserve</small>
          <b>{String(activity.storedQuantity)}</b>
        </div>
      </header>

      <div className="ui-gathering-card__meta" aria-label="Informations de récolte">
        <span><small>Maîtrise</small><b>{String(activity.masteryLevel)}</b></span>
        <i aria-hidden="true" />
        <span><small>{heroActive ? "Restant" : "Cycle"}</small><b>{formatSeconds(remainingSeconds)}</b></span>
        <i aria-hidden="true" />
        <span className={activity.isMasteryUnlocked ? "is-unlocked" : "is-locked"}>
          <small>Accès</small>
          <b>{activity.isMasteryUnlocked ? `T${String(tier)} débloqué` : `Niv. ${String(activity.requiredMasteryLevel)} requis`}</b>
        </span>
      </div>

      <section className="ui-gathering-card__activity">
        <header className="ui-gathering-card__activity-header">
          <div>
            <span>Activité du héros</span>
            <strong>Récolte du {resource.label.toLocaleLowerCase("fr-FR")}</strong>
          </div>
          <b className={heroActive || otherTierActive ? "is-active" : ""}>
            {heroActive
              ? "En récolte"
              : otherTierActive
                ? `T${String(activity.activeCycle?.resourceTier)} en cours`
                : activity.isMasteryUnlocked ? "Disponible" : "Bloqué"}
          </b>
        </header>

        <div className="ui-gathering-card__progress-block">
          <div className="ui-gathering-card__progress-label">
            <span>Maîtrise {String(heroMastery.level)}</span>
            <small>{String(heroMastery.currentXp)} / {String(heroMastery.xpToNextLevel)} XP</small>
          </div>
          <ProgressBar value={heroMastery.progressPercent} />
        </div>

        <div className="ui-gathering-card__progress-block ui-gathering-card__progress-block--cycle">
          <div className="ui-gathering-card__progress-label">
            <span>{heroActive ? `Cycle en cours · ${formatSeconds(remainingSeconds)}` : `Cycle · ${formatSeconds(activity.durationSeconds)}`}</span>
            <small>{heroActive ? `${String(Math.round(cycleProgress))}%` : "Prêt"}</small>
          </div>
          <ProgressBar value={cycleProgress} />
        </div>

        <div className="ui-gathering-card__actions">
          <button
            className={`ui-gathering-card__hero-action${heroActive ? " is-stop" : ""}`}
            type="button"
            disabled={!heroActive && !activity.isMasteryUnlocked}
            onClick={() => { actions.toggleHero(resource.id); }}
          >
            {heroActive ? "Arrêter la récolte" : "Récolter avec le héros"}
          </button>
        </div>

        {heroActive && activity.activeMiniGame !== undefined && (
          <div className="ui-gathering-card__active-game">
            <ActiveGatheringGame
              cycleId={activity.activeMiniGame.cycleId}
              strikesUsed={activity.activeMiniGame.strikesUsed}
              durationSeconds={activity.durationSeconds}
              onStrike={(quality) => actions.strike(activity.resourceFamily, quality)}
            />
          </div>
        )}
      </section>
    </article>
  );
}

function ProgressBar({ value }: { readonly value: number }): JSX.Element {
  const progress = Math.max(0, Math.min(100, value));
  return <div className="ui-gathering-progress" aria-label={`${String(Math.round(progress))}%`}><span style={{ width: `${String(progress)}%` }} /></div>;
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const clamped = Math.max(0, value);
  return `${clamped.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
}
