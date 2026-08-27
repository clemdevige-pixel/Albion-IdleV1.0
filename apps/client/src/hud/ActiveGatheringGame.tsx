import { useEffect, useRef, useState } from "react";
import {
  ACTIVE_GATHERING_RULES,
  getActiveGatheringMarkerSpeed,
} from "../runtime/activeGatheringRewardRules";
import "./ActiveGatheringGame.css";

interface ActiveGatheringGameProps {
  readonly cycleId: string;
  readonly strikesUsed: number;
  readonly activity: number;
  readonly yieldMultiplier: 1 | 1.5 | 2 | 3;
  readonly speedBonusRatio: 0 | 0.1 | 0.2 | 0.3;
  readonly nextActivityThreshold: number | null;
  readonly activityProgressToNext: number;
  readonly durationSeconds: number;
  readonly onStrike: (quality: "miss" | "correct" | "perfect") => boolean;
}

const DEFAULT_FEEDBACK = "Maintenez l'activité jusqu'à la fin du cycle.";

function formatMultiplier(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export function ActiveGatheringGame(
  props: ActiveGatheringGameProps,
): JSX.Element {
  const [markerPosition, setMarkerPosition] = useState(0);
  const [feedback, setFeedback] = useState(DEFAULT_FEEDBACK);
  const [feedbackQuality, setFeedbackQuality] = useState<"miss" | "correct" | "perfect" | null>(null);
  const markerDirection = useRef(1);
  const lastFrameTime = useRef<number | null>(null);
  const feedbackTimeout = useRef<number | null>(null);
  const speedBonusRef = useRef(props.speedBonusRatio);

  speedBonusRef.current = props.speedBonusRatio;

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
      const markerSpeed = getActiveGatheringMarkerSpeed(
        props.durationSeconds,
        speedBonusRef.current,
      );
      setMarkerPosition((current) => {
        let next = current + markerDirection.current * deltaSeconds * markerSpeed;
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
  }, [props.cycleId, props.durationSeconds]);

  const strike = (): void => {
    const distanceFromCenter = Math.abs(markerPosition - 50);
    const quality = distanceFromCenter <= 6
      ? "perfect"
      : distanceFromCenter <= 18
        ? "correct"
        : "miss";

    if (!props.onStrike(quality)) return;

    const activityDelta = ACTIVE_GATHERING_RULES.activityPerStrike[quality];
    setFeedbackQuality(quality);
    setFeedback(
      quality === "perfect"
        ? `PARFAIT  +${String(activityDelta)} activité`
        : quality === "correct"
          ? `CORRECT  +${String(activityDelta)} activité`
          : `${String(activityDelta)} activité · maintenez le rythme`,
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

  const speedPercent = Math.round(props.speedBonusRatio * 100);

  return (
    <div className="active-gathering" aria-label="Récolte active">
      <div className="active-gathering__header">
        <strong>Frappe active</strong>
        <span>{String(props.strikesUsed)} frappe{props.strikesUsed > 1 ? "s" : ""}</span>
      </div>

      <div className="active-gathering__reward-summary">
        <strong>Activité {String(Math.round(props.activity))}/100</strong>
        <b>
          ×{formatMultiplier(props.yieldMultiplier)} rendement · +{String(speedPercent)}% vitesse
        </b>
      </div>

      <div className="active-gathering__activity-wrap">
        <div className="active-gathering__activity" aria-label={`Activité ${String(Math.round(props.activity))} sur 100`}>
          <span style={{ width: `${String(Math.max(0, Math.min(100, props.activity)))}%` }} />
        </div>
        <small>
          {props.nextActivityThreshold === null
            ? "Activité max"
            : `Palier ${String(props.nextActivityThreshold)} · ${String(Math.round(props.activityProgressToNext))}%`}
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
