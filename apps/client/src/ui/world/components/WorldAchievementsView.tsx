import { useCallback } from "react";
import type { GameBridgeState } from "../../../game/GameBridge.js";
import { DUNGEON_DEFINITIONS } from "../../../data/dungeonContentCatalog.js";
import { useGameServices } from "../../../state/GameContext.js";
import { useGameUiSelector } from "../../state/useGameUiSelector.js";
import "./WorldAchievementsView.css";

const DUNGEON_TIERS = [...new Set(DUNGEON_DEFINITIONS.map((dungeon) => dungeon.tier))].sort((a, b) => a - b);

function sameNumberArray(previous: readonly number[], next: readonly number[]): boolean {
  return previous.length === next.length && previous.every((value, index) => value === next[index]);
}

export function WorldAchievementsView(): JSX.Element {
  const { getDungeonState } = useGameServices();
  const selectClearedTiers = useCallback((_state: GameBridgeState): readonly number[] => (
    getDungeonState().clearedTiers
  ), [getDungeonState]);
  const clearedTiers = useGameUiSelector(selectClearedTiers, sameNumberArray);
  const completedCount = DUNGEON_TIERS.filter((tier) => clearedTiers.includes(tier)).length;

  return (
    <section className="world-achievements-progress">
      <header className="world-achievements-progress__header">
        <div>
          <small>PROGRESSION DU MONDE</small>
          <h2>Succès</h2>
        </div>
        <strong>{completedCount} / {DUNGEON_TIERS.length}</strong>
      </header>

      <section className="world-achievements-progress__group" aria-labelledby="world-achievements-dungeons">
        <div className="world-achievements-progress__group-heading">
          <div>
            <small>DONJONS</small>
            <h3 id="world-achievements-dungeons">Conquête des tiers</h3>
          </div>
          <span>{completedCount} / {DUNGEON_TIERS.length} validés</span>
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
    </section>
  );
}
