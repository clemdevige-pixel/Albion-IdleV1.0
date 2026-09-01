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

export function ItemHoverTooltip({
  itemId,
  quantity = 1,
  instanceId,
  enchantmentOverride,
  showEnchantmentLevel = false,
  children,
}: ItemHoverTooltipProps): JSX.Element {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [suppressedUntilLeave, setSuppressedUntilLeave] = useState(false);
  const assemblyRecipe = getFragmentAssemblyRecipe(itemId);
  const requiredFragments = assemblyRecipe?.requirements[0]?.quantity;

  return (
    <span
      className="item-hover-target"
      onMouseEnter={(event) => {
        if (!suppressedUntilLeave) setPosition({ x: event.clientX, y: event.clientY });
      }}
      onMouseMove={(event) => {
        if (!suppressedUntilLeave) setPosition({ x: event.clientX, y: event.clientY });
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
            left: `${String(Math.max(8, Math.min(position.x + 16, window.innerWidth - 330)))}px`,
            top: `${String(Math.max(8, Math.min(position.y + 16, window.innerHeight - 390)))}px`,
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
