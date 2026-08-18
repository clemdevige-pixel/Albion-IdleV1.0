import { useCallback, useMemo, useState } from "react";
import type { GameBridgeState } from "../../../game/GameBridge.js";
import { DUNGEON_DEFINITIONS } from "../../../data/dungeonContentCatalog.js";
import type { DungeonKeyTier } from "../../../data/dungeonKeyContentCatalog.js";
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

const DUNGEON_TIERS: readonly DungeonKeyTier[] = [4, 5, 6, 7, 8];
const DUNGEON_VISUAL_SLUGS = { keeper: "keeper", heretic: "heretic", undead: "undead", morgana: "morgana" } as const;
const AUTHORED_DUNGEON_VISUAL_TIERS = new Set<number>([4, 5, 6]);

function dungeonVisual(faction: string, tier: number): string | undefined {
  if (!AUTHORED_DUNGEON_VISUAL_TIERS.has(tier)) return undefined;
  const key = faction.toLowerCase() as keyof typeof DUNGEON_VISUAL_SLUGS;
  const slug = DUNGEON_VISUAL_SLUGS[key];
  return slug === undefined ? undefined : `/assets/world/dungeons/${slug}-dungeon-t${String(tier)}.png`;
}

function inventoryQuantities(slots: readonly { readonly itemId: string | undefined; readonly quantity: number }[]): Readonly<Record<string, number>> {
  const quantities: Record<string, number> = {};
  for (const slot of slots) {
    if (slot.itemId === undefined || slot.quantity <= 0) continue;
    quantities[slot.itemId] = (quantities[slot.itemId] ?? 0) + slot.quantity;
  }
  return quantities;
}

function sameDungeonPresentation(previous: DungeonPresentationModel, next: DungeonPresentationModel): boolean {
  if (previous.activeDefinitionId !== next.activeDefinitionId || previous.activeEncounterIndex !== next.activeEncounterIndex || previous.pendingDefinitionId !== next.pendingDefinitionId || previous.enemyName !== next.enemyName || previous.combatState !== next.combatState) return false;
  const previousKeys = Object.keys(previous.inventory);
  const nextKeys = Object.keys(next.inventory);
  return previousKeys.length === nextKeys.length && previousKeys.every((key) => previous.inventory[key] === next.inventory[key]);
}

export function WorldDungeonsView(): JSX.Element {
  const { startDungeon, abandonDungeon, getDungeonState } = useGameServices();
  const [selectedTier, setSelectedTier] = useState<DungeonKeyTier>(4);
  const selectDungeonPresentation = useCallback((state: GameBridgeState): DungeonPresentationModel => {
    const dungeonState = getDungeonState();
    const activeRun = dungeonState.activeRun?.status === "active" ? dungeonState.activeRun : undefined;
    return {
      inventory: inventoryQuantities(state.inventory.slots), activeDefinitionId: activeRun?.definitionId ?? null,
      activeEncounterIndex: activeRun?.encounterIndex ?? null, pendingDefinitionId: dungeonState.pendingDefinitionId,
      enemyName: state.enemyName, combatState: state.combatState,
    };
  }, [getDungeonState]);
  const presentation = useGameUiSelector(selectDungeonPresentation, sameDungeonPresentation);
  const visibleDungeons = useMemo(() => DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === selectedTier), [selectedTier]);

  return (
    <div className="world-dungeons">
      <header className="world-dungeons__intro"><div><small>EXPÉDITIONS INSTANCIÉES</small><h2>Donjons</h2></div><p>1 clé consommée à l’entrée · PV et cooldowns persistent · équipement verrouillé jusqu’à la sortie.</p></header>
      <div className="world-dungeons__tiers" role="group" aria-label="Tier de donjon">
        {DUNGEON_TIERS.map((tier) => <button key={tier} type="button" className={selectedTier === tier ? "is-active" : ""} aria-pressed={selectedTier === tier} onClick={() => { setSelectedTier(tier); }}>T{tier}</button>)}
      </div>
      <div className="world-dungeons__list">
        {visibleDungeons.length === 0 ? <div className="world-dungeons__empty"><strong>Aucun donjon T{selectedTier} disponible.</strong><span>Ce palier sera ajouté à la progression des donjons.</span></div> : visibleDungeons.map((dungeon) => {
          const keyCount = presentation.inventory[dungeon.keyItemId] ?? 0;
          const isActiveDungeon = presentation.activeDefinitionId === dungeon.id;
          const isPendingDungeon = presentation.pendingDefinitionId === dungeon.id;
          const canEnter = presentation.activeDefinitionId === null && presentation.pendingDefinitionId === null && keyCount > 0;
          const progressedEncounterCount = isActiveDungeon && presentation.activeEncounterIndex !== null ? presentation.activeEncounterIndex : 0;
          const routeProgress = dungeon.encounters.length <= 1 ? 100 : Math.max(0, Math.min(100, (progressedEncounterCount / (dungeon.encounters.length - 1)) * 100));
          const visual = dungeonVisual(dungeon.faction, dungeon.tier);
          return (
            <article key={dungeon.id} className={`world-dungeon-card${isActiveDungeon ? " is-active" : ""}${isPendingDungeon ? " is-pending" : ""}`}>
              <header className="world-dungeon-card__header">
                <span className="world-dungeon-card__visual" data-tier={dungeon.tier} aria-hidden="true">{visual !== undefined ? <img src={visual} alt="" /> : null}</span>
                <div className="world-dungeon-card__identity"><small>Donjon T{dungeon.tier}</small><h3>{dungeon.faction}</h3></div>
                <span className={isActiveDungeon ? "is-running" : isPendingDungeon ? "is-pending" : ""}>{isActiveDungeon ? "En cours" : isPendingDungeon ? "Après ce combat" : "Disponible"}</span>
              </header>
              <div className="world-dungeon-card__stats"><span><small>Difficulté</small><strong>T{dungeon.tier}.3+</strong></span><span><small>Rencontres</small><strong>{dungeon.encounters.length}</strong></span><span><small>Clés</small><strong>{keyCount}</strong></span></div>
              <div className="world-dungeon-card__route" aria-label="Structure du donjon">
                <span className="world-dungeon-card__route-rail" aria-hidden="true"><span style={{ width: `${String(routeProgress)}%` }} /></span>
                {dungeon.encounters.map((encounter, index) => {
                  const isCurrent = isActiveDungeon && presentation.activeEncounterIndex === index;
                  const isCompleted = isActiveDungeon && presentation.activeEncounterIndex !== null && index < presentation.activeEncounterIndex;
                  return <span key={encounter.id} className={`world-dungeon-step world-dungeon-step--${encounter.kind}${isCurrent ? " is-current" : ""}${isCompleted ? " is-completed" : ""}`} title={encounter.kind === "boss" ? "Boss" : encounter.kind === "elite" ? "Élite" : "Normal"}><b>{isCompleted ? "✓" : index + 1}</b><small>{index + 1}</small></span>;
                })}
              </div>
              {isActiveDungeon ? <div className="world-dungeon-card__current"><small>Combat actuel · Rencontre {(presentation.activeEncounterIndex ?? 0) + 1}/{dungeon.encounters.length}</small><strong>{presentation.enemyName || "Préparation de la rencontre…"}</strong></div> : isPendingDungeon ? <div className="world-dungeon-card__current is-pending"><small>Entrée en attente</small><strong>Le donjon commencera dès que l’ennemi actuel sera vaincu.</strong></div> : null}
              <footer className="world-dungeon-card__footer">
                {!isPendingDungeon && <p className={!canEnter ? "is-status" : ""}>{isActiveDungeon ? "Abandonner termine définitivement cette tentative." : keyCount > 0 ? "En combat, l’entrée attendra la fin de l’ennemi actuel." : `Clé T${dungeon.tier} requise.`}</p>}
                {isActiveDungeon ? <button type="button" className="is-danger" onClick={() => { abandonDungeon(); }}>Abandonner</button> : !isPendingDungeon ? <button type="button" disabled={!canEnter} onClick={() => { startDungeon(dungeon.id); }}>{keyCount > 0 ? "Entrer" : "Clé requise"}</button> : null}
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
