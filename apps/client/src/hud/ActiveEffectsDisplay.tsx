import { useGameBridge } from "../state/GameContext";

const EFFECT_SYMBOLS: Record<string, string> = {
  buff: "+",
  debuff: "-",
  stun: "!",
  root: "#",
  slow: "~",
  silence: "x",
};

/**
 * Small status effect icons for active buffs/debuffs.
 */
export function ActiveEffectsDisplay(): JSX.Element {
  const { activeEffects } = useGameBridge();

  if (activeEffects.length === 0) {
    return <div className="active-effects" />;
  }

  return (
    <div className="active-effects">
      {activeEffects.map((effect) => (
        <div
          key={effect.id}
          className={`active-effects__icon active-effects__icon--${effect.type}`}
          title={`${effect.name} (${String(Math.ceil(effect.remainingDuration))}s)`}
        >
          <span className="active-effects__symbol">
            {EFFECT_SYMBOLS[effect.type] ?? "?"}
          </span>
        </div>
      ))}
    </div>
  );
}
