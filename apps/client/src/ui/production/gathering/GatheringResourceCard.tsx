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
        <ProgressBar value={heroActive ? activity.progress : 0} />
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
