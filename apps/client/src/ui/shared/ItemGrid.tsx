import type { DragEvent, MouseEvent } from "react";
import type { InventorySlotVM } from "../../game/GameBridge";
import { ItemHoverTooltip } from "../../panels/ItemHoverTooltip";
import { getEnchantmentTextClass, getEquipmentTierFrameClass, getItemDefinition, ItemVisual } from "../../panels/ItemVisual";
import { EnchantmentDiamonds } from "./EnchantmentDiamonds";
import "./itemGrid.css";

interface ItemGridProps {
  readonly slots: readonly InventorySlotVM[];
  readonly label: string;
  readonly interactive?: boolean;
  readonly interactionHint?: string;
  readonly draggable?: boolean;
  readonly selectedPosition?: number | undefined;
  readonly onItemClick?: (slot: InventorySlotVM) => void;
  readonly onItemDoubleClick?: (event: MouseEvent<HTMLButtonElement>, slot: InventorySlotVM) => void;
  readonly onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, slot: InventorySlotVM) => void;
  readonly onItemDrop?: (from: number, to: number) => void;
  readonly canFavoriteItem?: (itemId: string) => boolean;
  readonly isItemFavorite?: (itemId: string) => boolean;
  readonly onToggleItemFavorite?: (itemId: string) => void;
}

export function ItemGrid({
  slots,
  label,
  interactive = false,
  interactionHint,
  draggable = false,
  selectedPosition,
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  onItemDrop,
  canFavoriteItem,
  isItemFavorite,
  onToggleItemFavorite,
}: ItemGridProps): JSX.Element {
  const readSource = (event: DragEvent<HTMLButtonElement>): number | undefined => {
    const parsed = Number(event.dataTransfer.getData("text/plain"));
    return Number.isInteger(parsed) ? parsed : undefined;
  };

  const accessibilityHint = [
    interactionHint,
    onToggleItemFavorite !== undefined ? "Utilisez l’étoile pour suivre une ressource." : undefined,
  ].filter((hint): hint is string => hint !== undefined && hint.length > 0).join(" ");

  return (
    <div className="ui-item-grid" role="grid" aria-label={label}>
      {slots.map((slot) => {
        const itemId = slot.itemId;
        const definition = itemId === undefined ? undefined : getItemDefinition(itemId);
        const isEquipment = definition?.slot !== undefined;
        const isSelected = itemId !== undefined && selectedPosition === slot.position;
        const favorite = itemId !== undefined && isItemFavorite?.(itemId) === true;
        const canFavorite = itemId !== undefined
          && canFavoriteItem?.(itemId) === true
          && onToggleItemFavorite !== undefined
          && isItemFavorite !== undefined;
        const slotButton = (
          <button
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
                {isEquipment && slot.quantity <= 1 && (
                  <span className="ui-item-grid__enchantment">
                    <EnchantmentDiamonds level={slot.enchantment} />
                  </span>
                )}
                {slot.quantity > 1 && <span className="ui-item-grid__quantity">{String(slot.quantity)}</span>}
              </>
            )}
          </button>
        );

        if (itemId === undefined) return <span key={slot.position} className="ui-item-grid__entry">{slotButton}</span>;

        return (
          <ItemHoverTooltip
            key={slot.position}
            itemId={itemId}
            quantity={slot.quantity}
            instanceId={slot.instanceId}
            enchantmentOverride={isEquipment ? slot.enchantment : undefined}
            showEnchantmentLevel={isEquipment}
          >
            <span className="ui-item-grid__entry">
              {slotButton}
              {canFavorite && (
                <button
                  type="button"
                  className={`ui-item-grid__favorite${favorite ? " is-active" : ""}`}
                  aria-pressed={favorite}
                  aria-label={favorite ? "Ne plus suivre cette ressource" : "Suivre cette ressource"}
                  title={favorite ? "Ne plus suivre" : "Suivre la ressource"}
                  draggable={false}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleItemFavorite(itemId);
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  ★
                </button>
              )}
            </span>
          </ItemHoverTooltip>
        );
      })}
      {interactive && accessibilityHint.length > 0 && <span className="sr-only">{accessibilityHint}</span>}
    </div>
  );
}
