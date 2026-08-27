import { useEffect, useRef, useState } from "react";
import { ACTIVE_GATHERING_REWARD_RULES } from "../runtime/activeGatheringRewardRules";

interface ActiveGatheringGameProps {
  readonly cycleId: string;
  readonly strikesUsed: number;
  readonly streak: number;
  readonly yieldScore: number;
  readonly yieldMultiplier: 1 | 2 | 3;
  readonly nextYieldThreshold: number | null;
  readonly yieldProgressToNext: number;
  readonly durationSeconds: number;
  readonly onStrike: (quality: "miss" | "correct" | "perfect") => boolean;
}

export function ActiveGatheringGame(
  props: ActiveGatheringGameProps,
): JSX.Element {
  const [markerPosition, setMarkerPosition] = useState(0);
  const [feedback, setFeedback] = useState(
    "Enchaînez les frappes pour augmenter le rendement.",
  );
  const markerDirection = useRef(1);
  const lastFrameTime = useRef<number | null>(null);

  useEffect(() => {
    setMarkerPosition(0);
    setFeedback("Enchaînez les frappes pour augmenter le rendement.");
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
    const removedSeconds = props.durationSeconds
      * ACTIVE_GATHERING_REWARD_RULES.speedBonusRatio[quality];
    setFeedback(
      quality === "perfect"
        ? `Parfait · +20 rendement · -${formatSeconds(removedSeconds)} s`
        : quality === "correct"
          ? `Correct · +8 rendement · -${formatSeconds(removedSeconds)} s`
          : "Raté · streak et rendement réinitialisés",
    );
    setMarkerPosition(0);
    markerDirection.current = 1;
  };

  return (
    <div className="active-gathering" aria-label="Récolte active">
      <div className="active-gathering__header">
        <strong>Frappe active</strong>
        <span>Streak ×{String(props.streak)} · Rendement ×{String(props.yieldMultiplier)}</span>
      </div>
      <div className="active-gathering__yield" aria-label={`Rendement ${String(props.yieldScore)} points`}>
        <span style={{ width: `${String(props.yieldProgressToNext)}%` }} />
        <small>
          {props.nextYieldThreshold === null
            ? "Rendement max"
            : `${String(props.yieldScore)} / ${String(props.nextYieldThreshold)}`}
        </small>
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
