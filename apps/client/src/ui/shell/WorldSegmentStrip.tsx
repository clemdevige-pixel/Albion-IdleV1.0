import { useGameBridge } from "../../state/GameContext";
import { useDashboardZone, useDashboardZoneActions } from "../dashboard/useDashboardData";

/**
 * Single permanent segment timeline for the active world zone.
 * Segment navigation remains backed by the existing dashboard/world actions.
 */
export function WorldSegmentStrip(): JSX.Element {
  const bridge = useGameBridge();
  const zone = useDashboardZone();
  const { selectZoneSegment } = useDashboardZoneActions();

  return (
    <div className="world-segment-strip" aria-label="Progression des segments">
      <span className="world-segment-strip__label">Frise de segment</span>
      <div className="world-segment-strip__timeline">
        {zone.segments.map((segment) => {
          const locked = segment.state === "locked";
          const pending = bridge.world.pendingZoneIndex === zone.zoneIndex
            && bridge.world.pendingSegmentIndex === segment.index;
          return (
            <button
              key={segment.index}
              type="button"
              className={`world-segment-strip__segment world-segment-strip__segment--${segment.state}${pending ? " is-pending" : ""}`}
              disabled={locked}
              aria-current={segment.state === "current" ? "step" : undefined}
              aria-label={locked
                ? `Segment ${String(segment.index)} verrouillé`
                : `Aller au segment ${String(segment.index)}`}
              onClick={() => { selectZoneSegment(zone.zoneIndex, segment.index); }}
            >
              {segment.isZoneBoss ? "☠" : String(segment.index)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
