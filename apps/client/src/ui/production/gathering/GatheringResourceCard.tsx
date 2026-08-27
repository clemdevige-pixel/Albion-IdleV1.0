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
  const cycleLabel = heroActive ? "Restant" : "Cycle";

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
        <div><dt>Maîtrise</dt><dd>{String(activity.masteryLevel)}</dd></div>
        <div><dt>{cycleLabel}</dt><dd>{formatSeconds(remainingSeconds)}</dd></div>
        <div><dt>Accès</dt><dd>{activity.isMasteryUnlocked ? `T${String(tier)} débloqué` : `Niveau ${String(activity.requiredMasteryLevel)} requis`}</dd></div>
      </dl>

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
                : activity.isMasteryUnlocked ? "Disponible" : "Bloqué"}
          </b>
        </header>

        <div className="ui-gathering-card__mastery">
          <div>
            <span>Maîtrise {String(heroMastery.level)}</span>
            <small>{String(heroMastery.currentXp)} / {String(heroMastery.xpToNextLevel)} XP</small>
          </div>
          <ProgressBar value={heroMastery.progressPercent} />
        </div>

        <div className="ui-gathering-card__cycle">
          <div>
            <span>{heroActive ? `Cycle · ${formatSeconds(remainingSeconds)}` : `Cycle · ${formatSeconds(activity.durationSeconds)}`}</span>
            <small>{heroActive ? `${String(Math.round(cycleProgress))}%` : "Prêt"}</small>
          </div>
          <ProgressBar value={cycleProgress} />
        </div>

        <button
          className={`ui-gathering-card__hero-action${heroActive ? " is-stop" : ""}`}
          type="button"
          disabled={!heroActive && !activity.isMasteryUnlocked}
          onClick={() => { actions.toggleHero(resource.id); }}
        >
          {heroActive ? "Arrêter la récolte" : "Récolter avec le héros"}
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
