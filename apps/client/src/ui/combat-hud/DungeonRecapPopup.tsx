import type { DungeonAccessState } from "../../state/DungeonNavigationActions.js";
import type { DungeonCompletionRecapModel } from "../../runtime/DungeonCompletionFlow.js";
import { dungeonCompletionFlow } from "../../runtime/DungeonCompletionFlow.js";
import { useGameServices } from "../../state/GameContext.js";
import "./expeditionRecap.css";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

function replayUnavailableLabel(access: DungeonAccessState): string | undefined {
  if (access.canEnter) return undefined;
  if (access.reason === "missing_key") return "Clé requise pour relancer";
  if (access.reason === "weapon_required") return "Arme requise";
  if (access.reason === "equipment_tier_locked") return "Équipement incompatible";
  return "Relance indisponible";
}

export function DungeonRecapPopup({
  recap,
}: {
  readonly recap: DungeonCompletionRecapModel;
}): JSX.Element {
  const services = useGameServices();
  const replayAccess = services.getDungeonState().getAccess(recap.dungeonDefinitionId);
  const replayUnavailable = replayUnavailableLabel(replayAccess);
  const rewardRows = [
    { label: "Silver", value: recap.rewards.silver },
    { label: "Fragments d’artefact", value: recap.rewards.artifactFragments },
    { label: "Éclats d’enchantement", value: recap.rewards.enchantmentShards },
    { label: "Runes de faction", value: recap.rewards.factionRunes },
    { label: "Artefacts", value: recap.rewards.artifacts },
  ].filter((entry) => entry.value > 0);

  return (
    <div className="expedition-recap-backdrop dungeon-recap-backdrop" role="presentation">
      <section
        className="expedition-recap"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dungeon-recap-title"
      >
        <header className="expedition-recap__header">
          <div>
            <span>Donjon · Fin d’expédition</span>
            <h2 id="dungeon-recap-title">Donjon terminé</h2>
          </div>
          <span className="expedition-recap__counter">T{String(recap.tier)}</span>
        </header>

        <article className="expedition-recap__item">
          <div className="expedition-recap__title-row">
            <div>
              <small>Boss vaincu</small>
              <strong>{recap.faction}</strong>
            </div>
            <span className="expedition-recap__duration">{formatDuration(recap.durationMs)}</span>
          </div>

          <div className="expedition-recap__quality expedition-recap__quality--exceptionnelle">
            <span>Résultat</span>
            <strong>Donjon nettoyé</strong>
          </div>

          <div className="expedition-recap__loot" aria-label="Récompenses obtenues">
            {rewardRows.length > 0 ? rewardRows.map((reward) => (
              <div key={reward.label} className="expedition-recap__loot-row">
                <span>{reward.label}</span>
                <strong>+ {formatNumber(reward.value)}</strong>
              </div>
            )) : (
              <div className="expedition-recap__loot-row">
                <span>Récompenses</span>
                <strong>Aucun loot</strong>
              </div>
            )}
          </div>
        </article>

        <footer className="expedition-recap__footer dungeon-recap__footer">
          <small>Récompenses déjà créditées.</small>
          <div className="dungeon-recap__actions">
            <button
              type="button"
              disabled={!replayAccess.canEnter}
              title={replayUnavailable}
              onClick={() => {
                if (services.startDungeon(recap.dungeonDefinitionId)) {
                  dungeonCompletionFlow.dismissForReplay();
                }
              }}
            >
              Relancer le donjon
            </button>
            <button
              type="button"
              className="is-primary"
              onClick={() => { dungeonCompletionFlow.resumeExploration(); }}
            >
              Reprendre l’exploration
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
