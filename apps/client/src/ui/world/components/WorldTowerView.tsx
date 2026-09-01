import { useCallback, useState } from "react";
import { FACTION_CAPE_FACTIONS, getTowerBlockSilverReward } from "@game/data";
import { getTowerFloorDefinition } from "@game/gameplay";
import type { GameBridgeState } from "../../../game/GameBridge.js";
import { resolveTowerRewardBreakdown } from "../../../runtime/TowerRewardRuntime.js";
import type { TowerAccessState } from "../../../state/TowerNavigationActions.js";
import { useGameServices } from "../../../state/GameContext.js";
import { useNavigation } from "../../navigation/useNavigation.js";
import { useGameUiSelector } from "../../state/useGameUiSelector.js";
import "./WorldTowerView.css";

interface TowerPresentationModel {
  readonly active: boolean;
  readonly intermission: boolean;
  readonly engaged: boolean;
  readonly pendingStart: boolean;
  readonly currentFloor: number;
  readonly highestClearedFloor: number;
  readonly checkpointFloor: number;
  readonly endlessUnlocked: boolean;
  readonly unlockedCheckpointFloors: readonly number[];
  readonly access: TowerAccessState;
  readonly combatState: string;
}

function sameTowerPresentation(previous: TowerPresentationModel, next: TowerPresentationModel): boolean {
  return previous.active === next.active
    && previous.intermission === next.intermission
    && previous.engaged === next.engaged
    && previous.pendingStart === next.pendingStart
    && previous.currentFloor === next.currentFloor
    && previous.highestClearedFloor === next.highestClearedFloor
    && previous.checkpointFloor === next.checkpointFloor
    && previous.endlessUnlocked === next.endlessUnlocked
    && previous.access.canEnter === next.access.canEnter
    && previous.access.reason === next.access.reason
    && previous.access.requiredTier === next.access.requiredTier
    && previous.access.highestEquippedTier === next.access.highestEquippedTier
    && previous.combatState === next.combatState
    && previous.unlockedCheckpointFloors.length === next.unlockedCheckpointFloors.length
    && previous.unlockedCheckpointFloors.every((floor, index) => floor === next.unlockedCheckpointFloors[index]);
}

function resolveFactionDisplayName(factionId: string): string {
  return FACTION_CAPE_FACTIONS.find((entry) => entry.factionId === factionId)?.displayName ?? factionId;
}

function getAccessMessage(access: TowerAccessState): string | undefined {
  if (access.reason === "activity_busy") return "Terminez ou quittez l’activité de combat en cours.";
  if (access.reason === "weapon_required") return "Une arme doit être équipée.";
  if (access.reason === "equipment_tier_locked") {
    return `Ce bloc T${String(access.requiredTier)} n’accepte pas d’équipement supérieur au T${String(access.requiredTier)}.`;
  }
  if (access.reason === "research_locked") return "Recherche de la Tour requise.";
  return undefined;
}

function getFloorRoleLabel(role: string, majorBoss: boolean): string {
  if (majorBoss) return "Boss majeur";
  if (role === "block_boss") return "Boss";
  if (role === "elite") return "Élite";
  if (role === "reinforced") return "Renforcé";
  return "Normal";
}

export function WorldTowerView(): JSX.Element {
  const {
    getTowerState,
    selectTowerCheckpoint,
    startTower,
    abandonTower,
  } = useGameServices();
  const navigation = useNavigation();
  const [rewardsOpen, setRewardsOpen] = useState(false);

  const returnToExploration = (): void => {
    if (!abandonTower()) return;
    navigation.returnToDashboard();
  };

  const selectPresentation = useCallback((state: GameBridgeState): TowerPresentationModel => {
    const tower = getTowerState();
    return {
      active: tower.active,
      intermission: tower.intermission,
      engaged: tower.engaged,
      pendingStart: tower.pendingStart,
      currentFloor: tower.progression.currentFloor,
      highestClearedFloor: tower.progression.highestClearedFloor,
      checkpointFloor: tower.progression.checkpointFloor,
      endlessUnlocked: tower.progression.endlessUnlocked,
      unlockedCheckpointFloors: tower.unlockedCheckpointFloors,
      access: tower.access,
      combatState: state.combatState,
    };
  }, [getTowerState]);

  const presentation = useGameUiSelector(selectPresentation, sameTowerPresentation);
  const towerState = getTowerState();
  const floor = getTowerFloorDefinition(
    presentation.currentFloor,
    towerState.progression.seed,
  );
  const block = floor.block;
  const factionName = resolveFactionDisplayName(block.factionId);
  const accessMessage = getAccessMessage(presentation.access);
  const canStart = presentation.access.canEnter && !presentation.active && !presentation.pendingStart;
  const rewardBreakdown = resolveTowerRewardBreakdown(towerState.progression);
  const blockRewards = getTowerBlockSilverReward(block.tier);
  const rewardsId = "world-tower-rewards";
  const timelineProgress = block.floorEnd === block.floorStart
    ? 100
    : Math.max(0, Math.min(100, ((presentation.currentFloor - block.floorStart) / (block.floorEnd - block.floorStart)) * 100));

  return (
    <div className="world-tower">
      <header className="world-tower__intro">
        <div>
          <small>ACTIVITÉ ENDGAME</small>
          <h2>Tour sans fin</h2>
        </div>
        <p>5 étages par bloc · checkpoint après chaque bloc.</p>
      </header>

      <section className="world-tower__status" aria-label="Progression de la Tour">
        <div className="is-primary"><small>Étage actuel</small><strong>{presentation.currentFloor}</strong></div>
        <div className="is-record"><small>Record</small><strong>{presentation.highestClearedFloor}</strong></div>
        <div><small>Checkpoint</small><strong>{presentation.checkpointFloor}</strong></div>
        <div><small>Endless</small><strong>{presentation.endlessUnlocked ? "Débloqué" : "Étage 25"}</strong></div>
      </section>

      <article className={`world-tower__block${presentation.active ? " is-active" : ""}${presentation.intermission ? " is-intermission" : ""}${presentation.pendingStart ? " is-pending" : ""}`}>
        <header>
          <div>
            <small>Bloc {block.blockIndex + 1} · Étages {block.floorStart}–{block.floorEnd}</small>
            <h3>T{block.tier} · {factionName}</h3>
          </div>
          <div className="world-tower__header-actions">
            <button
              type="button"
              className="world-tower__info-button"
              aria-label="Récompenses de la Tour"
              aria-expanded={rewardsOpen}
              aria-controls={rewardsId}
              onClick={() => { setRewardsOpen((open) => !open); }}
            >i</button>
            <span>{presentation.active ? "En cours" : presentation.intermission ? "Préparation" : presentation.pendingStart ? "Après ce combat" : "Prêt"}</span>
          </div>
        </header>

        {rewardsOpen ? (
          <section id={rewardsId} className="world-tower__rewards" aria-label="Récompenses de la Tour">
            <div><strong>Étage courant</strong><span>{rewardBreakdown.baseSilver.toLocaleString("fr-FR")} Silver · {rewardBreakdown.baseFame.toLocaleString("fr-FR")} Fame</span></div>
            <div><strong>Fin de bloc</strong><span>{blockRewards.repeatableChestSilver.toLocaleString("fr-FR")} Silver</span></div>
            <div><strong>Première validation</strong><span>+{blockRewards.firstClearBonusSilver.toLocaleString("fr-FR")} Silver</span></div>
            {block.majorBoss ? <div><strong>Boss majeur · première fois</strong><span>+{blockRewards.majorBossFirstClearBonusSilver.toLocaleString("fr-FR")} Silver</span></div> : null}
            <small>La Tour ne remplace pas les loots spécialisés du Monde ou des Donjons.</small>
          </section>
        ) : null}

        <div className="world-tower__timeline world-segment-strip--activity" aria-label="Étages du bloc">
          <span className="world-segment-strip__rail" aria-hidden="true">
            <span className="world-segment-strip__rail-progress" style={{ width: `${String(timelineProgress)}%` }} />
          </span>
          {Array.from({ length: 5 }, (_, index) => {
            const roomFloor = block.floorStart + index;
            const room = getTowerFloorDefinition(roomFloor, towerState.progression.seed);
            const completed = roomFloor <= presentation.highestClearedFloor;
            const current = roomFloor === presentation.currentFloor;
            const boss = room.role === "block_boss" || room.majorBoss;
            const roleLabel = getFloorRoleLabel(room.role, room.majorBoss);
            const stateClass = current ? "current" : completed ? "complete" : "locked";
            return (
              <span key={roomFloor} className="world-tower-step" title={`Étage ${String(roomFloor)} · ${roleLabel}`}>
                <span
                  className={`world-segment-strip__segment world-segment-strip__segment--${stateClass}${boss ? " world-segment-strip__segment--boss" : ""}`}
                  role="img"
                  aria-label={`Étage ${String(roomFloor)} · ${roleLabel}`}
                  aria-current={current ? "step" : undefined}
                >
                  <span>{boss ? "" : roomFloor}</span>
                </span>
                <small>{roleLabel}</small>
              </span>
            );
          })}
        </div>

        <div className="world-tower__block-progress">
          <span><small>Progression du bloc</small><strong>{floor.indexInBlock + 1}/5</strong></span>
          <span><small>Finale</small><strong>{block.majorBoss ? "Boss majeur" : "Boss"} · Étage {block.floorEnd}</strong></span>
        </div>

        <footer>
          <p>{presentation.active
            ? "Retourner à l’exploration quitte la tentative et conserve la progression validée."
            : presentation.intermission
              ? accessMessage ?? "Préparez votre équipement avant de lancer le prochain bloc."
              : presentation.pendingStart
                ? "La Tour démarrera à la fin de l’ennemi actuel."
                : accessMessage ?? "L’entrée peut attendre la fin du combat World en cours."}</p>
          {presentation.active ? (
            <button type="button" className="is-danger" onClick={returnToExploration}>Retour à l’exploration</button>
          ) : presentation.pendingStart ? null : presentation.intermission ? (
            <div className="world-tower__intermission-actions">
              <button type="button" className="is-danger" onClick={returnToExploration}>Retour à l’exploration</button>
              <button type="button" disabled={!canStart} onClick={() => { startTower(); }}>Lancer le bloc</button>
            </div>
          ) : (
            <button type="button" disabled={!canStart} onClick={() => { startTower(); }}>Entrer</button>
          )}
        </footer>
      </article>

      <section className="world-tower__checkpoints" aria-label="Checkpoints débloqués">
        <header><small>CHECKPOINTS</small><span>Repartir depuis un bloc déjà validé</span></header>
        <div>
          {presentation.unlockedCheckpointFloors.map((checkpoint) => (
            <button
              key={checkpoint}
              type="button"
              className={checkpoint === presentation.checkpointFloor ? "is-active" : ""}
              disabled={presentation.engaged || presentation.pendingStart}
              onClick={() => { selectTowerCheckpoint(checkpoint); }}
            >
              Étage {checkpoint}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
