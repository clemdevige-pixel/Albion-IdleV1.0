import { useCallback, useState, type MouseEvent } from "react";
import type { InventorySlotVM } from "../../game/GameBridge";
import { ItemContextMenu } from "../../panels/ItemContextMenu";
import { getItemDefinition } from "../../panels/ItemVisual";
import { ItemGrid } from "../shared";
import { useInventoryActions } from "./useInventoryActions";
import { useInventoryData } from "./useInventoryData";
import "../shared/storageModule.css";

interface ContextMenuState {
  readonly position: number;
  readonly x: number;
  readonly y: number;
}

export function InventoryModule(): JSX.Element {
  const inventory = useInventoryData();
  const actions = useInventoryActions();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const capacityRatio = inventory.capacity === 0
    ? 0
    : Math.min(100, (inventory.occupied / inventory.capacity) * 100);

  const handleDoubleClick = useCallback((slot: InventorySlotVM) => {
    if (slot.itemId === undefined) return;
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
      <section className="storage-module__summary" aria-label="Capacité de l’inventaire">
        <div className="storage-module__summary-row">
          <span>Sac du héros</span>
          <strong>{String(inventory.occupied)} / {String(inventory.capacity)}</strong>
        </div>
        <div className="storage-module__capacity-track" aria-hidden="true">
          <span className="storage-module__capacity-fill" style={{ width: `${String(capacityRatio)}%` }} />
        </div>
      </section>

      <section className="storage-module__surface">
        <ItemGrid
          slots={inventory.slots}
          label="Objets dans l’inventaire"
          interactive
          onItemDoubleClick={handleDoubleClick}
          onItemContextMenu={handleContextMenu}
        />
      </section>

      <p className="storage-module__hint">
        Double-cliquez pour équiper un objet ou utiliser un consommable.
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
    </div>
  );
}
