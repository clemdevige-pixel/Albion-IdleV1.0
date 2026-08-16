import { useCallback } from "react";
import type { GameBridgeState } from "../../../game/GameBridge.js";
import { useGameServices } from "../../../state/GameContext.js";
import { useGameUiSelector } from "../../state/useGameUiSelector.js";
import "./WorldDungeonsView.css";

interface DungeonPresentationModel {
  readonly inventory: Readonly<Record<string, number>>;
  readonly activeDefinitionId: string | null;
  readonly activeEncounterIndex: number | null;
  readonly pendingDefinitionId: string | null;
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
    previous.activeDefinitionId !== next.activeDefinitionId
    || previous.activeEncounterIndex !== next.activeEncounterIndex
    || previous.pendingDefinitionId !== next.pendingDefinitionId
    || previous.enemyName !== next.enemyName
    || previous.combatState !== next.combatState
  ) return false;

  const previousKeys = Object.keys(previous.inventory);
  const nextKeys = Object.keys(next.inventory);
  return previousKeys.length === nextKeys.length
    && previousKeys.every((key) => previous.inventory[key] === next.inventory[key]);
}

export function WorldDungeonsView(): JSX.Element {
  const { startDungeon, abandonDungeon, getDungeonState } = useGameServices();
  const dungeonDefinitions = getDungeonState().definitions;
  const selectDungeonPresentation = useCallback((state: GameBridgeState): DungeonPresentationModel => {
    const dungeonState = getDungeonState();
    const activeRun = dungeonState.activeRun?.status === "active"
      ? dungeonState.activeRun
      : undefined;
    return {
      inventory: inventoryQuantities(state.inventory.slots),
      activeDefinitionId: activeRun?.definitionId ?? null,
      activeEncounterIndex: activeRun?.encounterIndex ?? null,
      pendingDefinitionId: dungeonState.pendingDefinitionId,
      enemyName: state.enemyName,
      combatState: state.combatState,
    };
  }, [getDungeonState]);
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
        {dungeonDefinitions.map((dungeon) => {
          const keyCount = presentation.inventory[dungeon.keyItemId] ?? 0;
          const isActiveDungeon = presentation.activeDefinitionId === dungeon.id;
          const isPendingDungeon = presentation.pendingDefinitionId === dungeon.id;
          const canEnter = presentation.activeDefinitionId === null
            && presentation.pendingDefinitionId === null
            && keyCount > 0;

          return (
            <article
              key={dungeon.id}
              className={`world-dungeon-card${isActiveDungeon ? " is-active" : ""}${isPendingDungeon ? " is-pending" : ""}`}
            >
              <header className="world-dungeon-card__header">
                <div>
                  <small>Donjon T{dungeon.tier}</small>
                  <h3>{dungeon.faction}</h3>
                </div>
                <span className={isActiveDungeon ? "is-running" : isPendingDungeon ? "is-pending" : ""}>
                  {isActiveDungeon ? "En cours" : isPendingDungeon ? "Après ce segment" : "Disponible"}
                </span>
              </header>

              <div className="world-dungeon-card__stats">
                <span><small>Difficulté cible</small><strong>T{dungeon.tier}.3+</strong></span>
                <span><small>Rencontres</small><strong>{dungeon.encounters.length}</strong></span>
                <span><small>Clés</small><strong>{keyCount}</strong></span>
              </div>

              <div className="world-dungeon-card__route" aria-label="Structure du donjon">
                {dungeon.encounters.map((encounter, index) => {
                  const isCurrent = isActiveDungeon && presentation.activeEncounterIndex === index;
                  const isCompleted = isActiveDungeon
                    && presentation.activeEncounterIndex !== null
                    && index < presentation.activeEncounterIndex;
                  return (
                    <span
                      key={encounter.id}
                      className={`world-dungeon-step world-dungeon-step--${encounter.kind}${isCurrent ? " is-current" : ""}${isCompleted ? " is-completed" : ""}`}
                    >
                      <b>{isCompleted ? "✓" : index + 1}</b>
                      <small>{encounter.kind === "boss" ? "Boss" : encounter.kind === "elite" ? "Élite" : "Normal"}</small>
                    </span>
                  );
                })}
              </div>

              {isActiveDungeon ? (
                <div className="world-dungeon-card__current">
                  <small>Combat actuel · Rencontre {(presentation.activeEncounterIndex ?? 0) + 1}/{dungeon.encounters.length}</small>
                  <strong>{presentation.enemyName || "Préparation de la rencontre…"}</strong>
                </div>
              ) : isPendingDungeon ? (
                <div className="world-dungeon-card__current is-pending">
                  <small>Transition programmée</small>
                  <strong>Le segment actuel sera terminé avant l’entrée.</strong>
                </div>
              ) : null}

              <footer className="world-dungeon-card__footer">
                <p>
                  {isActiveDungeon
                    ? "Abandonner termine définitivement cette tentative."
                    : isPendingDungeon
                      ? "La clé sera consommée uniquement au moment de l’entrée."
                      : keyCount > 0
                        ? "En combat, l’entrée attendra la fin du segment actuel."
                        : `Une clé ${dungeon.faction} est requise pour entrer.`}
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
                    {isPendingDungeon ? "Entrée programmée" : keyCount > 0 ? "Entrer" : "Clé requise"}
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
