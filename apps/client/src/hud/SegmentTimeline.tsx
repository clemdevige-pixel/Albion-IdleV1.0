import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getSegmentRecommendedItemPower } from "../data/itemPower";
import { calculateProjectedSegmentRates } from "../runtime/projectedRateCalculator";
import { useGameBridge, useGameServices } from "../state/GameContext";
import "./SegmentTimeline.css";

function readComputedStat(
  stats: ReturnType<typeof useGameBridge>["stats"],
  id: string,
): number {
  return stats.stats.find((entry) => entry.id === id)?.computed ?? 0;
}

function formatRate(value: number): string {
  return Math.round(value).toLocaleString("fr-FR");
}

export function SegmentTimeline(): JSX.Element {
  const state = useGameBridge();
  const { world } = state;
  const { selectZone, setSegmentFarmMode } = useGameServices();
  const [viewedZoneIndex, setViewedZoneIndex] = useState(world.zoneIndex);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setViewedZoneIndex(world.zoneIndex);
  }, [world.zoneIndex]);

  const viewedZone =
    world.zones.find((zone) => zone.zoneIndex === viewedZoneIndex)
    ?? world.zones.find((zone) => zone.isActive);
  const segments = Array.from(
    { length: world.segmentCount },
    (_, index) => index + 1,
  );

  if (viewedZone === undefined) {
    return <div className="segment-timeline segment-timeline--sidebar" />;
  }

  const isViewingActiveZone = viewedZone.zoneIndex === world.zoneIndex;
  const displayedSegment = isViewingActiveZone
    ? world.segmentIndex
    : viewedZone.segmentIndex;

  const isGathering = [
    state.gathering,
    state.oreGathering,
    state.hideGathering,
    state.fiberGathering,
  ].some((activity) => activity.status === "gathering");

  if (isGathering) {
    return <div className="segment-timeline segment-timeline--hidden" />;
  }

  const equippedWeaponId = state.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId;
  const physicalDamage = readComputedStat(state.stats, "stat_physical_damage");
  const magicalDamage = readComputedStat(state.stats, "stat_magical_damage");
  const attackSpeed = readComputedStat(state.stats, "stat_attack_speed");
  const primaryAbilityAutoCast = state.abilities.primary?.autoCast ?? false;

  return (
    <section className="segment-timeline segment-timeline--sidebar">
      <div className="segment-timeline__zone-browser">
        <button
          type="button"
          disabled={viewedZoneIndex <= 1}
          onClick={() => { setViewedZoneIndex((value) => value - 1); }}
          aria-label="Consulter la zone précédente"
        >
          ‹
        </button>
        <div>
          <strong>{viewedZone.biomeName} — {viewedZone.zoneName}</strong>
          <span>
            {isViewingActiveZone
              ? "Zone actuelle"
              : viewedZone.isUnlocked
                ? "Zone accessible"
                : "Zone verrouillée"}
          </span>
        </div>
        <button
          type="button"
          disabled={viewedZoneIndex >= world.zoneCount}
          onClick={() => { setViewedZoneIndex((value) => value + 1); }}
          aria-label="Consulter la zone suivante"
        >
          ›
        </button>
      </div>

      <div className="segment-timeline__track">
        {segments.map((segment, index) => {
          const locked =
            !viewedZone.isUnlocked || segment > viewedZone.unlockedSegmentCount;
          const current = isViewingActiveZone && segment === world.segmentIndex;
          const completed = viewedZone.completedSegments.includes(segment);
          const pending =
            world.pendingZoneIndex === viewedZone.zoneIndex
            && world.pendingSegmentIndex === segment;
          const classes = [
            "segment-timeline__node",
            locked ? "segment-timeline__node--locked" : "",
            completed ? "segment-timeline__node--completed" : "",
            current ? "segment-timeline__node--current" : "",
            pending ? "segment-timeline__node--pending" : "",
            current ? "segment-timeline__node--marker" : "",
          ].filter(Boolean).join(" ");
          const rates = locked ? undefined : calculateProjectedSegmentRates({
            physicalDamage,
            magicalDamage,
            attackSpeed,
            equippedWeaponId,
            primaryAbilityAutoCast,
            currentZoneIndex: viewedZone.zoneIndexWithinBand,
            currentWorldBandId: viewedZone.worldBandId,
            currentSegment: segment - 1,
          });
          const recommendedIp = getSegmentRecommendedItemPower(
            viewedZone.zoneIndexWithinBand + 1,
            segment,
            viewedZone.worldBandId,
          );
          const accessibleLabel = locked
            ? `Segment ${String(segment)} verrouillé`
            : `Aller au segment ${String(segment)}. IP conseillé ${String(recommendedIp)}. Silver par heure ${formatRate(rates?.silverPerHour ?? 0)}. Fame par heure ${formatRate(rates?.famePerHour ?? 0)}.`;
          const showTooltip = !locked
            && rates !== undefined
            && hoveredSegment === segment
            && tooltipPosition !== null;

          return (
            <div className="segment-timeline__step" key={segment}>
              {index > 0 ? <span className="segment-timeline__connector" /> : null}
              <button
                className={classes}
                type="button"
                disabled={locked}
                onClick={() => { selectZone(viewedZone.zoneIndex, segment); }}
                onMouseEnter={(event) => {
                  setHoveredSegment(segment);
                  setTooltipPosition({ x: event.clientX, y: event.clientY });
                }}
                onMouseMove={(event) => {
                  setTooltipPosition({ x: event.clientX, y: event.clientY });
                }}
                onMouseLeave={() => {
                  setHoveredSegment(null);
                  setTooltipPosition(null);
                }}
                onFocus={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setHoveredSegment(segment);
                  setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.bottom });
                }}
                onBlur={() => {
                  setHoveredSegment(null);
                  setTooltipPosition(null);
                }}
                aria-label={accessibleLabel}
              >
                <span aria-hidden="true">{current ? "☠" : ""}</span>
              </button>
              {showTooltip && createPortal(
                <div
                  className="segment-timeline__tooltip"
                  role="tooltip"
                  style={{
                    left: `${String(Math.max(12, Math.min(tooltipPosition.x + 18, window.innerWidth - 276)))}px`,
                    top: `${String(Math.max(12, Math.min(tooltipPosition.y + 18, window.innerHeight - 220)))}px`,
                  }}
                >
                  <strong className="segment-timeline__tooltip-title">Segment {segment}</strong>
                  <span className="segment-timeline__tooltip-ip">IP CONSEILLÉ : {recommendedIp}</span>
                  <span className="segment-timeline__tooltip-divider" />
                  <span className="segment-timeline__tooltip-rate">
                    <span className="segment-timeline__tooltip-icon" aria-hidden="true">◉</span>
                    <span>Silver/h</span>
                    <b>{formatRate(rates.silverPerHour)}</b>
                  </span>
                  <span className="segment-timeline__tooltip-rate">
                    <span className="segment-timeline__tooltip-icon segment-timeline__tooltip-icon--fame" aria-hidden="true">★</span>
                    <span>Fame/h</span>
                    <b>{formatRate(rates.famePerHour)}</b>
                  </span>
                  <span className="segment-timeline__tooltip-divider" />
                  <span className="segment-timeline__tooltip-action">
                    <span aria-hidden="true">▣</span>
                    Cliquer pour aller à ce segment
                  </span>
                </div>,
                document.body,
              )}
              <span className="segment-timeline__number">{segment}</span>
            </div>
          );
        })}
      </div>

      <div className="segment-timeline__details">
        <span>
          {isViewingActiveZone
            ? `Segment ${world.segmentIndex}/${world.segmentCount} · Rencontre ${world.encounterIndex}/${world.encounterCount}${world.encounterType === "boss" ? " · BOSS" : world.encounterType === "elite" ? " · ÉLITE" : ""}`
            : `Dernier segment actif : ${viewedZone.segmentIndex}/${world.segmentCount}`}
        </span>
        <strong>
          IP recommandé : {String(
            getSegmentRecommendedItemPower(
              viewedZone.zoneIndexWithinBand + 1,
              displayedSegment,
              viewedZone.worldBandId,
            ),
          )}
        </strong>
        <div className="segment-timeline__modes">
          <button
            type="button"
            className={!world.farmMode ? "is-active" : ""}
            onClick={() => { setSegmentFarmMode(false); }}
          >
            Progression
          </button>
          <button
            type="button"
            className={world.farmMode ? "is-active" : ""}
            onClick={() => { setSegmentFarmMode(true); }}
          >
            Farm
          </button>
        </div>
      </div>

      {world.pendingZoneIndex !== null ? (
        <div className="segment-timeline__pending">
          Déplacement programmé : zone {world.pendingZoneIndex}, segment {world.pendingSegmentIndex}
        </div>
      ) : null}
    </section>
  );
}
