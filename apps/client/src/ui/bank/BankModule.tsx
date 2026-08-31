import { useEffect, useState, type DragEvent } from "react";
import { RESEARCH_IDS } from "../../data/researchContentCatalog.js";
import type { InventorySlotVM } from "../../game/GameBridge";
import { getItemDefinition, getItemDisplayName } from "../../panels/ItemVisual";
import { useGameServices } from "../../state/GameContext";
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
  readonly onSort?: (start: number, length: number) => void;
}

type BankFilter = "all" | "equipment" | "resources" | "special";

const BANK_FILTERS: readonly { readonly id: BankFilter; readonly label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "equipment", label: "Équipement" },
  { id: "resources", label: "Ressources" },
  { id: "special", label: "Spéciaux" },
];

const ROMAN_TAB_LABELS = ["I", "II", "III", "IV", "V"] as const;

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

export function findFirstEmptyBankTabPosition(
  slots: readonly InventorySlotVM[],
  tabNumber: number,
  tabCapacity: number,
): number | undefined {
  if (!Number.isInteger(tabNumber) || tabNumber < 1 || !Number.isInteger(tabCapacity) || tabCapacity <= 0) {
    return undefined;
  }
  const start = (tabNumber - 1) * tabCapacity;
  const end = start + tabCapacity;
  return slots.find((slot) => (
    slot.position >= start
    && slot.position < end
    && slot.itemId === undefined
  ))?.position;
}

function readDraggedBankPosition(event: DragEvent<HTMLElement>): number | undefined {
  const parsed = Number(event.dataTransfer.getData("text/plain"));
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function BankModule({ onMove, onTransferToInventory, onSort }: BankModuleProps): JSX.Element {
  const bank = useBankData();
  const services = useGameServices();
  const tracking = useResourceTracking();
  const expansion = services.getBankExpansionModel();
  const yieldTrackingUnlocked = services.getAcademyModel().research.some(
    (research) => research.id === RESEARCH_IDS.yieldAnalysis && research.state === "completed",
  );
  const [activeFilter, setActiveFilter] = useState<BankFilter>("all");
  const [activeBankTab, setActiveBankTab] = useState(1);
  const [dragTargetTab, setDragTargetTab] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (activeBankTab > expansion.unlockedTabCount) {
      setActiveBankTab(expansion.unlockedTabCount);
    }
  }, [activeBankTab, expansion.unlockedTabCount]);

  const tabStart = (activeBankTab - 1) * expansion.tabCapacity;
  const tabEnd = tabStart + expansion.tabCapacity;
  const activeTabSlots = bank.slots.filter((slot) => slot.position >= tabStart && slot.position < tabEnd);
  const activeTabOccupied = activeTabSlots.reduce(
    (count, slot) => count + (slot.itemId === undefined ? 0 : 1),
    0,
  );
  const capacityRatio = expansion.tabCapacity === 0
    ? 0
    : Math.min(100, (activeTabOccupied / expansion.tabCapacity) * 100);
  const filteredSlots = activeTabSlots.filter((slot) => matchesBankFilter(slot, activeFilter));
  const activeLabel = ROMAN_TAB_LABELS[activeBankTab - 1] ?? String(activeBankTab);

  const moveDraggedItemToTab = (event: DragEvent<HTMLButtonElement>, tabNumber: number): void => {
    event.preventDefault();
    setDragTargetTab(undefined);
    if (onMove === undefined || tabNumber === activeBankTab) return;

    const from = readDraggedBankPosition(event);
    if (from === undefined || bank.slots.find((slot) => slot.position === from)?.itemId === undefined) return;

    const to = findFirstEmptyBankTabPosition(bank.slots, tabNumber, expansion.tabCapacity);
    if (to === undefined) return;

    onMove(from, to);
    setActiveBankTab(tabNumber);
  };

  return (
    <div className="storage-module">
      {expansion.unlockedTabCount > 1 && (
        <div className="storage-module__bank-tabs" role="tablist" aria-label="Onglets de banque">
          {Array.from({ length: expansion.unlockedTabCount }, (_, index) => index + 1).map((tabNumber) => {
            const label = ROMAN_TAB_LABELS[tabNumber - 1] ?? String(tabNumber);
            const canReceiveDrop = tabNumber !== activeBankTab
              && findFirstEmptyBankTabPosition(bank.slots, tabNumber, expansion.tabCapacity) !== undefined;
            return (
              <button
                key={tabNumber}
                type="button"
                role="tab"
                aria-selected={activeBankTab === tabNumber}
                className={`${activeBankTab === tabNumber ? "is-active" : ""}${dragTargetTab === tabNumber ? " is-drop-target" : ""}`}
                onClick={() => { setActiveBankTab(tabNumber); }}
                onDragOver={(event) => {
                  if (!canReceiveDrop || onMove === undefined) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragTargetTab(tabNumber);
                }}
                onDragLeave={() => {
                  if (dragTargetTab === tabNumber) setDragTargetTab(undefined);
                }}
                onDrop={(event) => { moveDraggedItemToTab(event, tabNumber); }}
                title={canReceiveDrop ? `Déposer ici pour déplacer vers Banque ${label}` : undefined}
              >
                Banque {label}
              </button>
            );
          })}
        </div>
      )}

      <section className="storage-module__summary" aria-label={`Capacité de la banque ${activeLabel}`}>
        <div className="storage-module__summary-row">
          <div>
            <small>Stockage sécurisé</small>
            <span>Banque {activeLabel}</span>
          </div>
          <strong>{String(activeTabOccupied)} <small>/ {String(expansion.tabCapacity)}</small></strong>
        </div>
        <div className="storage-module__capacity-track" aria-hidden="true">
          <span className="storage-module__capacity-fill" style={{ width: `${String(capacityRatio)}%` }} />
        </div>
      </section>

      <div className="storage-module__toolbar">
        <button
          type="button"
          className="storage-module__sort-button"
          onClick={() => { onSort?.(tabStart, expansion.tabCapacity); }}
          aria-label={`Trier la banque ${activeLabel}`}
          title={`Trier la banque ${activeLabel}`}
        >
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
            label={`Objets dans la banque ${activeLabel} · filtre ${BANK_FILTERS.find((filter) => filter.id === activeFilter)?.label ?? "Tous"}`}
            interactive
            draggable
            {...(onMove === undefined ? {} : { onItemDrop: onMove })}
            onItemDoubleClick={(_event, slot) => {
              if (slot.itemId !== undefined) onTransferToInventory?.(slot.position);
            }}
            onItemContextMenu={(event) => { event.preventDefault(); }}
            {...(yieldTrackingUnlocked ? {
              canFavoriteItem: isTrackableResourceItem,
              isItemFavorite: tracking.isTracked,
              onToggleItemFavorite: (itemId: string) => {
                tracking.toggleTracked(createTrackedItemResource(itemId, getItemDisplayName(itemId)));
              },
            } : {})}
          />
        ) : (
          <p className="storage-module__empty-filter">Aucun objet dans cette catégorie.</p>
        )}
      </section>

      <p className="storage-module__hint">
        Double-clic : vers inventaire · glissez-déposez pour organiser · déposez sur un onglet pour déplacer
        {yieldTrackingUnlocked ? " · étoile : suivre une ressource." : "."}
      </p>
    </div>
  );
}
