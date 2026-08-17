import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getSegmentRecommendedItemPower } from "../../data/itemPower";
import { calculateProjectedSegmentRates } from "../../runtime/projectedRateCalculator";
import { useGameBridge } from "../../state/GameContext";
import { useDashboardZone, useDashboardZoneActions } from "../dashboard/useDashboardData";
import "./WorldSegmentStrip.css";

function readComputedStat(
  stats: ReturnType<typeof useGameBridge>["stats"],
  id: string,
): number {
  return stats.stats.find((entry) => entry.id === id)?.computed ?? 0;
}

function formatRate(value: number): string {
  return Math.round(value).toLocaleString("fr-FR");
}

/**
 * Single permanent world browser for zones and segments.
 * Reuses the dashboard zone model and keeps projected-rate hover information in one place.
 */
export function WorldSegmentStrip(): JSX.Element {
  const bridge = useGameBridge();
  const zone = useDashboardZone();
  const { selectZoneSegment } = useDashboardZoneActions();
  const [viewedZoneIndex, setViewedZoneIndex] = useState(zone.zoneIndex);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setViewedZoneIndex(zone.zoneIndex);
  }, [zone.zoneIndex]);

  const viewedZone = zone.zones.find((candidate) => candidate.zoneIndex === viewedZoneIndex)
    ?? zone.zones.find((candidate) => candidate.isActive)
    ?? zone;

  const equippedWeaponId = bridge.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId;
  const physicalDamage = readComputedStat(bridge.stats, "stat_physical_damage");
  const magicalDamage = readComputedStat(bridge.stats, "stat_magical_damage");
  const attackSpeed = readComputedStat(bridge.stats, "stat_attack_speed");
  const primaryAbilityAutoCast = bridge.abilities.primary?.autoCast ?? false;
  const progressedSegmentCount = viewedZone.segments.filter((segment) => segment.state !== "locked").length;
  const railProgress = viewedZone.segments.length <= 1
    ? 100
    : Math.max(0, Math.min(100, ((progressedSegmentCount - 1) / (viewedZone.segments.length - 1)) * 100));

  return (
    <div className="world-segment-strip" aria-label="Navigation des zones et segments">
      <div className="world-segment-strip__zone-browser">
        <button
          type="button"
          className="world-segment-strip__zone-arrow world-segment-strip__zone-arrow--previous"
          disabled={viewedZone.zoneIndex <= 1}
          aria-label="Consulter la zone précédente"
          onClick={() => { setViewedZoneIndex((current) => Math.max(1, current - 1)); }}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className="world-segment-strip__zone-heading">
          <strong>{viewedZone.biomeName} — {viewedZone.zoneName}</strong>
          <span>{viewedZone.isActive ? "Zone actuelle" : viewedZone.isUnlocked ? "Zone accessible" : "Zone verrouillée"}</span>
        </div>
        <button
          type="button"
          className="world-segment-strip__zone-arrow world-segment-strip__zone-arrow--next"
          disabled={viewedZone.zoneIndex >= zone.zoneCount}
          aria-label="Consulter la zone suivante"
          onClick={() => { setViewedZoneIndex((current) => Math.min(zone.zoneCount, current + 1)); }}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="world-segment-strip__timeline">
        <span className="world-segment-strip__rail" aria-hidden="true">
          <span
            className="world-segment-strip__rail-progress"
            style={{ width: `${String(railProgress)}%` }}
          />
        </span>
        {viewedZone.segments.map((segment) => {
          const locked = segment.state === "locked" || !viewedZone.isUnlocked;
          const pending = bridge.world.pendingZoneIndex === viewedZone.zoneIndex
            && bridge.world.pendingSegmentIndex === segment.index;
          const recommendedIp = getSegmentRecommendedItemPower(
            viewedZone.zoneIndexWithinBand + 1,
            segment.index,
            viewedZone.worldBandId,
          );
          const rates = locked ? undefined : calculateProjectedSegmentRates({
            physicalDamage,
            magicalDamage,
            attackSpeed,
            equippedWeaponId,
            primaryAbilityAutoCast,
            currentZoneIndex: viewedZone.zoneIndexWithinBand,
            currentWorldBandId: viewedZone.worldBandId,
            currentSegment: segment.index - 1,
          });
          const showTooltip = !locked
            && rates !== undefined
            && hoveredSegment === segment.index
            && tooltipPosition !== null;

          return (
            <button
              key={segment.index}
              type="button"
              className={`world-segment-strip__segment world-segment-strip__segment--${segment.state}${segment.isZoneBoss ? " world-segment-strip__segment--boss" : ""}${pending ? " is-pending" : ""}`}
              disabled={locked}
              aria-current={viewedZone.isActive && segment.state === "current" ? "step" : undefined}
              aria-label={locked
                ? `Segment ${String(segment.index)} verrouillé`
                : `Segment ${String(segment.index)}. IP conseillé ${String(recommendedIp)}. Silver par heure ${formatRate(rates?.silverPerHour ?? 0)}. Fame par heure ${formatRate(rates?.famePerHour ?? 0)}.${pending ? " Changement en attente." : ""}`}
              onMouseEnter={(event) => {
                if (locked) return;
                setHoveredSegment(segment.index);
                setTooltipPosition({ x: event.clientX, y: event.clientY });
              }}
              onMouseMove={(event) => {
                if (locked) return;
                setTooltipPosition({ x: event.clientX, y: event.clientY });
              }}
              onMouseLeave={() => {
                setHoveredSegment(null);
                setTooltipPosition(null);
              }}
              onFocus={(event) => {
                if (locked) return;
                const rect = event.currentTarget.getBoundingClientRect();
                setHoveredSegment(segment.index);
                setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.bottom });
              }}
              onBlur={() => {
                setHoveredSegment(null);
                setTooltipPosition(null);
              }}
              onClick={() => { selectZoneSegment(viewedZone.zoneIndex, segment.index); }}
            >
              <span>{segment.isZoneBoss ? "" : String(segment.index)}</span>
              {showTooltip && createPortal(
                <div
                  className="world-segment-strip__tooltip"
                  role="tooltip"
                  style={{
                    left: `${String(Math.max(12, Math.min(tooltipPosition.x + 16, window.innerWidth - 286)))}px`,
                    top: `${String(Math.max(12, Math.min(tooltipPosition.y + 16, window.innerHeight - 210)))}px`,
                  }}
                >
                  <strong className="world-segment-strip__tooltip-title">Segment {String(segment.index)}</strong>
                  <span className="world-segment-strip__tooltip-ip">IP CONSEILLÉ · {String(recommendedIp)}</span>
                  <span className="world-segment-strip__tooltip-divider" />
                  <span className="world-segment-strip__tooltip-rate">
                    <span className="world-segment-strip__tooltip-icon" aria-hidden="true">◉</span>
                    <span>Silver/h</span>
                    <b className="world-segment-strip__tooltip-value world-segment-strip__tooltip-value--silver">{formatRate(rates.silverPerHour)}</b>
                  </span>
                  <span className="world-segment-strip__tooltip-rate">
                    <span className="world-segment-strip__tooltip-icon world-segment-strip__tooltip-icon--fame" aria-hidden="true">★</span>
                    <span>Fame/h</span>
                    <b className="world-segment-strip__tooltip-value world-segment-strip__tooltip-value--fame">{formatRate(rates.famePerHour)}</b>
                  </span>
                  <span className="world-segment-strip__tooltip-divider" />
                  <span className="world-segment-strip__tooltip-action">Cliquer pour aller à ce segment</span>
                </div>,
                document.body,
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
