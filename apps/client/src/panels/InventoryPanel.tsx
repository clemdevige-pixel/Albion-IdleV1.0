import { useState } from "react";
import { PanelContainer } from "./PanelContainer";
import { useGameBridge } from "../state/GameContext";
import { usePanelManager } from "./usePanelManager";
import { UI_MODULE_IDS } from "../ui/navigation";
import { ItemTooltip } from "./ItemTooltip";
import { getEnchantmentFrameClass, ItemVisual } from "./ItemVisual";

/**
 * Dedicated bank storage.
 *
 * Transfers between the hero inventory and the bank will be introduced by a
 * later feature. Until then the bank is deliberately read-only.
 */
export function InventoryPanel(): JSX.Element | null {
  const { activePanel, closePanel } = usePanelManager();
  const state = useGameBridge();
  const [tooltipSlot, setTooltipSlot] = useState<number | null>(null);

  if (activePanel !== UI_MODULE_IDS.bank) {
    return null;
  }

  const { bank } = state;

  return (
    <PanelContainer title="Banque" onClose={closePanel}>
      <div className="inv-panel">
        <div className="inv-panel__grid">
          {bank.slots.map((slot) => (
            <div
              key={slot.position}
              className={`inv-panel__slot${
                slot.itemId != null ? " inv-panel__slot--filled" : ""
              }${getEnchantmentFrameClass(slot.enchantment)}`}
              onMouseEnter={() => {
                if (slot.itemId != null) setTooltipSlot(slot.position);
              }}
              onMouseLeave={() => {
                setTooltipSlot(null);
              }}
            >
              {slot.itemId != null && (
                <>
                  <span className="inv-panel__item-icon">
                    <ItemVisual itemId={slot.itemId} />
                  </span>
                  {slot.quantity > 1 && (
                    <span className="inv-panel__quantity">
                      {String(slot.quantity)}
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="inv-panel__capacity">
          {String(bank.occupied)} / {String(bank.capacity)}
        </div>
        <p className="bank-panel__notice">
          Les transferts entre l&apos;inventaire du héros et la banque seront
          ajoutés ultérieurement.
        </p>
      </div>

      {tooltipSlot !== null &&
        (() => {
          const slot = bank.slots.find(
            (candidate) => candidate.position === tooltipSlot,
          );
          if (slot?.itemId == null) return null;
          return (
            <ItemTooltip
              itemId={slot.itemId}
              quantity={slot.quantity}
              instanceId={slot.instanceId}
            />
          );
        })()}
    </PanelContainer>
  );
}
