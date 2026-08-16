import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getSegmentRecommendedItemPower } from "../../../data/itemPower";
import { calculateProjectedSegmentRates } from "../../../runtime/projectedRateCalculator";
import { useGameBridge } from "../../../state/GameContext";
import { CombatStopButton } from "../../combat-hud/CombatStopButton";
import { DashboardCard } from "./DashboardCard";
import type { DashboardZoneModel, DashboardZoneOptionModel } from "../dashboardModels";
import "./DashboardZoneCard.css";

interface DashboardZoneCardProps {
  readonly zone: DashboardZoneModel;
  readonly onSelectSegment: (zoneIndex: number, segmentIndex: number) => boolean;
  readonly onSetFarmMode: (enabled: boolean) => void;
}

function fallbackZone(zone: DashboardZoneModel): DashboardZoneOptionModel {
  return {
    zoneDefId: "",
    zoneIndex: zone.zoneIndex,
    worldBandId: zone.worldBandId,
    zoneIndexWithinBand: zone.zoneIndexWithinBand,
    tier: 0,
    biomeName: zone.biomeName,
    zoneName: zone.zoneName,
    isUnlocked: true,
    isActive: true,
    segmentIndex: zone.segmentIndex,
    unlockedSegmentCount: zone.segmentIndex,
    segments: zone.segments,
    recommendedItemPower: zone.recommendedItemPower,
  };
}

function readComputedStat(
  stats: ReturnType<typeof useGameBridge>["stats"],
  id: string,
): number {
  return stats.stats.find((entry) => entry.id === id)?.computed ?? 0;
}

function formatRate(value: number): string {
  return Math.round(value).toLocaleString("fr-FR");
}

export function DashboardZoneCard({
  zone,
  onSelectSegment,
  onSetFarmMode,
}: DashboardZoneCardProps): JSX.Element {
  const bridge = useGameBridge();
  const [viewedZoneIndex, setViewedZoneIndex] = useState(zone.zoneIndex);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setViewedZoneIndex(zone.zoneIndex);
  }, [zone.zoneIndex]);

  const viewedZone = zone.zones.find((candidate) => candidate.zoneIndex === viewedZoneIndex)
    ?? zone.zones.find((candidate) => candidate.isActive)
    ?? fallbackZone(zone);

  const pendingSegment = bridge.world.pendingZoneIndex === viewedZone.zoneIndex
    ? bridge.world.pendingSegmentIndex
    : null;
  const hasPendingSegment = pendingSegment !== null;
  const displayedSegment = hasPendingSegment ? pendingSegment : viewedZone.segmentIndex;
  const displayedRecommendedItemPower = getSegmentRecommendedItemPower(
    viewedZone.zoneIndexWithinBand + 1,
    displayedSegment,
    viewedZone.worldBandId,
  );
  const equippedWeaponId = bridge.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId;
  const physicalDamage = readComputedStat(bridge.stats, "stat_physical_damage");
  const magicalDamage = readComputedStat(bridge.stats, "stat_magical_damage");
  const attackSpeed = readComputedStat(bridge.stats, "stat_attack_speed");
  const primaryAbilityAutoCast = bridge.abilities.primary?.autoCast ?? false;

  return (
    <DashboardCard
      title="Zone actuelle"
      iconSrc="/assets/ui/nav-world.png"
      className="dashboard-card--zone"
      meta={<span className="dashboard-zone__ip">IP conseillé · {String(displayedRecommendedItemPower)}</span>}
    >
      <div className="dashboard-zone__browser">
        <button
          type="button"
          disabled={viewedZone.zoneIndex <= 1}
          aria-label="Consulter la zone précédente"
          onClick={() => { setViewedZoneIndex((current) => Math.max(1, current - 1)); }}
        >
          ‹
        </button>
        <div className="dashboard-zone__heading">
          <strong>{viewedZone.biomeName} — {viewedZone.zoneName}</strong>
          <span>
            {viewedZone.isActive
              ? "Zone actuelle"
              : viewedZone.isUnlocked ? "Zone accessible" : "Zone verrouillée"}
          </span>
        </div>
        <button
          type="button"
          disabled={viewedZone.zoneIndex >= zone.zoneCount}
          aria-label="Consulter la zone suivante"
          onClick={() => { setViewedZoneIndex((current) => Math.min(zone.zoneCount, current + 1)); }}
        >
          ›
        </button>
      </div>

      <div className="dashboard-zone__timeline" aria-label="Progression des segments">
        {viewedZone.segments.map((segment) => {
          const pending = pendingSegment === segment.index;
          const locked = segment.state === "locked";
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
              className={`dashboard-zone__segment dashboard-zone__segment--${segment.state}`}
              type="button"
              disabled={locked}
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
              onClick={() => { onSelectSegment(viewedZone.zoneIndex, segment.index); }}
            >
              <span
                style={pending ? { outline: "1px dashed currentColor", outlineOffset: 2 } : undefined}
              >
                {segment.isZoneBoss ? "☠" : String(segment.index)}
              </span>
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

      <div className="dashboard-zone__timeline-labels" aria-live="polite">
        <span>Départ</span>
        <strong>
          {hasPendingSegment
            ? `Segment ${String(pendingSegment)} en attente`
            : `Segment ${String(viewedZone.segmentIndex)} / ${String(zone.segmentCount)}`}
        </strong>
        <span>Boss</span>
      </div>

      <div className="dashboard-progress dashboard-progress--gold" aria-label="Progression de zone">
        <span style={{ width: `${String(Math.max(0, Math.min(100, zone.progress)))}%` }} />
      </div>
      <div className="dashboard-zone__modes" aria-label="Mode de progression">
        <button
          type="button"
          className={zone.farmMode ? "" : "is-active"}
          aria-pressed={!zone.farmMode}
          onClick={() => { onSetFarmMode(false); }}
        >
          Progression
        </button>
        <button
          type="button"
          className={zone.farmMode ? "is-active" : ""}
          aria-pressed={zone.farmMode}
          onClick={() => { onSetFarmMode(true); }}
        >
          Farm
        </button>
      </div>
      <div
        className="dashboard-zone__combat-stop"
        style={{ display: "flex", justifyContent: "center", marginTop: 8 }}
      >
        <CombatStopButton />
      </div>
      <div className="dashboard-zone__footer">
        <div>
          <span>{viewedZone.isActive ? "Rencontre" : "Dernier segment"}</span>
          <strong>
            {viewedZone.isActive
              ? `${String(zone.encounterIndex)} / ${String(zone.encounterCount)}`
              : `${String(viewedZone.segmentIndex)} / ${String(zone.segmentCount)}`}
          </strong>
        </div>
        <div>
          <span>{viewedZone.isActive ? zone.bossTitle : "Accès"}</span>
          <strong className="dashboard-zone__boss-detail">{viewedZone.isActive ? zone.bossDetail : viewedZone.isUnlocked ? "Segments accessibles" : "Zone verrouillée"}</strong>
        </div>
      </div>
    </DashboardCard>
  );
}
