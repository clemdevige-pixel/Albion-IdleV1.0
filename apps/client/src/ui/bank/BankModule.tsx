import { useState } from "react";
import type { InventorySlotVM } from "../../game/GameBridge";
import { getItemDefinition, getItemDisplayName } from "../../panels/ItemVisual";
import {
  createTrackedItemResource,
  isTrackableResourceItem,
  useResourceTracking,
} from "../dashboard/ResourceTrackingContext";
import { ItemGrid } from "../shared";
import { useBankData } from "./useBankData";
import "../shared/storageModule.css";

interface BankModuleProps {
  readonly onMove?: (from: number, to: number) => void;
  readonly onTransferToInventory?: (position: number) => void;
  readonly onSort?: () => void;
}

type BankFilter = "all" | "equipment" | "resources" | "special";

const BANK_FILTERS: readonly { readonly id: BankFilter; readonly label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "equipment", label: "Équipement" },
  { id: "resources", label: "Ressources" },
  { id: "special", label: "Spéciaux" },
];

function isSpecialBankItem(itemId: string): boolean {
  return itemId.startsWith("item_resource_dungeon_key_")
    || itemId.startsWith("item_resource_artifact_")
    || itemId.startsWith("item_resource_key_fragment_");
}

function matchesBankFilter(slot: InventorySlotVM, filter: BankFilter): boolean {
  if (filter === "all") return true;
  const itemId = slot.itemId;
  if (itemId === undefined) return false;
  if (filter === "equipment") return getItemDefinition(itemId) !== undefined;
  if (filter === "special") return isSpecialBankItem(itemId);
  return getItemDefinition(itemId) === undefined && !isSpecialBankItem(itemId);
}

export function BankModule({ onMove, onTransferToInventory, onSort }: BankModuleProps): JSX.Element {
  const bank = useBankData();
  const tracking = useResourceTracking();
  const [activeFilter, setActiveFilter] = useState<BankFilter>("all");
  const capacityRatio = bank.capacity === 0
    ? 0
    : Math.min(100, (bank.occupied / bank.capacity) * 100);
  const filteredSlots = bank.slots.filter((slot) => matchesBankFilter(slot, activeFilter));

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
        <button type="button" className="storage-module__sort-button" onClick={onSort} aria-label="Trier la banque" title="Trier la banque">
          <img src="/assets/ui/action-sort.png" alt="" aria-hidden="true" draggable={false} />
        </button>
        <div className="storage-module__filters" role="group" aria-label="Filtrer la banque">
          {BANK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={activeFilter === filter.id ? "is-active" : ""}
              aria-pressed={activeFilter === filter.id}
              onClick={() => { setActiveFilter(filter.id); }}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <span className="storage-module__shortcut">Double-clic → inventaire</span>
      </div>

      <section className="storage-module__surface">
        {filteredSlots.length > 0 ? (
          <ItemGrid
            slots={filteredSlots}
            label={`Objets dans la banque · filtre ${BANK_FILTERS.find((filter) => filter.id === activeFilter)?.label ?? "Tous"}`}
            interactive
            draggable
            {...(onMove === undefined ? {} : { onItemDrop: onMove })}
            onItemDoubleClick={(_event, slot) => {
              if (slot.itemId !== undefined) onTransferToInventory?.(slot.position);
            }}
            canFavoriteItem={isTrackableResourceItem}
            isItemFavorite={tracking.isTracked}
            onToggleItemFavorite={(itemId) => {
              tracking.toggleTracked(createTrackedItemResource(itemId, getItemDisplayName(itemId)));
            }}
          />
        ) : (
          <p className="storage-module__empty-filter">Aucun objet dans cette catégorie.</p>
        )}
      </section>

      <p className="storage-module__hint">Double-clic : vers inventaire · glissez-déposez pour organiser · étoile : suivre une ressource.</p>
    </div>
  );
}
