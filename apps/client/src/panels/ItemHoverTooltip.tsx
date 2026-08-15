import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { EnchantmentLevel } from "@game/gameplay";
import { ItemTooltip } from "./ItemTooltip";

interface ItemHoverTooltipProps {
  readonly itemId: string;
  readonly quantity?: number;
  readonly instanceId?: string | undefined;
  readonly enchantmentOverride?: EnchantmentLevel | undefined;
  readonly children: ReactNode;
}

export function ItemHoverTooltip({
  itemId,
  quantity = 1,
  instanceId,
  enchantmentOverride,
  children,
}: ItemHoverTooltipProps): JSX.Element {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  return (
    <span
      className="item-hover-target"
      onMouseEnter={(event) => {
        setPosition({ x: event.clientX, y: event.clientY });
      }}
      onMouseMove={(event) => {
        setPosition({ x: event.clientX, y: event.clientY });
      }}
      onMouseLeave={() => { setPosition(null); }}
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
        </div>,
        document.body,
      )}
    </span>
  );
}
