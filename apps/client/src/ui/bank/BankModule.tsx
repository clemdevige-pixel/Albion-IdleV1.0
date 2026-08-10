import { ItemGrid } from "../shared";
import { useBankData } from "./useBankData";
import "../shared/storageModule.css";

interface BankModuleProps {
  readonly onMove?: (from: number, to: number) => void;
  readonly onTransferToInventory?: (position: number) => void;
  readonly onSort?: () => void;
}

export function BankModule({ onMove, onTransferToInventory, onSort }: BankModuleProps): JSX.Element {
  const bank = useBankData();
  const capacityRatio = bank.capacity === 0
    ? 0
    : Math.min(100, (bank.occupied / bank.capacity) * 100);

  return (
    <div className="storage-module">
      <section className="storage-module__summary" aria-label="Capacité de la banque">
        <div className="storage-module__summary-row">
          <span>Coffre de banque</span>
          <strong>{String(bank.occupied)} / {String(bank.capacity)}</strong>
        </div>
        <div className="storage-module__capacity-track" aria-hidden="true">
          <span className="storage-module__capacity-fill" style={{ width: `${String(capacityRatio)}%` }} />
        </div>
      </section>

      <div className="storage-module__toolbar">
        <button type="button" onClick={onSort}>Trier</button>
        <span>Double-clic : vers l’inventaire</span>
      </div>

      <section className="storage-module__surface">
        <ItemGrid
          slots={bank.slots}
          label="Objets dans la banque"
          interactive
          draggable
          onItemDrop={onMove}
          onItemDoubleClick={(_event, slot) => {
            if (slot.itemId !== undefined) onTransferToInventory?.(slot.position);
          }}
        />
      </section>
    </div>
  );
}
