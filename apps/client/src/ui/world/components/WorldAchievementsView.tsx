import { useCallback, useState } from "react";
import type { GameBridgeState } from "../../../game/GameBridge.js";
import { DUNGEON_DEFINITIONS } from "../../../data/dungeonContentCatalog.js";
import { FACTION_ACHIEVEMENT_FACTIONS } from "../../../data/factionAchievementContentCatalog.js";
import { useGameServices } from "../../../state/GameContext.js";
import { shallowEqual, useGameUiSelector } from "../../state/useGameUiSelector.js";
import "./WorldAchievementsView.css";

const DUNGEON_TIERS = [...new Set(DUNGEON_DEFINITIONS.map((dungeon) => dungeon.tier))].sort((a, b) => a - b);

interface AchievementRevision {
  readonly enemiesKilled: number;
  readonly inventory: GameBridgeState["inventory"];
  readonly wallet: GameBridgeState["wallet"];
  readonly progression: GameBridgeState["progression"];
  readonly world: GameBridgeState["world"];
}

interface AchievementProgressRow {
  readonly definition: {
    readonly id: string;
    readonly title: string;
  };
  readonly current: number;
  readonly target: number;
  readonly completed: boolean;
}

function sameNumberArray(previous: readonly number[], next: readonly number[]): boolean {
  return previous.length === next.length && previous.every((value, index) => value === next[index]);
}

function selectAchievementRevision(state: GameBridgeState): AchievementRevision {
  return {
    enemiesKilled: state.enemiesKilled,
    inventory: state.inventory,
    wallet: state.wallet,
    progression: state.progression,
    world: state.world,
  };
}

function AchievementRow({ progress }: { readonly progress: AchievementProgressRow }): JSX.Element {
  return (
    <article className={`world-achievement${progress.completed ? " is-complete" : ""}`}>
      <span className="world-achievement__mark" aria-hidden="true">{progress.completed ? "✓" : "○"}</span>
      <div className="world-achievement__copy">
        <strong>{progress.definition.title}</strong>
        <small>{progress.current} / {progress.target}</small>
      </div>
      <span className="world-achievement__state">{progress.completed ? "Validé" : "À accomplir"}</span>
    </article>
  );
}

export function WorldAchievementsView(): JSX.Element {
  const { getDungeonState, getFactionAchievements } = useGameServices();
  const [selectedFactionId, setSelectedFactionId] = useState(FACTION_ACHIEVEMENT_FACTIONS[0]?.id ?? "keeper");
  const selectClearedTiers = useCallback((_state: GameBridgeState): readonly number[] => (
    getDungeonState().clearedTiers
  ), [getDungeonState]);
  const clearedTiers = useGameUiSelector(selectClearedTiers, sameNumberArray);
  useGameUiSelector(selectAchievementRevision, shallowEqual);

  const factionAchievementProgress = getFactionAchievements();
  const factionProgress = factionAchievementProgress.filter((entry) => (
    entry.definition.group === "faction" && entry.definition.factionId === selectedFactionId
  ));
  const expeditionProgress = factionAchievementProgress.filter((entry) => (
    entry.definition.group === "expedition"
  ));

  const completedDungeonCount = DUNGEON_TIERS.filter((tier) => clearedTiers.includes(tier)).length;
  const completedFeatureCount = factionAchievementProgress.filter((entry) => entry.completed).length;
  const completedCount = completedDungeonCount + completedFeatureCount;
  const totalCount = DUNGEON_TIERS.length + factionAchievementProgress.length;
  const selectedFaction = FACTION_ACHIEVEMENT_FACTIONS.find((entry) => entry.id === selectedFactionId);

  return (
    <section className="world-achievements-progress">
      <header className="world-achievements-progress__header">
        <div>
          <small>PROGRESSION DU MONDE</small>
          <h2>Succès</h2>
        </div>
        <strong>{completedCount} / {totalCount}</strong>
      </header>

      <section className="world-achievements-progress__group" aria-labelledby="world-achievements-dungeons">
        <div className="world-achievements-progress__group-heading">
          <div>
            <small>MONDE</small>
            <h3 id="world-achievements-dungeons">Conquête des tiers</h3>
          </div>
          <span>{completedDungeonCount} / {DUNGEON_TIERS.length} validés</span>
        </div>

        <div className="world-achievements-progress__list">
          {DUNGEON_TIERS.map((tier, index) => {
            const completed = clearedTiers.includes(tier);
            const previousTier = DUNGEON_TIERS[index - 1];
            const unlocked = previousTier === undefined || clearedTiers.includes(previousTier);
            return (
              <article
                key={tier}
                className={`world-achievement${completed ? " is-complete" : ""}${!completed && !unlocked ? " is-locked" : ""}`}
              >
                <span className="world-achievement__mark" aria-hidden="true">{completed ? "✓" : unlocked ? "○" : "◆"}</span>
                <div className="world-achievement__copy">
                  <strong>Valider un donjon T{tier}</strong>
                  <small>
                    {completed
                      ? `Donjon T${tier} validé.`
                      : unlocked
                        ? `Terminez un donjon T${tier} pour valider ce succès.`
                        : `Validez d'abord un donjon T${previousTier}.`}
                  </small>
                </div>
                <span className="world-achievement__state">{completed ? "Validé" : unlocked ? "À accomplir" : "Verrouillé"}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="world-achievements-progress__group" aria-labelledby="world-achievements-factions">
        <div className="world-achievements-progress__group-heading">
          <div>
            <small>FACTIONS</small>
            <h3 id="world-achievements-factions">{selectedFaction?.label ?? "Faction"}</h3>
          </div>
          <span>{factionProgress.filter((entry) => entry.completed).length} / {factionProgress.length} validés</span>
        </div>

        <div className="world-achievements-progress__filters" role="tablist" aria-label="Filtrer les succès par faction">
          {FACTION_ACHIEVEMENT_FACTIONS.map((faction) => (
            <button
              key={faction.id}
              type="button"
              role="tab"
              aria-selected={selectedFactionId === faction.id}
              className={selectedFactionId === faction.id ? "is-active" : ""}
              onClick={() => { setSelectedFactionId(faction.id); }}
            >
              {faction.label}
            </button>
          ))}
        </div>

        <div className="world-achievements-progress__list">
          {factionProgress.map((progress) => (
            <AchievementRow key={progress.definition.id} progress={progress} />
          ))}
        </div>
      </section>

      <section className="world-achievements-progress__group" aria-labelledby="world-achievements-expeditions">
        <div className="world-achievements-progress__group-heading">
          <div>
            <small>EXPÉDITIONS</small>
            <h3 id="world-achievements-expeditions">Progression globale</h3>
          </div>
          <span>{expeditionProgress.filter((entry) => entry.completed).length} / {expeditionProgress.length} validés</span>
        </div>

        <div className="world-achievements-progress__list">
          {expeditionProgress.map((progress) => (
            <AchievementRow key={progress.definition.id} progress={progress} />
          ))}
        </div>
      </section>
    </section>
  );
}
