import { resolveStatusEffectPresentation } from "../data/statusEffectPresentationCatalog";
import { useActiveEffectsUiModel } from "../ui/combat-hud/combatHudSelectors";

const EFFECT_SYMBOLS: Record<string, string> = {
  buff: "+",
  debuff: "-",
  stun: "!",
  root: "#",
  slow: "~",
  silence: "x",
};

/** Small status effect icons for active buffs/debuffs. */
export function ActiveEffectsDisplay(): JSX.Element {
  const activeEffects = useActiveEffectsUiModel();

  if (activeEffects.length === 0) {
    return <div className="active-effects" />;
  }

  return (
    <div className="active-effects">
      {activeEffects.map((effect) => {
        const presentation = resolveStatusEffectPresentation(effect.name);
        const label = presentation?.label ?? effect.name;
        const symbol = presentation?.symbol ?? EFFECT_SYMBOLS[effect.type] ?? "?";
        return (
          <div
            key={effect.id}
            className={`active-effects__icon active-effects__icon--${effect.type}`}
            title={`${label} (${String(Math.ceil(effect.remainingDuration))}s)`}
            aria-label={`${label} ${String(Math.ceil(effect.remainingDuration))}s`}
          >
            <span className="active-effects__symbol">{symbol}</span>
          </div>
        );
      })}
    </div>
  );
}
