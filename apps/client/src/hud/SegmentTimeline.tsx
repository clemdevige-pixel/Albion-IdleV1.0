import { useEffect, useState } from "react";
import { getSegmentRecommendedItemPower } from "../data/itemPower";
import { useGameBridge, useGameServices } from "../state/GameContext";

export function SegmentTimeline(): JSX.Element {
  const state = useGameBridge();
  const { world } = state;
  const { selectZone, setSegmentFarmMode } = useGameServices();
  const [viewedZoneIndex, setViewedZoneIndex] = useState(world.zoneIndex);

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

          return (
            <div className="segment-timeline__step" key={segment}>
              {index > 0 ? <span className="segment-timeline__connector" /> : null}
              <button
                className={classes}
                type="button"
                disabled={locked}
                onClick={() => { selectZone(viewedZone.zoneIndex, segment); }}
                title={locked ? "Segment verrouillé" : `Aller au segment ${segment}`}
                aria-label={locked ? `Segment ${segment} verrouillé` : `Aller au segment ${segment}`}
              >
                <span aria-hidden="true">{current ? "☠" : ""}</span>
              </button>
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
