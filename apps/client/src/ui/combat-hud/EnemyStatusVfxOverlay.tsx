import { resolveStatusEffectWorldVfx } from "../../data/statusEffectWorldVfxCatalog";
import { useActiveEffectsUiModel } from "./combatHudSelectors";
import "./enemyStatusVfx.css";

export function EnemyStatusVfxOverlay(): JSX.Element | null {
  const effects = useActiveEffectsUiModel();
  const burning = effects.some((effect) => {
    const presentation = resolveStatusEffectWorldVfx(effect.name);
    return presentation?.target === "enemy" && presentation.style === "burning";
  });

  if (!burning) return null;
  return (
    <div className="enemy-status-vfx" aria-hidden="true">
      <div className="enemy-status-vfx__flame enemy-status-vfx__flame--left" />
      <div className="enemy-status-vfx__flame enemy-status-vfx__flame--center" />
      <div className="enemy-status-vfx__flame enemy-status-vfx__flame--right" />
      <div className="enemy-status-vfx__glow" />
    </div>
  );
}
