import type { DragEvent, MouseEvent } from "react";
import type { InventorySlotVM } from "../../game/GameBridge";
import { ItemHoverTooltip } from "../../panels/ItemHoverTooltip";
import { getEnchantmentTextClass, getEquipmentTierFrameClass, getItemDefinition, ItemVisual } from "../../panels/ItemVisual";
import "./itemGrid.css";

interface ItemGridProps {
  readonly slots: readonly InventorySlotVM[];
  readonly label: string;
  readonly interactive?: boolean;
  readonly draggable?: boolean;
  readonly selectedPosition?: number;
  readonly onItemClick?: (slot: InventorySlotVM) => void;
  readonly onItemDoubleClick?: (event: MouseEvent<HTMLButtonElement>, slot: InventorySlotVM) => void;
  readonly onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, slot: InventorySlotVM) => void;
  readonly onItemDrop?: (from: number, to: number) => void;
}

export function ItemGrid({ slots, label, interactive = false, draggable = false, selectedPosition, onItemClick, onItemDoubleClick, onItemContextMenu, onItemDrop }: ItemGridProps): JSX.Element {
  const readSource = (event: DragEvent<HTMLButtonElement>): number | undefined => {
    const parsed = Number(event.dataTransfer.getData("text/plain"));
    return Number.isInteger(parsed) ? parsed : undefined;
  };

  return (
    <div className="ui-item-grid" role="grid" aria-label={label}>
      {slots.map((slot) => {
        const itemId = slot.itemId;
        const definition = itemId === undefined ? undefined : getItemDefinition(itemId);
        const isSelected = itemId !== undefined && selectedPosition === slot.position;
        const slotButton = (
          <button
            key={slot.position}
            type="button"
            role="gridcell"
            aria-selected={isSelected || undefined}
            className={`ui-item-grid__slot${itemId !== undefined ? " ui-item-grid__slot--filled" : ""}${isSelected ? " ui-item-grid__slot--selected" : ""}${getEquipmentTierFrameClass(definition?.tier)}`}
            disabled={itemId === undefined && !draggable}
            draggable={draggable && itemId !== undefined}
            onClick={() => { if (itemId !== undefined) onItemClick?.(slot); }}
            onDragStart={(event) => { if (!draggable || itemId === undefined) return; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(slot.position)); }}
            onDragOver={(event) => { if (!draggable) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
            onDrop={(event) => { if (!draggable) return; event.preventDefault(); const from = readSource(event); if (from !== undefined) onItemDrop?.(from, slot.position); }}
            onDoubleClick={(event) => { if (itemId !== undefined) onItemDoubleClick?.(event, slot); }}
            onContextMenu={(event) => { if (itemId !== undefined) onItemContextMenu?.(event, slot); }}
          >
            {itemId !== undefined && (
              <>
                <span className="ui-item-grid__visual"><ItemVisual itemId={itemId} /></span>
                {definition !== undefined && (
                  <span className={`ui-item-grid__tier${getEnchantmentTextClass(slot.enchantment)}`}>
                    T{String(definition.tier)}.{String(slot.enchantment)}
                  </span>
                )}
                {slot.quantity > 1 && <span className="ui-item-grid__quantity">{String(slot.quantity)}</span>}
              </>
            )}
          </button>
        );
        if (itemId === undefined) return slotButton;
        return <ItemHoverTooltip key={slot.position} itemId={itemId} quantity={slot.quantity} instanceId={slot.instanceId}>{slotButton}</ItemHoverTooltip>;
      })}
      {interactive && <span className="sr-only">Cliquez pour sélectionner. Double-cliquez pour utiliser ou équiper. Glissez-déposez pour déplacer.</span>}
    </div>
  );
}
