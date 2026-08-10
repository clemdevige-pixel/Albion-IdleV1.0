import type { MouseEvent, ReactNode } from "react";
import { ItemHoverTooltip } from "../../panels/ItemHoverTooltip";
import {
  getEnchantmentFrameClass,
  getItemDefinition,
  ItemVisual,
} from "../../panels/ItemVisual";

interface ItemSlotProps {
  readonly label: string;
  readonly itemId: string | undefined;
  readonly instanceId: string | undefined;
  readonly enchantment: 0 | 1 | 2 | 3 | 4;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly disabledContent?: ReactNode;
  readonly onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly onDoubleClick?: () => void;
}

export function ItemSlot({
  label,
  itemId,
  instanceId,
  enchantment,
  selected = false,
  disabled = false,
  disabledContent,
  onClick,
  onDoubleClick,
}: ItemSlotProps): JSX.Element {
  const definition = itemId === undefined ? undefined : getItemDefinition(itemId);
  const content = (
    <button
      type="button"
      className={`ui-item-slot${itemId !== undefined ? " ui-item-slot--filled" : ""}${
        selected ? " ui-item-slot--selected" : ""
      }${disabled ? " ui-item-slot--disabled" : ""}${
        getEnchantmentFrameClass(enchantment)
      }`}
      disabled={disabled}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      aria-label={`${label}${itemId === undefined ? " vide" : " équipé"}`}
    >
      <span className="ui-item-slot__label">{label}</span>
      {disabled ? (
        <span className="ui-item-slot__disabled">{disabledContent}</span>
      ) : itemId !== undefined ? (
        <>
          <span className="ui-item-slot__visual"><ItemVisual itemId={itemId} /></span>
          {definition !== undefined && (
            <span className="ui-item-slot__meta">
              T{String(definition.tier)}{enchantment > 0 ? ` .${String(enchantment)}` : ""}
            </span>
          )}
        </>
      ) : (
        <span className="ui-item-slot__empty">+</span>
      )}
    </button>
  );

  if (itemId === undefined || disabled) return content;
  return (
    <ItemHoverTooltip itemId={itemId} quantity={1} instanceId={instanceId}>
      {content}
    </ItemHoverTooltip>
  );
}
