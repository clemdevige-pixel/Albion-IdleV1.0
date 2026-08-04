import { useEffect, useRef, useState } from "react";

interface WoodActiveGatheringGameProps {
  readonly cycleId: string;
  readonly strikesUsed: number;
  readonly durationSeconds: number;
  readonly onStrike: (quality: "miss" | "correct" | "perfect") => boolean;
}

export function WoodActiveGatheringGame(
  props: WoodActiveGatheringGameProps,
): JSX.Element {
  const [markerPosition, setMarkerPosition] = useState(0);
  const [feedback, setFeedback] = useState(
    "Frappez au centre pour accélérer le cycle.",
  );
  const markerDirection = useRef(1);
  const lastFrameTime = useRef<number | null>(null);

  useEffect(() => {
    setMarkerPosition(0);
    setFeedback("Frappez au centre pour accélérer le cycle.");
    markerDirection.current = 1;
    lastFrameTime.current = null;
  }, [props.cycleId]);

  useEffect(() => {
    let frameId = 0;
    const animate = (time: number): void => {
      const previousTime = lastFrameTime.current ?? time;
      const deltaSeconds = Math.min(0.05, (time - previousTime) / 1000);
      lastFrameTime.current = time;
      setMarkerPosition((current) => {
        let next = current + markerDirection.current * deltaSeconds * 72;
        if (next >= 100) {
          next = 100;
          markerDirection.current = -1;
        } else if (next <= 0) {
          next = 0;
          markerDirection.current = 1;
        }
        return next;
      });
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameId);
      lastFrameTime.current = null;
    };
  }, [props.cycleId]);

  const strike = (): void => {
    const distanceFromCenter = Math.abs(markerPosition - 50);
    const quality = distanceFromCenter <= 6
      ? "perfect"
      : distanceFromCenter <= 18
        ? "correct"
        : "miss";

    if (!props.onStrike(quality)) return;
    const removedSeconds = props.durationSeconds * (
      quality === "perfect" ? 0.1 : quality === "correct" ? 0.06 : 0
    );
    setFeedback(
      quality === "perfect"
        ? `Parfait ! -${formatSeconds(removedSeconds)} s.`
        : quality === "correct"
          ? `Correct ! -${formatSeconds(removedSeconds)} s.`
          : "Raté — aucun malus.",
    );
    setMarkerPosition(0);
    markerDirection.current = 1;
  };

  return (
    <div className="active-gathering" aria-label="Récolte active du bois">
      <div className="active-gathering__header">
        <strong>Frappe active</strong>
        <span>{props.strikesUsed} frappe{props.strikesUsed > 1 ? "s" : ""}</span>
      </div>
      <div className="active-gathering__meter" aria-hidden="true">
        <span className="active-gathering__zone active-gathering__zone--correct" />
        <span className="active-gathering__zone active-gathering__zone--perfect" />
        <i style={{ left: `${String(markerPosition)}%` }} />
      </div>
      <button
        className="active-gathering__strike"
        type="button"
        onClick={strike}
      >
        Frapper
      </button>
      <small>{feedback}</small>
    </div>
  );
}

function formatSeconds(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}
