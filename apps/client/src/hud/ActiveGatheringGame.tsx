import { useEffect, useRef, useState } from "react";
import { ACTIVE_GATHERING_REWARD_RULES } from "../runtime/activeGatheringRewardRules";
import "./ActiveGatheringGame.css";

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

const DEFAULT_FEEDBACK = "Enchaînez les frappes pour augmenter le rendement.";

export function ActiveGatheringGame(
  props: ActiveGatheringGameProps,
): JSX.Element {
  const [markerPosition, setMarkerPosition] = useState(0);
  const [feedback, setFeedback] = useState(DEFAULT_FEEDBACK);
  const [feedbackQuality, setFeedbackQuality] = useState<"miss" | "correct" | "perfect" | null>(null);
  const markerDirection = useRef(1);
  const lastFrameTime = useRef<number | null>(null);
  const feedbackTimeout = useRef<number | null>(null);

  useEffect(() => {
    setMarkerPosition(0);
    setFeedback(DEFAULT_FEEDBACK);
    setFeedbackQuality(null);
    markerDirection.current = 1;
    lastFrameTime.current = null;
    if (feedbackTimeout.current !== null) {
      window.clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = null;
    }
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
      if (feedbackTimeout.current !== null) {
        window.clearTimeout(feedbackTimeout.current);
        feedbackTimeout.current = null;
      }
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

    const scoreGain = ACTIVE_GATHERING_REWARD_RULES.scorePerStrike[quality];
    setFeedbackQuality(quality);
    setFeedback(
      quality === "perfect"
        ? `PARFAIT  +${String(scoreGain)} rendement`
        : quality === "correct"
          ? `CORRECT  +${String(scoreGain)} rendement`
          : "RATÉ  ·  streak et rendement réinitialisés",
    );

    if (feedbackTimeout.current !== null) {
      window.clearTimeout(feedbackTimeout.current);
    }
    feedbackTimeout.current = window.setTimeout(() => {
      setFeedback(DEFAULT_FEEDBACK);
      setFeedbackQuality(null);
      feedbackTimeout.current = null;
    }, 1100);

    setMarkerPosition(0);
    markerDirection.current = 1;
  };

  const nextMultiplier = props.nextYieldThreshold === null
    ? null
    : Math.min(3, props.yieldMultiplier + 1);

  return (
    <div className="active-gathering" aria-label="Récolte active">
      <div className="active-gathering__header">
        <strong>Frappe active</strong>
        <span>{String(props.strikesUsed)} frappe{props.strikesUsed > 1 ? "s" : ""}</span>
      </div>

      <div className="active-gathering__reward-summary">
        <strong>Streak ×{String(props.streak)}</strong>
        <b>
          {nextMultiplier === null
            ? `Rendement ×${String(props.yieldMultiplier)} · MAX`
            : `Rendement ×${String(props.yieldMultiplier)} → ×${String(nextMultiplier)}`}
        </b>
      </div>

      <div className="active-gathering__yield-wrap">
        <div className="active-gathering__yield" aria-label={`Rendement ${String(props.yieldScore)} points`}>
          <span style={{ width: `${String(props.yieldProgressToNext)}%` }} />
        </div>
        <small>
          {props.nextYieldThreshold === null
            ? "Palier maximum"
            : `${String(props.yieldScore)} / ${String(props.nextYieldThreshold)} vers ×${String(nextMultiplier)}`}
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
      <small className={`active-gathering__feedback${feedbackQuality === null ? "" : ` is-${feedbackQuality}`}`}>
        {feedback}
      </small>
    </div>
  );
}
