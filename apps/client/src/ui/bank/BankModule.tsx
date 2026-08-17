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
          <div>
            <small>Stockage sécurisé</small>
            <span>Coffre de banque</span>
          </div>
          <strong>{String(bank.occupied)} <small>/ {String(bank.capacity)}</small></strong>
        </div>
        <div className="storage-module__capacity-track" aria-hidden="true">
          <span className="storage-module__capacity-fill" style={{ width: `${String(capacityRatio)}%` }} />
        </div>
      </section>

      <div className="storage-module__toolbar">
        <button
          type="button"
          className="storage-module__sort-button"
          onClick={onSort}
          aria-label="Trier la banque"
          title="Trier la banque"
        >
          <img src="/assets/ui/action-sort.png" alt="" aria-hidden="true" draggable={false} />
        </button>
        <span className="storage-module__shortcut">Double-clic → inventaire</span>
      </div>

      <section className="storage-module__surface">
        <ItemGrid
          slots={bank.slots}
          label="Objets dans la banque"
          interactive
          draggable
          {...(onMove === undefined ? {} : { onItemDrop: onMove })}
          onItemDoubleClick={(_event, slot) => {
            if (slot.itemId !== undefined) onTransferToInventory?.(slot.position);
          }}
        />
      </section>
    </div>
  );
}
