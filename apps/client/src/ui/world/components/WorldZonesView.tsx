import { useEffect, useState } from "react";
import type { DashboardZoneModel, DashboardZoneOptionModel } from "../../dashboard/dashboardModels";
import { WORLD_BANDS, type WorldBandId } from "../worldModels";

interface WorldZonesViewProps {
  readonly zone: DashboardZoneModel;
  readonly onTravel: (zoneIndex: number, segmentIndex: number) => boolean;
  readonly onSetFarmMode: (enabled: boolean) => void;
}

function currentZone(zone: DashboardZoneModel): DashboardZoneOptionModel {
  return zone.zones.find((candidate) => candidate.isActive) ?? zone.zones[0] ?? {
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

export function WorldZonesView({ zone, onTravel, onSetFarmMode }: WorldZonesViewProps): JSX.Element {
  const [selectedBand, setSelectedBand] = useState<WorldBandId>(zone.worldBandId);
  const [viewedZoneIndex, setViewedZoneIndex] = useState(zone.zoneIndex);

  useEffect(() => {
    setViewedZoneIndex(zone.zoneIndex);
    setSelectedBand(zone.worldBandId);
  }, [zone.zoneIndex, zone.worldBandId]);

  const bandZones = zone.zones.filter((candidate) => candidate.worldBandId === selectedBand);
  const viewedZone = bandZones.find((candidate) => candidate.zoneIndex === viewedZoneIndex)
    ?? bandZones[0]
    ?? currentZone(zone);
  const selectedBandModel = WORLD_BANDS.find((band) => band.id === selectedBand) ?? WORLD_BANDS[0]!;

  return (
    <div className="world-zones">
      <div className="world-band-list" aria-label="Paliers de monde">
        {WORLD_BANDS.map((band) => (
          <button key={band.id} type="button" className={`world-band world-band--${band.id}${selectedBand === band.id ? " is-active" : ""}`} aria-pressed={selectedBand === band.id} onClick={() => { setSelectedBand(band.id); }}>
            <span>{band.label}</span>
            <small>{band.tierLabel}</small>
            {!band.isAvailable ? <b aria-label="Contenu à venir">◆</b> : null}
          </button>
        ))}
      </div>

      {selectedBandModel.isAvailable === false ? (
        <section className={`world-upcoming world-upcoming--${selectedBandModel.id}`}>
          <span className="world-upcoming__crest" aria-hidden="true">◇</span>
          <small>Zone {selectedBandModel.label}</small>
          <h2>Territoire à venir</h2>
          <p>Ce palier est visible sur la carte du monde, mais son contenu et sa progression ne sont pas encore implémentés.</p>
        </section>
      ) : (
        <>
          <section
            className="world-zone-list"
            aria-label={`Zones du monde ${selectedBandModel.label.toLowerCase()}`}
          >
            {bandZones.map((candidate, index) => (
              <button key={candidate.zoneIndex} type="button" className={`world-zone-row${candidate.zoneIndex === viewedZone.zoneIndex ? " is-selected" : ""}${candidate.isActive ? " is-current" : ""}${!candidate.isUnlocked ? " is-locked" : ""}`} onClick={() => { setViewedZoneIndex(candidate.zoneIndex); }}>
                <span className="world-zone-row__number">{String(index + 1).padStart(2, "0")}</span>
                <span className="world-zone-row__identity">
                  <strong>{candidate.zoneName}</strong>
                  <small>{candidate.biomeName} · T{candidate.tier}</small>
                </span>
                <span className="world-zone-row__state">{candidate.isActive ? "Actuelle" : candidate.isUnlocked ? "Accessible" : "Verrouillée"}</span>
              </button>
            ))}
          </section>

          <section className="world-zone-detail">
            <header>
              <div>
                <small>Zone sélectionnée</small>
                <h2>{viewedZone.zoneName}</h2>
                <p>
                  {viewedZone.biomeName} · Monde {selectedBandModel.label.toLowerCase()}
                </p>
              </div>
              <span className={viewedZone.isUnlocked ? "is-unlocked" : ""}>{viewedZone.isUnlocked ? "Accessible" : "Verrouillée"}</span>
            </header>

            <div className="world-zone-detail__stats">
              <span><small>Palier</small><strong>T{viewedZone.tier}</strong></span>
              <span><small>IP conseillé</small><strong>{viewedZone.recommendedItemPower}</strong></span>
              <span><small>Progression</small><strong>{viewedZone.unlockedSegmentCount} / {zone.segmentCount}</strong></span>
            </div>

            <div className="world-zone-detail__timeline" aria-label="Segments de la zone">
              {viewedZone.segments.map((segment) => (
                <button key={segment.index} type="button" className={`world-zone-segment world-zone-segment--${segment.state}`} disabled={segment.state === "locked"} title={segment.state === "locked" ? `Segment ${segment.index} verrouillé` : `Voyager au segment ${segment.index}`} onClick={() => { onTravel(viewedZone.zoneIndex, segment.index); }}>
                  <span>{segment.isZoneBoss ? "☠" : segment.index}</span>
                  <small>{segment.index}</small>
                </button>
              ))}
            </div>

            {viewedZone.isActive ? (
              <div className="world-zone-detail__encounter">Segment {zone.segmentIndex}/{zone.segmentCount} · Rencontre {zone.encounterIndex}/{zone.encounterCount}</div>
            ) : null}

            <div className="world-zone-detail__modes" aria-label="Mode de combat">
              <button type="button" className={!zone.farmMode ? "is-active" : ""} onClick={() => { onSetFarmMode(false); }}>Progression</button>
              <button type="button" className={zone.farmMode ? "is-active" : ""} onClick={() => { onSetFarmMode(true); }}>Farm</button>
            </div>
            <p className="world-zone-detail__hint">Sélectionner une zone affiche ses segments. Le voyage ne démarre qu’en cliquant sur un segment accessible.</p>
          </section>
        </>
      )}
    </div>
  );
}
