import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DUNGEON_DEFINITIONS } from "../../data/dungeonContentCatalog.js";
import { getSegmentRecommendedItemPower } from "../../data/itemPower";
import { resolveProjectedSegmentRates } from "../../runtime/projectedRateResolver";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { useDashboardZone, useDashboardZoneActions } from "../dashboard/useDashboardData";
import {
  buildDungeonCombatTimeline,
  buildTowerCombatTimeline,
  type CombatTimelineModel,
  type CombatTimelineNodeModel,
} from "./combatTimelineModel.js";
import "./WorldSegmentStrip.css";

function formatRate(value: number): string {
  return Math.round(value).toLocaleString("fr-FR");
}

function activityNodeClass(node: CombatTimelineNodeModel): string {
  const stateClass = node.state === "upcoming" ? "locked" : node.state;
  const bossClass = node.kind === "boss" || node.kind === "major-boss"
    ? " world-segment-strip__segment--boss"
    : "";
  const kindClass = node.kind === "normal" || node.kind === "boss"
    ? ""
    : ` world-segment-strip__segment--${node.kind}`;
  return `world-segment-strip__segment world-segment-strip__segment--${stateClass}${bossClass}${kindClass}`;
}

function ActivityCombatTimeline({ model }: { readonly model: CombatTimelineModel }): JSX.Element {
  return (
    <div
      className={`world-segment-strip world-segment-strip--activity world-segment-strip--${model.mode}`}
      aria-label={model.mode === "dungeon" ? "Progression du donjon" : "Progression de la Tour"}
    >
      <div className="world-segment-strip__zone-browser world-segment-strip__zone-browser--activity">
        <div className="world-segment-strip__zone-heading">
          <strong>{model.title}</strong>
          <span>{model.subtitle}</span>
        </div>
      </div>

      <div className="world-segment-strip__timeline">
        <span className="world-segment-strip__rail" aria-hidden="true">
          <span
            className="world-segment-strip__rail-progress"
            style={{ width: `${String(model.railProgress)}%` }}
          />
        </span>
        {model.nodes.map((node) => (
          <span
            key={node.id}
            className={activityNodeClass(node)}
            role="img"
            aria-label={node.ariaLabel}
            aria-current={node.state === "current" ? "step" : undefined}
          >
            <span>{node.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Single permanent combat timeline.
 * World segments remain the default mode; active instanced combat projects its
 * own authoritative progression into the same visual contract.
 */
export function WorldSegmentStrip(): JSX.Element {
  const bridge = useGameBridge();
  const { getDungeonState, getTowerState } = useGameServices();
  const zone = useDashboardZone();
  const { selectZoneSegment } = useDashboardZoneActions();
  const [viewedZoneIndex, setViewedZoneIndex] = useState(zone.zoneIndex);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setViewedZoneIndex(zone.zoneIndex);
  }, [zone.zoneIndex]);

  const dungeonState = getDungeonState();
  const activeDungeonRun = dungeonState.activeRun?.status === "active" ? dungeonState.activeRun : undefined;
  const activeDungeonDefinition = activeDungeonRun === undefined
    ? undefined
    : DUNGEON_DEFINITIONS.find((definition) => definition.id === activeDungeonRun.definitionId);
  const towerState = getTowerState();

  if (activeDungeonRun !== undefined && activeDungeonDefinition !== undefined) {
    return <ActivityCombatTimeline model={buildDungeonCombatTimeline(activeDungeonRun, activeDungeonDefinition)} />;
  }

  if (towerState.active) {
    return <ActivityCombatTimeline model={buildTowerCombatTimeline(towerState.progression)} />;
  }

  const viewedZone = zone.zones.find((candidate) => candidate.zoneIndex === viewedZoneIndex)
    ?? zone.zones.find((candidate) => candidate.isActive)
    ?? zone.zones[0];

  if (viewedZone === undefined) {
    return <div className="world-segment-strip" aria-label="Navigation des zones et segments" />;
  }

  const progressedSegmentCount = viewedZone.segments.filter((segment) => segment.state !== "locked").length;
  const railProgress = viewedZone.segments.length <= 1
    ? 100
    : Math.max(0, Math.min(100, ((progressedSegmentCount - 1) / (viewedZone.segments.length - 1)) * 100));
  const zoneBandLabel = `${viewedZone.worldBandId.toUpperCase()} ZONE`;

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
          <span
            className={`world-segment-strip__zone-band world-segment-strip__zone-band--${viewedZone.worldBandId}`}
          >
            <i className="world-segment-strip__zone-band-dot" aria-hidden="true" />
            {zoneBandLabel}
          </span>
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
          const rates = locked ? undefined : resolveProjectedSegmentRates(bridge, {
            zoneDefId: viewedZone.zoneDefId,
            segmentIndex: segment.index - 1,
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
