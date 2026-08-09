import { ItemGrid } from "../shared";
import { useBankData } from "./useBankData";
import "../shared/storageModule.css";

export function BankModule(): JSX.Element {
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

      <section className="storage-module__surface">
        <ItemGrid slots={bank.slots} label="Objets dans la banque" />
      </section>

      <p className="storage-module__notice">
        La banque est actuellement en lecture seule. Les transferts seront ajoutés
        avec leur système de gameplay dédié.
      </p>
    </div>
  );
}
