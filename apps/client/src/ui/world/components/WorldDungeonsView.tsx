import { useCallback, useMemo, useState } from "react";
import type { GameBridgeState } from "../../../game/GameBridge.js";
import { DUNGEON_DEFINITIONS } from "../../../data/dungeonContentCatalog.js";
import { getDungeonLootDefinition } from "../../../data/dungeonLootContentCatalog.js";
import type { DungeonKeyTier } from "../../../data/dungeonKeyContentCatalog.js";
import type { DungeonAccessState } from "../../../state/DungeonNavigationActions.js";
import { useGameServices } from "../../../state/GameContext.js";
import { useNavigation } from "../../navigation/useNavigation.js";
import { useGameUiSelector } from "../../state/useGameUiSelector.js";
import "./WorldDungeonsView.css";

interface DungeonPresentationModel {
  readonly keyQuantities: Readonly<Record<string, number>>;
  readonly accessByDefinitionId: Readonly<Record<string, DungeonAccessState>>;
  readonly activeDefinitionId: string | null;
  readonly activeEncounterIndex: number | null;
  readonly pendingDefinitionId: string | null;
  readonly enemyName: string;
  readonly combatState: string;
}

type DungeonBand = "blue" | "yellow" | "orange" | "red" | "black";

const DUNGEON_TIERS: readonly DungeonKeyTier[] = [4, 5, 6, 7, 8];
const DUNGEON_VISUAL_SLUGS = { keeper: "keeper", heretic: "heretic", undead: "undead", morgana: "morgana" } as const;
const DUNGEON_BAND_BY_TIER: Readonly<Record<DungeonKeyTier, DungeonBand>> = {
  4: "blue",
  5: "yellow",
  6: "orange",
  7: "red",
  8: "black",
};
const INVALID_ACCESS: DungeonAccessState = { canEnter: false, reason: "invalid_definition" };

function dungeonVisual(faction: string): string | undefined {
  const key = faction.toLowerCase() as keyof typeof DUNGEON_VISUAL_SLUGS;
  const slug = DUNGEON_VISUAL_SLUGS[key];
  return slug === undefined ? undefined : `/assets/world/dungeons/${slug}-dungeon-t4.png`;
}

function sameAccess(previous: DungeonAccessState | undefined, next: DungeonAccessState | undefined): boolean {
  return previous?.canEnter === next?.canEnter
    && previous?.reason === next?.reason
    && previous?.previousTier === next?.previousTier
    && previous?.highestEquippedTier === next?.highestEquippedTier;
}

function sameDungeonPresentation(previous: DungeonPresentationModel, next: DungeonPresentationModel): boolean {
  if (
    previous.activeDefinitionId !== next.activeDefinitionId
    || previous.activeEncounterIndex !== next.activeEncounterIndex
    || previous.pendingDefinitionId !== next.pendingDefinitionId
    || previous.enemyName !== next.enemyName
    || previous.combatState !== next.combatState
  ) return false;
  const previousKeyIds = Object.keys(previous.keyQuantities);
  const nextKeyIds = Object.keys(next.keyQuantities);
  if (
    previousKeyIds.length !== nextKeyIds.length
    || !previousKeyIds.every((key) => previous.keyQuantities[key] === next.keyQuantities[key])
  ) return false;
  const previousAccessKeys = Object.keys(previous.accessByDefinitionId);
  const nextAccessKeys = Object.keys(next.accessByDefinitionId);
  return previousAccessKeys.length === nextAccessKeys.length
    && previousAccessKeys.every((key) => sameAccess(
      previous.accessByDefinitionId[key],
      next.accessByDefinitionId[key],
    ));
}

function getAccessMessage(access: DungeonAccessState, dungeonTier: number): string | undefined {
  if (access.reason === "research_locked") return "Recherche de cette famille de donjons requise.";
  if (access.reason === "progression_locked") return `Validez d'abord un donjon T${String(access.previousTier ?? dungeonTier - 1)} pour débloquer les donjons T${String(dungeonTier)}.`;
  if (access.reason === "equipment_tier_locked") return `Ce donjon T${String(dungeonTier)} n'accepte pas d'équipement supérieur au T${String(dungeonTier)} (équipement T${String(access.highestEquippedTier ?? dungeonTier + 1)} détecté).`;
  if (access.reason === "weapon_required") return "Arme équipée requise.";
  if (access.reason === "missing_key") return `Clé T${String(dungeonTier)} requise.`;
  return undefined;
}

function isHardLocked(access: DungeonAccessState): boolean {
  return access.reason === "research_locked"
    || access.reason === "progression_locked"
    || access.reason === "equipment_tier_locked";
}

function getEnterLabel(access: DungeonAccessState): string {
  if (isHardLocked(access)) return "Verrouillé";
  if (access.reason === "missing_key") return "Clé requise";
  if (access.reason === "weapon_required") return "Arme requise";
  return "Entrer";
}

function formatRange(range: { readonly min: number; readonly max: number }): string {
  return range.min === range.max ? String(range.min) : `${String(range.min)}–${String(range.max)}`;
}

export function WorldDungeonsView(): JSX.Element {
  const { startDungeon, abandonDungeon, getDungeonState, inventoryManager, heroId } = useGameServices();
  const navigation = useNavigation();
  const [selectedTier, setSelectedTier] = useState<DungeonKeyTier>(4);
  const [infoDungeonId, setInfoDungeonId] = useState<string | null>(null);
  const selectDungeonPresentation = useCallback((state: GameBridgeState): DungeonPresentationModel => {
    const dungeonState = getDungeonState();
    const activeRun = dungeonState.activeRun?.status === "active" ? dungeonState.activeRun : undefined;
    return {
      keyQuantities: Object.fromEntries(DUNGEON_DEFINITIONS.map((dungeon) => [dungeon.keyItemId, inventoryManager.getAccessibleQuantity(heroId, dungeon.keyItemId)])),
      accessByDefinitionId: Object.fromEntries(DUNGEON_DEFINITIONS.map((dungeon) => [dungeon.id, dungeonState.getAccess(dungeon.id)])),
      activeDefinitionId: activeRun?.definitionId ?? null,
      activeEncounterIndex: activeRun?.encounterIndex ?? null,
      pendingDefinitionId: dungeonState.pendingDefinitionId,
      enemyName: state.enemyName,
      combatState: state.combatState,
    };
  }, [getDungeonState, heroId, inventoryManager]);
  const presentation = useGameUiSelector(selectDungeonPresentation, sameDungeonPresentation);
  const visibleDungeons = useMemo(() => DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === selectedTier), [selectedTier]);

  return (
    <div className="world-dungeons">
      <header className="world-dungeons__intro"><div><small>EXPÉDITIONS INSTANCIÉES</small><h2>Donjons</h2></div><p>1 clé consommée à l’entrée · PV et cooldowns persistent · équipement verrouillé jusqu’à la sortie.</p></header>
      <div className="world-dungeons__tiers" role="group" aria-label="Tier de donjon">
        {DUNGEON_TIERS.map((tier) => <button key={tier} type="button" className={selectedTier === tier ? "is-active" : ""} aria-pressed={selectedTier === tier} onClick={() => { setSelectedTier(tier); setInfoDungeonId(null); }}>T{tier}</button>)}
      </div>
      <div className="world-dungeons__list">
        {visibleDungeons.length === 0 ? <div className="world-dungeons__empty"><strong>Aucun donjon T{selectedTier} disponible.</strong><span>Ce palier sera ajouté à la progression des donjons.</span></div> : visibleDungeons.map((dungeon) => {
          const loot = getDungeonLootDefinition(dungeon.lootTableId);
          const keyCount = presentation.keyQuantities[dungeon.keyItemId] ?? 0;
          const access = presentation.accessByDefinitionId[dungeon.id] ?? INVALID_ACCESS;
          const isActiveDungeon = presentation.activeDefinitionId === dungeon.id;
          const isPendingDungeon = presentation.pendingDefinitionId === dungeon.id;
          const hardLocked = isHardLocked(access);
          const lockMessage = getAccessMessage(access, dungeon.tier);
          const canEnter = access.canEnter && presentation.activeDefinitionId === null && presentation.pendingDefinitionId === null;
          const progressedEncounterCount = isActiveDungeon && presentation.activeEncounterIndex !== null ? presentation.activeEncounterIndex : 0;
          const routeProgress = dungeon.encounters.length <= 1 ? 100 : Math.max(0, Math.min(100, (progressedEncounterCount / (dungeon.encounters.length - 1)) * 100));
          const visual = dungeonVisual(dungeon.faction);
          const band = DUNGEON_BAND_BY_TIER[dungeon.tier as DungeonKeyTier];
          const tooltipId = `dungeon-access-tooltip-${dungeon.id}`;
          const infoId = `dungeon-rewards-${dungeon.id}`;
          const isInfoOpen = infoDungeonId === dungeon.id;
          return (
            <article key={dungeon.id} className={`world-dungeon-card${isActiveDungeon ? " is-active" : ""}${isPendingDungeon ? " is-pending" : ""}${hardLocked ? " is-locked" : ""}`} aria-disabled={!canEnter || undefined} aria-describedby={lockMessage === undefined ? undefined : tooltipId} tabIndex={lockMessage === undefined ? undefined : 0}>
              <header className="world-dungeon-card__header">
                <span className="world-dungeon-card__visual" data-band={band} aria-hidden="true">{visual !== undefined ? <img src={visual} alt="" /> : null}</span>
                <div className="world-dungeon-card__identity"><small>Donjon T{dungeon.tier}</small><h3>{dungeon.faction}</h3></div>
                <div className="world-dungeon-card__header-actions">
                  <button type="button" className="world-dungeon-card__info-button" aria-label={`Récompenses du donjon ${dungeon.faction} T${String(dungeon.tier)}`} aria-expanded={isInfoOpen} aria-controls={infoId} onClick={() => { setInfoDungeonId(isInfoOpen ? null : dungeon.id); }}>i</button>
                  <span className={isActiveDungeon ? "is-running" : isPendingDungeon ? "is-pending" : hardLocked ? "is-locked" : ""}>{isActiveDungeon ? "En cours" : isPendingDungeon ? "Après ce combat" : hardLocked ? "Verrouillé" : "Disponible"}</span>
                </div>
              </header>
              {isInfoOpen ? (
                <section id={infoId} className="world-dungeon-card__rewards" aria-label="Récompenses du donjon">
                  <div><strong>Garanti au clear</strong><span>{loot.completionSilver.toLocaleString("fr-FR")} Silver</span></div>
                  <div><strong>Fragments d’artefact</strong><span>Normal {formatRange(loot.encounters.normal.artifactFragmentRange)} · Élite {formatRange(loot.encounters.elite.artifactFragmentRange)} · Boss {formatRange(loot.encounters.boss.artifactFragmentRange)}</span></div>
                  <div><strong>Éclats d’enchantement</strong><span>Normal {formatRange(loot.encounters.normal.enchantmentShardRange)} · Élite {formatRange(loot.encounters.elite.enchantmentShardRange)} · Boss {formatRange(loot.encounters.boss.enchantmentShardRange)}</span></div>
                  <div><strong>Runes de faction</strong><span>Élite {formatRange(loot.encounters.elite.factionRuneRange)} · Boss {formatRange(loot.encounters.boss.factionRuneRange)}</span></div>
                  <div><strong>Artefact complet</strong><span>{String(Math.round(loot.encounters.boss.artifactDropChance * 100))}% sur le boss</span></div>
                  <small>Valeurs de base · la maîtrise de faction améliore le rendement.</small>
                </section>
              ) : null}
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
                {!isPendingDungeon && <p className={!canEnter ? "is-status" : ""}>{isActiveDungeon ? "Retourner à l’exploration termine définitivement cette tentative." : lockMessage ?? "En combat, l’entrée attendra la fin de l’ennemi actuel."}</p>}
                {isActiveDungeon ? <button type="button" className="is-danger" onClick={() => { if (abandonDungeon()) navigation.returnToDashboard(); }}>Retour à l’exploration</button> : !isPendingDungeon ? <button type="button" disabled={!canEnter} aria-describedby={lockMessage === undefined ? undefined : tooltipId} onClick={() => { startDungeon(dungeon.id); }}>{getEnterLabel(access)}</button> : null}
              </footer>
              {lockMessage === undefined ? null : <span id={tooltipId} className="world-dungeon-card__tooltip" role="tooltip">{lockMessage}</span>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
