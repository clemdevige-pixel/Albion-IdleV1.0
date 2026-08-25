import {
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { resolveStatusEffectIconPath } from "../data/abilityIconPresentation";
import { resolveStatusEffectDotDetails } from "../data/statusEffectDotPresentation";
import {
  resolveStatusEffectAnchor,
  resolveStatusEffectPresentation,
  type StatusEffectAnchor,
} from "../data/statusEffectPresentationCatalog";
import type { ActiveEffectDisplay, StatsVM } from "../game/GameBridge";
import {
  worldHudAnchorStore,
  type WorldHudAnchorSnapshot,
} from "../game/render/presentation/WorldHudAnchorStore";
import { useActiveEffectsUiModel } from "../ui/combat-hud/combatHudSelectors";
import { useGameUiSelector } from "../ui/state";
import "./activeEffectsWorld.css";

interface EffectAnchorPosition {
  readonly left: number;
  readonly top: number;
  readonly visible: boolean;
}

interface EffectAnchorPositions {
  readonly player: EffectAnchorPosition;
  readonly enemy: EffectAnchorPosition;
}

const HIDDEN_POSITION: EffectAnchorPosition = {
  left: 0,
  top: 0,
  visible: false,
};

function formatDamage(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(Math.trunc(rounded)) : rounded.toFixed(1);
}

function resolveDotDamageText(effectId: string, stats: StatsVM): readonly string[] {
  const dot = resolveStatusEffectDotDetails(effectId);
  if (dot === undefined) return [];
  const statId = dot.damageType === "magical" ? "stat_magical_damage" : "stat_physical_damage";
  const sourceDamage = stats.stats.find((stat) => stat.id === statId)?.computed ?? 0;
  const perTick = sourceDamage * dot.ratio;
  const total = perTick * dot.ticks;
  return [
    `${formatDamage(perTick)} dégâts bruts par tick`,
    `${String(dot.ticks)} ticks · ${formatDamage(total)} dégâts bruts au total`,
    `1 tick toutes les ${String(dot.interval)}s`,
  ];
}

function EffectGroup({
  anchor,
  effects,
  position,
  stats,
}: {
  readonly anchor: StatusEffectAnchor;
  readonly effects: readonly ActiveEffectDisplay[];
  readonly position: EffectAnchorPosition;
  readonly stats: StatsVM;
}): JSX.Element | null {
  const anchored = effects.filter(
    (effect) => resolveStatusEffectAnchor(effect.name, effect.type) === anchor,
  );
  if (!position.visible || anchored.length === 0) return null;

  const style: CSSProperties = { left: position.left, top: position.top };
  return (
    <div className={`active-effects active-effects--${anchor}`} style={style}>
      {anchored.map((effect) => {
        const presentation = resolveStatusEffectPresentation(effect.name, effect.type);
        const iconPath = resolveStatusEffectIconPath(effect.name, effect.type);
        const dotLines = resolveDotDamageText(effect.name, stats);
        return (
          <div
            key={effect.id}
            className={`active-effects__icon active-effects__icon--${effect.type}`}
            tabIndex={0}
            aria-label={`${presentation.label} ${String(Math.ceil(effect.remainingDuration))} secondes`}
          >
            <span className="active-effects__symbol">
              {iconPath === undefined
                ? presentation.symbol
                : <img src={iconPath} alt="" aria-hidden="true" />}
            </span>
            <div className="active-effects__tooltip" role="tooltip">
              <strong>{presentation.label}</strong>
              <span>{presentation.description}</span>
              {dotLines.map((line) => <span key={line}>{line}</span>)}
              <small>{String(Math.max(0, Math.ceil(effect.remainingDuration)))}s restantes</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function mapAnchorSnapshotToHud(
  anchors: WorldHudAnchorSnapshot,
): EffectAnchorPositions {
  const canvas = document.querySelector("canvas");
  const hudRoot = document.querySelector(".hud-root");
  if (!(canvas instanceof HTMLCanvasElement) || !(hudRoot instanceof HTMLElement)) {
    return { player: HIDDEN_POSITION, enemy: HIDDEN_POSITION };
  }

  const canvasRect = canvas.getBoundingClientRect();
  const hudRect = hudRoot.getBoundingClientRect();
  if (
    canvas.width <= 0
    || canvas.height <= 0
    || canvasRect.width <= 0
    || canvasRect.height <= 0
  ) {
    return { player: HIDDEN_POSITION, enemy: HIDDEN_POSITION };
  }

  const scaleX = canvasRect.width / canvas.width;
  const scaleY = canvasRect.height / canvas.height;
  const canvasLeft = canvasRect.left - hudRect.left;
  const canvasTop = canvasRect.top - hudRect.top;

  const mapAnchor = (anchor: WorldHudAnchorSnapshot["player"]): EffectAnchorPosition => ({
    left: canvasLeft + anchor.x * scaleX,
    top: canvasTop + anchor.y * scaleY,
    visible: anchor.visible,
  });

  return {
    player: mapAnchor(anchors.player),
    enemy: mapAnchor(anchors.enemy),
  };
}

function useEffectAnchorPositions(
  anchors: WorldHudAnchorSnapshot,
): EffectAnchorPositions {
  const [positions, setPositions] = useState<EffectAnchorPositions>(() => (
    typeof document === "undefined"
      ? { player: HIDDEN_POSITION, enemy: HIDDEN_POSITION }
      : mapAnchorSnapshotToHud(anchors)
  ));

  useEffect(() => {
    setPositions(mapAnchorSnapshotToHud(anchors));
  }, [anchors]);

  useEffect(() => {
    const updatePositions = (): void => {
      setPositions(mapAnchorSnapshotToHud(worldHudAnchorStore.getSnapshot()));
    };

    window.addEventListener("resize", updatePositions);
    const observer = new ResizeObserver(updatePositions);
    const canvas = document.querySelector("canvas");
    if (canvas !== null) observer.observe(canvas);

    return () => {
      window.removeEventListener("resize", updatePositions);
      observer.disconnect();
    };
  }, []);

  return positions;
}

/** Generic actor-anchored status effects bound to the authoritative Phaser health-bar layout. */
export function ActiveEffectsDisplay(): JSX.Element {
  const effects = useActiveEffectsUiModel();
  const stats = useGameUiSelector((state) => state.stats);
  const anchors = useSyncExternalStore(
    (onStoreChange) => worldHudAnchorStore.subscribe(onStoreChange),
    () => worldHudAnchorStore.getSnapshot(),
    () => worldHudAnchorStore.getSnapshot(),
  );
  const positions = useEffectAnchorPositions(anchors);

  return (
    <>
      <EffectGroup anchor="player" effects={effects} position={positions.player} stats={stats} />
      <EffectGroup anchor="enemy" effects={effects} position={positions.enemy} stats={stats} />
    </>
  );
}
