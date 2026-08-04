import { SegmentTimeline } from "../hud/SegmentTimeline";
import { ActiveGatheringGame } from "../hud/ActiveGatheringGame";
import { PanelContainer } from "../panels/PanelContainer";
import { useGameBridge, useGameServices } from "../state/GameContext";
import type { MasteryVM } from "../game/GameBridge";

const GATHERING_MASTERY_BY_FAMILY: Readonly<Record<string, string>> = {
  Wood: "mastery_gathering_wood",
  Ore: "mastery_gathering_ore",
  Hide: "mastery_gathering_hide",
  Fiber: "mastery_gathering_fiber",
};

function getWeaponMasteryIds(itemId: string | undefined): readonly string[] {
  if (itemId === undefined) return [];
  if (itemId.includes("_sword_")) return ["mastery_sword", "mastery_broadsword"];
  if (itemId.includes("_bow_") && itemId.includes("badon")) {
    return ["mastery_bow", "mastery_badon"];
  }
  if (itemId.includes("_bow_")) return ["mastery_bow", "mastery_longbow"];
  if (itemId.includes("_staff_")) {
    return ["mastery_fire_staff", "mastery_t4_fire_staff"];
  }
  if (itemId.includes("_gloves_")) {
    return ["mastery_gloves", "mastery_spiked_gauntlets"];
  }
  return [];
}

function MasterySidebarEntry({ mastery }: { readonly mastery: MasteryVM }): JSX.Element {
  const progress = mastery.xpToNextLevel <= 0
    ? 100
    : Math.max(0, Math.min(100, (mastery.currentXp / mastery.xpToNextLevel) * 100));
  return (
    <div className="sidebar-mastery">
      <div className="sidebar-mastery__heading">
        <span>{mastery.displayName}</span>
        <strong>Niv. {String(mastery.level)}</strong>
      </div>
      <div className="sidebar__progress-bar">
        <div className="sidebar__progress-fill" style={{ width: `${String(progress)}%` }} />
      </div>
      <small>
        {String(mastery.currentXp)} / {String(mastery.xpToNextLevel)} XP
      </small>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatHourlyRate(value: number): string {
  if (value <= 0) return "—";
  if (value >= 1_000_000) {
    return `${String(Math.round(value / 100_000) / 10).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    return `${String(Math.round(value / 1_000))}K`;
  }
  return String(Math.round(value));
}

export function RightSidebar(): JSX.Element {
  const state = useGameBridge();
  const { performGatheringStrike, returnToCombat } = useGameServices();
  const activeGathering = state.gathering.status === "gathering"
    ? state.gathering
    : state.oreGathering.status === "gathering"
      ? state.oreGathering
      : state.hideGathering.status === "gathering"
        ? state.hideGathering
        : state.fiberGathering.status === "gathering"
          ? state.fiberGathering
          : undefined;
  const masteriesById = new Map(
    state.progression.masteries.map((mastery) => [mastery.id, mastery]),
  );
  const gatheringMasteryId = activeGathering === undefined
    ? undefined
    : GATHERING_MASTERY_BY_FAMILY[activeGathering.resourceFamily];
  const gatheringMastery = gatheringMasteryId === undefined
    ? undefined
    : masteriesById.get(gatheringMasteryId);
  const equippedWeaponId = state.equipment.slots.find(
    (slot) => slot.slot === "weapon",
  )?.itemId;
  const combatMasteries = getWeaponMasteryIds(equippedWeaponId)
    .map((id) => masteriesById.get(id))
    .filter((mastery): mastery is MasteryVM => mastery !== undefined);

  return (
    <aside className="sidebar">
      {activeGathering !== undefined ? (
        <>
          <PanelContainer title="Activité de récolte">
            <div className="sidebar__placeholder">
              <span className="sidebar__zone-name">{activeGathering.resourceName}</span>
              <span className="sidebar__stat-value">
                {activeGathering.resourceFamily} · Tier {String(activeGathering.resourceTier)}
              </span>
              <div className="sidebar__progress-bar">
                <div
                  className="sidebar__progress-fill"
                  style={{ width: `${String(activeGathering.progress)}%` }}
                />
              </div>
              <span className="sidebar__stat-value">
                {String(activeGathering.progress)}% · cycle de {String(activeGathering.durationSeconds)} s
              </span>
              {activeGathering.activeMiniGame !== undefined && (
                  <ActiveGatheringGame
                    cycleId={activeGathering.activeMiniGame.cycleId}
                    strikesUsed={activeGathering.activeMiniGame.strikesUsed}
                    durationSeconds={activeGathering.durationSeconds}
                    onStrike={(quality) => performGatheringStrike(
                      activeGathering.resourceFamily,
                      quality,
                    )}
                  />
                )}
            </div>
          </PanelContainer>

          {gatheringMastery !== undefined && (
            <PanelContainer title="Maîtrise en cours">
              <MasterySidebarEntry mastery={gatheringMastery} />
            </PanelContainer>
          )}

          <PanelContainer title="Réserves">
            <div className="sidebar__stats">
              <div className="sidebar__stat">
                <span className="sidebar__stat-label">Stock actuel</span>
                <span className="sidebar__stat-value">
                  {String(activeGathering.storedQuantity)}
                </span>
              </div>
              <div className="sidebar__stat">
                <span className="sidebar__stat-label">Rendement</span>
                <span className="sidebar__stat-value">1 par cycle</span>
              </div>
              <div className="sidebar__stat">
                <span className="sidebar__stat-label">Combat</span>
                <span className="sidebar__stat-value">Suspendu</span>
              </div>
            </div>
          </PanelContainer>

          <button
            className="sidebar__return-combat"
            type="button"
            onClick={() => {
              returnToCombat();
            }}
          >
            Retour au combat
          </button>
        </>
      ) : (
        <>
          <PanelContainer title="Progression de zone">
            <SegmentTimeline />
          </PanelContainer>

          {combatMasteries.length > 0 && (
            <PanelContainer title="Maîtrises en cours">
              <div className="sidebar-masteries">
                {combatMasteries.map((mastery) => (
                  <MasterySidebarEntry key={mastery.id} mastery={mastery} />
                ))}
              </div>
            </PanelContainer>
          )}

          <PanelContainer title="Informations">
            <div className="sidebar__stats">
              <div className="sidebar__stat">
                <span className="sidebar__stat-label">Temps de zone</span>
                <span className="sidebar__stat-value">{formatTime(state.zoneElapsed)}</span>
              </div>
              <div className="sidebar__stat">
                <span className="sidebar__stat-label">Ennemis tués</span>
                <span className="sidebar__stat-value">{String(state.enemiesKilled)}</span>
              </div>
              <div className="sidebar__stat">
                <span className="sidebar__stat-label">Silver / heure</span>
                <span className="sidebar__stat-value">
                  {formatHourlyRate(state.segmentSilverPerHour)}
                </span>
              </div>
              <div className="sidebar__stat">
                <span className="sidebar__stat-label">Fame / heure</span>
                <span className="sidebar__stat-value">
                  {formatHourlyRate(state.segmentFamePerHour)}
                </span>
              </div>
            </div>
          </PanelContainer>
        </>
      )}
    </aside>
  );
}
