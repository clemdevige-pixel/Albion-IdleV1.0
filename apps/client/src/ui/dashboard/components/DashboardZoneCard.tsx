import { useEffect, useState } from "react";
import { CombatStopButton } from "../../combat-hud/CombatStopButton";
import { DashboardCard } from "./DashboardCard";
import type { DashboardZoneModel, DashboardZoneOptionModel } from "../dashboardModels";

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

export function DashboardZoneCard({
  zone,
  onSelectSegment,
  onSetFarmMode,
}: DashboardZoneCardProps): JSX.Element {
  const [viewedZoneIndex, setViewedZoneIndex] = useState(zone.zoneIndex);

  useEffect(() => {
    setViewedZoneIndex(zone.zoneIndex);
  }, [zone.zoneIndex]);

  const viewedZone = zone.zones.find((candidate) => candidate.zoneIndex === viewedZoneIndex)
    ?? zone.zones.find((candidate) => candidate.isActive)
    ?? fallbackZone(zone);

  return (
    <DashboardCard
      title="Zone actuelle"
      iconSrc="/assets/ui/nav-world.png"
      className="dashboard-card--zone"
      meta={<span className="dashboard-zone__ip">IP conseillé · {String(viewedZone.recommendedItemPower)}</span>}
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
        {viewedZone.segments.map((segment) => (
          <button
            key={segment.index}
            className={`dashboard-zone__segment dashboard-zone__segment--${segment.state}`}
            type="button"
            disabled={segment.state === "locked"}
            title={segment.state === "locked" ? "Segment verrouillé" : `Aller au segment ${String(segment.index)}`}
            aria-label={segment.state === "locked" ? `Segment ${String(segment.index)} verrouillé` : `Aller au segment ${String(segment.index)}`}
            onClick={() => { onSelectSegment(viewedZone.zoneIndex, segment.index); }}
          >
            <span>{segment.isZoneBoss ? "☠" : String(segment.index)}</span>
          </button>
        ))}
      </div>

      <div className="dashboard-zone__timeline-labels" aria-hidden="true">
        <span>Départ</span>
        <strong>Segment {String(viewedZone.segmentIndex)} / {String(zone.segmentCount)}</strong>
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
