import { useCallback, useState, type MouseEvent } from "react";
import type { InventorySlotVM } from "../../game/GameBridge";
import { ItemContextMenu } from "../../panels/ItemContextMenu";
import { getItemDefinition } from "../../panels/ItemVisual";
import { BankModule } from "../bank";
import { ItemGrid } from "../shared";
import { useInventoryActions } from "./useInventoryActions";
import { useInventoryData } from "./useInventoryData";
import "../shared/storageModule.css";

interface ContextMenuState {
  readonly position: number;
  readonly x: number;
  readonly y: number;
}

type StorageTab = "inventory" | "bank";

export function InventoryModule(): JSX.Element {
  const inventory = useInventoryData();
  const actions = useInventoryActions();
  const [activeTab, setActiveTab] = useState<StorageTab>("inventory");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const capacityRatio = inventory.capacity === 0
    ? 0
    : Math.min(100, (inventory.occupied / inventory.capacity) * 100);

  const handleDoubleClick = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    slot: InventorySlotVM,
  ) => {
    if (slot.itemId === undefined) return;
    if (event.shiftKey) {
      actions.transfer("inventory", slot.position, "bank");
      return;
    }
    if (getItemDefinition(slot.itemId) !== undefined) actions.equip(slot.position);
    else actions.useConsumable(slot.itemId);
  }, [actions]);

  const handleContextMenu = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    slot: InventorySlotVM,
  ) => {
    event.preventDefault();
    setContextMenu({ position: slot.position, x: event.clientX, y: event.clientY });
  }, []);

  return (
    <div className="storage-module">
      <div className="storage-module__tabs" role="tablist" aria-label="Stockage">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "inventory"}
          className={activeTab === "inventory" ? "is-active" : ""}
          onClick={() => { setActiveTab("inventory"); }}
        >
          Inventaire
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "bank"}
          className={activeTab === "bank" ? "is-active" : ""}
          onClick={() => { setActiveTab("bank"); }}
        >
          Banque
        </button>
      </div>

      {activeTab === "bank" ? (
        <BankModule
          onMove={(from, to) => { actions.move("bank", from, to); }}
          onTransferToInventory={(position) => {
            actions.transfer("bank", position, "inventory");
          }}
          onSort={() => { actions.sort("bank"); }}
        />
      ) : (
        <>
          <section className="storage-module__summary" aria-label="Capacité de l’inventaire">
            <div className="storage-module__summary-row">
              <div>
                <small>Stockage personnel</small>
                <span>Sac du héros</span>
              </div>
              <strong>{String(inventory.occupied)} <small>/ {String(inventory.capacity)}</small></strong>
            </div>
            <div className="storage-module__capacity-track" aria-hidden="true">
              <span className="storage-module__capacity-fill" style={{ width: `${String(capacityRatio)}%` }} />
            </div>
          </section>

          <div className="storage-module__toolbar">
            <button
              type="button"
              className="storage-module__sort-button"
              onClick={() => { actions.sort("inventory"); }}
              aria-label="Trier l’inventaire"
            >
              <img src="/assets/ui/action-sort.png" alt="" aria-hidden="true" draggable={false} />
              <span>Trier</span>
            </button>
            <span className="storage-module__shortcut">Maj + double-clic → banque</span>
          </div>

          <section className="storage-module__surface">
            <ItemGrid
              slots={inventory.slots}
              label="Objets dans l’inventaire"
              interactive
              draggable
              onItemDrop={(from, to) => { actions.move("inventory", from, to); }}
              onItemDoubleClick={handleDoubleClick}
              onItemContextMenu={handleContextMenu}
            />
          </section>

          <p className="storage-module__hint">
            Glissez-déposez pour organiser · double-cliquez pour équiper ou utiliser.
          </p>

          {contextMenu !== null && (
            <ItemContextMenu
              position={contextMenu.position}
              x={contextMenu.x}
              y={contextMenu.y}
              itemId={inventory.slots.find((slot) => slot.position === contextMenu.position)?.itemId ?? ""}
              onClose={() => { setContextMenu(null); }}
              onEquip={(position) => {
                actions.equip(position);
                setContextMenu(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
