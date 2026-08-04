import { useCallback, useState } from "react";
import type { EquipmentSlot } from "@game/gameplay";
import { PanelContainer } from "./PanelContainer";
import { useGameBridge, useGameServices } from "../state/GameContext";
import { usePanelManager } from "./usePanelManager";
import { ItemTooltip } from "./ItemTooltip";
import { syncInventoryToBridge, syncEquipmentToBridge, syncStatsToBridge } from "../state/bridgeSync";
import { getEnchantmentFrameClass, ItemVisual } from "./ItemVisual";
import { ItemHoverTooltip } from "./ItemHoverTooltip";

const SLOT_LABELS: Readonly<Record<EquipmentSlot, string>> = {
  head: "Tete",
  chest: "Torse",
  boots: "Bottes",
  weapon: "Arme",
  off_hand: "Bouclier",
  cape: "Cape",
};

export function EquipmentPanel(): JSX.Element | null {
  const { activePanel, closePanel } = usePanelManager();
  const state = useGameBridge();
  const services = useGameServices();
  const [tooltipSlot, setTooltipSlot] = useState<EquipmentSlot | null>(null);

  const handleUnequip = useCallback((slot: EquipmentSlot) => {
    const { equipmentManager, inventoryManager, statsManager, heroId, bridge } = services;
    const result = equipmentManager.unequipToInventory(heroId, slot);
    if (result.ok) {
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncEquipmentToBridge(bridge, equipmentManager, heroId);
      syncStatsToBridge(bridge, statsManager, heroId);
    }
  }, [services]);

  if (activePanel !== "equipment") {
    return null;
  }

  const { equipment } = state;

  return (
    <PanelContainer title="Equipement" onClose={closePanel}>
      <div className="equip-panel">
        {equipment.slots.map((s) => (
          <div
            key={s.slot}
            className={`equip-panel__slot${
              s.itemId != null ? " equip-panel__slot--filled" : ""
            }${getEnchantmentFrameClass(s.enchantment)}`}
            onMouseEnter={() => { if (s.itemId != null) { setTooltipSlot(s.slot); } }}
            onMouseLeave={() => { setTooltipSlot(null); }}
            onClick={() => { if (s.itemId != null) { handleUnequip(s.slot); } }}
          >
            <span className="equip-panel__slot-label">{SLOT_LABELS[s.slot]}</span>
            {s.itemId != null ? (
              <ItemHoverTooltip itemId={s.itemId} instanceId={s.instanceId}>
                <span className="equip-panel__item-icon"><ItemVisual itemId={s.itemId} /></span>
              </ItemHoverTooltip>
            ) : (
              <span className="equip-panel__empty">--</span>
            )}
          </div>
        ))}
      </div>
      {tooltipSlot !== null && (() => {
        const s = equipment.slots.find((sl) => sl.slot === tooltipSlot);
        if (s === undefined || s.itemId == null) { return null; }
        return (
          <ItemTooltip
            itemId={s.itemId}
            quantity={1}
            instanceId={s.instanceId}
          />
        );
      })()}
    </PanelContainer>
  );
}
