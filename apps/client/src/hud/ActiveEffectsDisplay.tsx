import type { CSSProperties } from "react";
import {
  resolveStatusEffectAnchor,
  resolveStatusEffectPresentation,
  type StatusEffectAnchor,
} from "../data/statusEffectPresentationCatalog";
import type { ActiveEffectDisplay } from "../game/GameBridge";
import { renderManifestRegistry } from "../game/render/defaultRenderManifestRegistry";
import { useActiveEffectsUiModel } from "../ui/combat-hud/combatHudSelectors";
import { useGameUiSelector } from "../ui/state";
import "./activeEffectsWorld.css";

function EffectGroup({
  anchor,
  effects,
  top,
}: {
  readonly anchor: StatusEffectAnchor;
  readonly effects: readonly ActiveEffectDisplay[];
  readonly top: string;
}): JSX.Element | null {
  const anchored = effects.filter(
    (effect) => resolveStatusEffectAnchor(effect.name, effect.type) === anchor,
  );
  if (anchored.length === 0) return null;

  const style: CSSProperties = { top };
  return (
    <div className={`active-effects active-effects--${anchor}`} style={style}>
      {anchored.map((effect) => {
        const presentation = resolveStatusEffectPresentation(effect.name, effect.type);
        return (
          <div
            key={effect.id}
            className={`active-effects__icon active-effects__icon--${effect.type}`}
            tabIndex={0}
            aria-label={`${presentation.label} ${String(Math.ceil(effect.remainingDuration))} secondes`}
          >
            <span className="active-effects__symbol">{presentation.symbol}</span>
            <div className="active-effects__tooltip" role="tooltip">
              <strong>{presentation.label}</strong>
              <span>{presentation.description}</span>
              <small>{String(Math.max(0, Math.ceil(effect.remainingDuration)))}s restantes</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Generic actor-anchored status effects for current and future buffs/debuffs. */
export function ActiveEffectsDisplay(): JSX.Element {
  const effects = useActiveEffectsUiModel();
  const enemyVisualManifestId = useGameUiSelector((state) => state.enemyVisualManifestId);
  const worldHud = renderManifestRegistry.requireDefaultWorldHud();
  const enemyManifest = renderManifestRegistry.requireStaticActor(enemyVisualManifestId);
  const playerTop = `calc(61% - ${String(worldHud.healthBar.offsetY - 24)}px)`;
  const enemyTop = `calc(61% - ${String(enemyManifest.hud.healthBarOffsetY - 24)}px)`;

  return (
    <>
      <EffectGroup anchor="player" effects={effects} top={playerTop} />
      <EffectGroup anchor="enemy" effects={effects} top={enemyTop} />
    </>
  );
}
