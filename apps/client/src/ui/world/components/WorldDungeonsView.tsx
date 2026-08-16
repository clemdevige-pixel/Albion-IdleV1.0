import { useCallback } from "react";
import { DUNGEON_DEFINITIONS } from "../../../data/dungeonContentCatalog.js";
import { useGameServices } from "../../../state/GameContext.js";
import { useGameUiSelector } from "../../state/useGameUiSelector.js";
import "./WorldDungeonsView.css";

interface DungeonPresentationModel {
  readonly inventory: Readonly<Record<string, number>>;
  readonly active: boolean;
  readonly enemyName: string;
  readonly combatState: string;
}

function inventoryQuantities(
  slots: readonly { readonly itemId: string | undefined; readonly quantity: number }[],
): Readonly<Record<string, number>> {
  const quantities: Record<string, number> = {};
  for (const slot of slots) {
    if (slot.itemId === undefined || slot.quantity <= 0) continue;
    quantities[slot.itemId] = (quantities[slot.itemId] ?? 0) + slot.quantity;
  }
  return quantities;
}

function sameDungeonPresentation(
  previous: DungeonPresentationModel,
  next: DungeonPresentationModel,
): boolean {
  if (
    previous.active !== next.active
    || previous.enemyName !== next.enemyName
    || previous.combatState !== next.combatState
  ) return false;

  const previousKeys = Object.keys(previous.inventory);
  const nextKeys = Object.keys(next.inventory);
  return previousKeys.length === nextKeys.length
    && previousKeys.every((key) => previous.inventory[key] === next.inventory[key]);
}

export function WorldDungeonsView(): JSX.Element {
  const { startDungeon, abandonDungeon, isDungeonActive } = useGameServices();
  const selectDungeonPresentation = useCallback((state): DungeonPresentationModel => ({
    inventory: inventoryQuantities(state.inventory.slots),
    active: isDungeonActive(),
    enemyName: state.enemyName,
    combatState: state.combatState,
  }), [isDungeonActive]);
  const presentation = useGameUiSelector(
    selectDungeonPresentation,
    sameDungeonPresentation,
  );

  return (
    <div className="world-dungeons">
      <header className="world-dungeons__intro">
        <small>Expéditions instanciées</small>
        <h2>Donjons</h2>
        <p>
          Une clé est consommée à l’entrée. Les PV et cooldowns persistent pendant toute la run,
          et l’équipement reste verrouillé jusqu’à la sortie.
        </p>
      </header>

      <div className="world-dungeons__list">
        {DUNGEON_DEFINITIONS.map((dungeon) => {
          const keyCount = presentation.inventory[dungeon.keyItemId] ?? 0;
          const canEnter = !presentation.active && keyCount > 0;
          const isActiveDungeon = presentation.active;

          return (
            <article
              key={dungeon.id}
              className={`world-dungeon-card${isActiveDungeon ? " is-active" : ""}`}
            >
              <header className="world-dungeon-card__header">
                <div>
                  <small>Donjon T{dungeon.tier}</small>
                  <h3>{dungeon.faction}</h3>
                </div>
                <span className={isActiveDungeon ? "is-running" : ""}>
                  {isActiveDungeon ? "En cours" : "Disponible"}
                </span>
              </header>

              <div className="world-dungeon-card__stats">
                <span><small>Difficulté cible</small><strong>T{dungeon.tier}.3+</strong></span>
                <span><small>Rencontres</small><strong>{dungeon.encounters.length}</strong></span>
                <span><small>Clés</small><strong>{keyCount}</strong></span>
              </div>

              <div className="world-dungeon-card__route" aria-label="Structure du donjon">
                {dungeon.encounters.map((encounter, index) => (
                  <span key={encounter.id} className={`world-dungeon-step world-dungeon-step--${encounter.kind}`}>
                    <b>{index + 1}</b>
                    <small>{encounter.kind === "boss" ? "Boss" : encounter.kind === "elite" ? "Élite" : "Normal"}</small>
                  </span>
                ))}
              </div>

              {isActiveDungeon ? (
                <div className="world-dungeon-card__current">
                  <small>Combat actuel</small>
                  <strong>{presentation.enemyName || "Préparation de la rencontre…"}</strong>
                </div>
              ) : null}

              <footer className="world-dungeon-card__footer">
                <p>
                  {isActiveDungeon
                    ? "Abandonner termine définitivement cette tentative."
                    : keyCount > 0
                      ? "La clé sera consommée immédiatement."
                      : "Une clé Keeper est requise pour entrer."}
                </p>
                {isActiveDungeon ? (
                  <button type="button" className="is-danger" onClick={() => { abandonDungeon(); }}>
                    Abandonner
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canEnter}
                    onClick={() => { startDungeon(dungeon.id); }}
                  >
                    {keyCount > 0 ? "Entrer" : "Clé requise"}
                  </button>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
