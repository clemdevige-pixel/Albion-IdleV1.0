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
        <span className={activity.isMasteryUnlocked ? "is-unlocked" : "is-locked"}>
          <small>Accès</small>
          <b>{activity.isMasteryUnlocked ? `T${String(tier)}` : `Niv. ${String(activity.requiredMasteryLevel)}`}</b>
        </span>
      </div>

      <section className="ui-gathering-card__activity">
        <header className="ui-gathering-card__activity-header">
          <div>
            <span>Héros</span>
            <strong>Récolte du {resource.label.toLocaleLowerCase("fr-FR")}</strong>
          </div>
          <b className={heroActive || otherTierActive ? "is-active" : ""}>
            {heroActive
              ? "En récolte"
              : otherTierActive
                ? `T${String(activity.activeCycle?.resourceTier)} en cours`
                : activity.isMasteryUnlocked ? "Prêt" : "Bloqué"}
          </b>
        </header>

        <div className="ui-gathering-card__mastery-row">
          <div className="ui-gathering-card__progress-label">
            <span>Maîtrise {String(heroMastery.level)}</span>
            <small>{String(heroMastery.currentXp)} / {String(heroMastery.xpToNextLevel)} XP</small>
          </div>
          <ProgressBar value={heroMastery.progressPercent} />
        </div>

        <div className={`ui-gathering-card__cycle-focus${heroActive ? " is-running" : ""}`}>
          <div className="ui-gathering-card__cycle-copy">
            <span>{heroActive ? "Cycle en cours" : "Prochain cycle"}</span>
            <strong>{formatSeconds(heroActive ? remainingSeconds : activity.durationSeconds)}</strong>
          </div>
          <div className="ui-gathering-card__cycle-progress">
            <ProgressBar value={cycleProgress} />
            <small>{heroActive ? `${String(Math.round(cycleProgress))}%` : "Prêt"}</small>
          </div>
        </div>

        <div className="ui-gathering-card__actions">
          <button
            className={`ui-gathering-card__hero-action${heroActive ? " is-stop" : ""}`}
            type="button"
            disabled={!heroActive && !activity.isMasteryUnlocked}
            onClick={() => { actions.toggleHero(resource.id); }}
          >
            {heroActive ? "Arrêter" : "Commencer la récolte"}
          </button>
        </div>

        {heroActive && activity.activeMiniGame !== undefined && (
          <div className="ui-gathering-card__active-game">
            <ActiveGatheringGame
              cycleId={activity.activeMiniGame.cycleId}
              strikesUsed={activity.activeMiniGame.strikesUsed}
              activity={activity.activeMiniGame.activity}
              yieldMultiplier={activity.activeMiniGame.yieldMultiplier}
              speedBonusRatio={activity.activeMiniGame.speedBonusRatio}
              nextActivityThreshold={activity.activeMiniGame.nextActivityThreshold}
              activityProgressToNext={activity.activeMiniGame.activityProgressToNext}
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
