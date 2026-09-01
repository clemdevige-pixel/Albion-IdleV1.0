import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { EnchantmentLevel } from "@game/gameplay";
import { getFragmentAssemblyRecipe } from "../data/specialCraftRecipes.js";
import { EnchantmentDiamonds } from "../ui/shared/EnchantmentDiamonds";
import { ItemTooltip } from "./ItemTooltip";

interface ItemHoverTooltipProps {
  readonly itemId: string;
  readonly quantity?: number;
  readonly instanceId?: string | undefined;
  readonly enchantmentOverride?: EnchantmentLevel | undefined;
  readonly showEnchantmentLevel?: boolean;
  readonly children: ReactNode;
}

interface TooltipPosition {
  readonly x: number;
  readonly y: number;
}

const TOOLTIP_WIDTH = 330;
const TOOLTIP_HEIGHT = 390;
const TOOLTIP_GAP = 12;
const VIEWPORT_PADDING = 8;
const TOOLTIP_AVOIDANCE_SELECTOR = ".ui-item-grid, .character-picker, .character-module__slots";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, maximum));
}

function resolveTooltipPosition(target: HTMLElement): TooltipPosition {
  const targetRect = target.getBoundingClientRect();
  const avoidanceRect = target.closest<HTMLElement>(TOOLTIP_AVOIDANCE_SELECTOR)?.getBoundingClientRect();
  const anchorRect = avoidanceRect ?? targetRect;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxX = Math.max(VIEWPORT_PADDING, viewportWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING);
  const maxY = Math.max(VIEWPORT_PADDING, viewportHeight - TOOLTIP_HEIGHT - VIEWPORT_PADDING);
  const centeredY = clamp(
    targetRect.top + targetRect.height / 2 - TOOLTIP_HEIGHT / 2,
    VIEWPORT_PADDING,
    maxY,
  );

  const spaceRight = viewportWidth - anchorRect.right - VIEWPORT_PADDING;
  const spaceLeft = anchorRect.left - VIEWPORT_PADDING;

  if (spaceRight >= TOOLTIP_WIDTH + TOOLTIP_GAP) {
    return {
      x: clamp(anchorRect.right + TOOLTIP_GAP, VIEWPORT_PADDING, maxX),
      y: centeredY,
    };
  }

  if (spaceLeft >= TOOLTIP_WIDTH + TOOLTIP_GAP) {
    return {
      x: clamp(anchorRect.left - TOOLTIP_WIDTH - TOOLTIP_GAP, VIEWPORT_PADDING, maxX),
      y: centeredY,
    };
  }

  const targetSpaceRight = viewportWidth - targetRect.right - VIEWPORT_PADDING;
  const targetSpaceLeft = targetRect.left - VIEWPORT_PADDING;
  const preferRight = targetSpaceRight >= targetSpaceLeft;
  const x = preferRight
    ? targetRect.right + TOOLTIP_GAP
    : targetRect.left - TOOLTIP_WIDTH - TOOLTIP_GAP;

  return {
    x: clamp(x, VIEWPORT_PADDING, maxX),
    y: centeredY,
  };
}

export function ItemHoverTooltip({
  itemId,
  quantity = 1,
  instanceId,
  enchantmentOverride,
  showEnchantmentLevel = false,
  children,
}: ItemHoverTooltipProps): JSX.Element {
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [suppressedUntilLeave, setSuppressedUntilLeave] = useState(false);
  const assemblyRecipe = getFragmentAssemblyRecipe(itemId);
  const requiredFragments = assemblyRecipe?.requirements[0]?.quantity;

  return (
    <span
      className="item-hover-target"
      onMouseEnter={(event) => {
        if (!suppressedUntilLeave) setPosition(resolveTooltipPosition(event.currentTarget));
      }}
      onMouseLeave={() => {
        setPosition(null);
        setSuppressedUntilLeave(false);
      }}
      onContextMenu={() => {
        setPosition(null);
        setSuppressedUntilLeave(true);
      }}
    >
      {children}
      {position !== null && createPortal(
        <div
          className="item-hover-tooltip"
          style={{
            left: `${String(position.x)}px`,
            top: `${String(position.y)}px`,
          }}
          role="tooltip"
        >
          <ItemTooltip
            itemId={itemId}
            quantity={quantity}
            instanceId={instanceId}
            enchantmentOverride={enchantmentOverride}
          />
          {showEnchantmentLevel && enchantmentOverride !== undefined && (
            <span className="item-hover-tooltip__enchantment-inline">
              <EnchantmentDiamonds level={enchantmentOverride} variant="tooltip" />
            </span>
          )}
          {assemblyRecipe !== undefined && requiredFragments !== undefined && (
            <div className="item-tooltip__hint">
              Double-clic dans l’inventaire : assembler {String(requiredFragments)} fragments en 1 {assemblyRecipe.name}.
            </div>
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}
