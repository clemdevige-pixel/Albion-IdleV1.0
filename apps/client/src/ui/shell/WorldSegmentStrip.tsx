import { useState } from "react";
import { createPortal } from "react-dom";
import { getSegmentRecommendedItemPower } from "../../data/itemPower";
import { calculateProjectedSegmentRates } from "../../runtime/projectedRateCalculator";
import { useGameBridge } from "../../state/GameContext";
import { useDashboardZone, useDashboardZoneActions } from "../dashboard/useDashboardData";

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
 * Single permanent segment timeline for the active world zone.
 * Owns the segment navigation and the existing projected-rate hover information.
 */
export function WorldSegmentStrip(): JSX.Element {
  const bridge = useGameBridge();
  const zone = useDashboardZone();
  const { selectZoneSegment } = useDashboardZoneActions();
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const equippedWeaponId = bridge.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId;
  const physicalDamage = readComputedStat(bridge.stats, "stat_physical_damage");
  const magicalDamage = readComputedStat(bridge.stats, "stat_magical_damage");
  const attackSpeed = readComputedStat(bridge.stats, "stat_attack_speed");
  const primaryAbilityAutoCast = bridge.abilities.primary?.autoCast ?? false;

  return (
    <div className="world-segment-strip" aria-label="Progression des segments">
      <span className="world-segment-strip__label">Progression</span>
      <div
        className="world-segment-strip__timeline"
        style={{ gridTemplateColumns: `repeat(${String(Math.max(1, zone.segmentCount))}, 1fr)` }}
      >
        {zone.segments.map((segment) => {
          const locked = segment.state === "locked";
          const pending = bridge.world.pendingZoneIndex === zone.zoneIndex
            && bridge.world.pendingSegmentIndex === segment.index;
          const recommendedIp = getSegmentRecommendedItemPower(
            zone.zoneIndexWithinBand + 1,
            segment.index,
            zone.worldBandId,
          );
          const rates = locked ? undefined : calculateProjectedSegmentRates({
            physicalDamage,
            magicalDamage,
            attackSpeed,
            equippedWeaponId,
            primaryAbilityAutoCast,
            currentZoneIndex: zone.zoneIndexWithinBand,
            currentWorldBandId: zone.worldBandId,
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
              className={`world-segment-strip__segment world-segment-strip__segment--${segment.state}${pending ? " is-pending" : ""}`}
              disabled={locked}
              aria-current={segment.state === "current" ? "step" : undefined}
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
              onClick={() => { selectZoneSegment(zone.zoneIndex, segment.index); }}
            >
              <span>{segment.isZoneBoss ? "☠" : String(segment.index)}</span>
              {showTooltip && createPortal(
                <div
                  className="dashboard-zone-tooltip"
                  role="tooltip"
                  style={{
                    left: `${String(Math.max(12, Math.min(tooltipPosition.x + 16, window.innerWidth - 286)))}px`,
                    top: `${String(Math.max(12, Math.min(tooltipPosition.y + 16, window.innerHeight - 210)))}px`,
                  }}
                >
                  <strong className="dashboard-zone-tooltip__title">Segment {String(segment.index)}</strong>
                  <span className="dashboard-zone-tooltip__ip">IP CONSEILLÉ · {String(recommendedIp)}</span>
                  <span className="dashboard-zone-tooltip__divider" />
                  <span className="dashboard-zone-tooltip__rate">
                    <span className="dashboard-zone-tooltip__icon" aria-hidden="true">◉</span>
                    <span>Silver/h</span>
                    <b className="dashboard-zone-tooltip__value dashboard-zone-tooltip__value--silver">{formatRate(rates.silverPerHour)}</b>
                  </span>
                  <span className="dashboard-zone-tooltip__rate">
                    <span className="dashboard-zone-tooltip__icon dashboard-zone-tooltip__icon--fame" aria-hidden="true">★</span>
                    <span>Fame/h</span>
                    <b className="dashboard-zone-tooltip__value dashboard-zone-tooltip__value--fame">{formatRate(rates.famePerHour)}</b>
                  </span>
                  <span className="dashboard-zone-tooltip__divider" />
                  <span className="dashboard-zone-tooltip__action">Cliquer pour aller à ce segment</span>
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
