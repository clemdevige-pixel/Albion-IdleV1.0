import type { MouseEvent } from "react";
import type { InventorySlotVM } from "../../game/GameBridge";
import { ItemHoverTooltip } from "../../panels/ItemHoverTooltip";
import {
  getEnchantmentFrameClass,
  getItemDefinition,
  ItemVisual,
} from "../../panels/ItemVisual";
import "./itemGrid.css";

interface ItemGridProps {
  readonly slots: readonly InventorySlotVM[];
  readonly label: string;
  readonly interactive?: boolean;
  readonly onItemDoubleClick?: (slot: InventorySlotVM) => void;
  readonly onItemContextMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    slot: InventorySlotVM,
  ) => void;
}

export function ItemGrid({
  slots,
  label,
  interactive = false,
  onItemDoubleClick,
  onItemContextMenu,
}: ItemGridProps): JSX.Element {
  return (
    <div className="ui-item-grid" role="grid" aria-label={label}>
      {slots.map((slot) => {
        const itemId = slot.itemId;
        const definition = itemId === undefined ? undefined : getItemDefinition(itemId);
        const slotButton = (
          <button
            key={slot.position}
            type="button"
            role="gridcell"
            className={`ui-item-grid__slot${
              itemId !== undefined ? " ui-item-grid__slot--filled" : ""
            }${getEnchantmentFrameClass(slot.enchantment)}`}
            disabled={itemId === undefined}
            onDoubleClick={() => {
              if (itemId !== undefined) onItemDoubleClick?.(slot);
            }}
            onContextMenu={(event) => {
              if (itemId !== undefined) onItemContextMenu?.(event, slot);
            }}
          >
            {itemId !== undefined && (
              <>
                <span className="ui-item-grid__visual"><ItemVisual itemId={itemId} /></span>
                {definition !== undefined && (
                  <span className="ui-item-grid__tier">
                    T{String(definition.tier)}{slot.enchantment > 0 ? `.${String(slot.enchantment)}` : ""}
                  </span>
                )}
                {slot.quantity > 1 && (
                  <span className="ui-item-grid__quantity">{String(slot.quantity)}</span>
                )}
              </>
            )}
          </button>
        );

        if (itemId === undefined) return slotButton;
        return (
          <ItemHoverTooltip
            key={slot.position}
            itemId={itemId}
            quantity={slot.quantity}
            instanceId={slot.instanceId}
          >
            {slotButton}
          </ItemHoverTooltip>
        );
      })}
      {interactive && <span className="sr-only">Double-cliquez pour utiliser ou équiper.</span>}
    </div>
  );
}
