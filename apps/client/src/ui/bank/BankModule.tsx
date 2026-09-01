import { useEffect, useState, type DragEvent, type MouseEvent } from "react";
import { RESEARCH_IDS } from "../../data/researchContentCatalog.js";
import type { InventorySlotVM } from "../../game/GameBridge";
import { getItemDisplayName } from "../../panels/ItemVisual";
import type { StorageRange } from "../../runtime/StorageRuntime";
import { useGameServices } from "../../state/GameContext";
import {
  createTrackedItemResource,
  isTrackableResourceItem,
  useResourceTracking,
} from "../dashboard/ResourceTrackingContext";
import { ItemGrid } from "../shared";
import { getStorageCapacitySnapshot } from "../shared/storageCapacity";
import { getStorageItemCategory } from "../shared/storageItemCategory";
import { useBankData } from "./useBankData";
import "../shared/storageModule.css";

interface BankModuleProps {
  readonly onMove?: (from: number, to: number) => void;
  readonly canMoveToRange?: (from: number, range: StorageRange) => boolean;
  readonly onMoveToRange?: (from: number, range: StorageRange) => boolean;
  readonly onTransferToInventory?: (position: number) => void;
  readonly onSort?: (start: number, length: number) => void;
}

type BankFilter = "all" | "equipment" | "resources" | "special";

interface BankContextMenuState {
  readonly position: number;
  readonly x: number;
  readonly y: number;
}

const BANK_FILTERS: readonly { readonly id: BankFilter; readonly label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "equipment", label: "Équipement" },
  { id: "resources", label: "Ressources" },
  { id: "special", label: "Spéciaux" },
];

const ROMAN_TAB_LABELS = ["I", "II", "III", "IV", "V"] as const;

function matchesBankFilter(slot: InventorySlotVM, filter: BankFilter): boolean {
  if (filter === "all") return true;
  const itemId = slot.itemId;
  return itemId !== undefined && getStorageItemCategory(itemId) === filter;
}

function readDraggedBankPosition(event: DragEvent<HTMLElement>): number | undefined {
  const parsed = Number(event.dataTransfer.getData("text/plain"));
  return Number.isInteger(parsed) ? parsed : undefined;
}

function getTabRange(tabNumber: number, tabCapacity: number): StorageRange {
  return { start: (tabNumber - 1) * tabCapacity, length: tabCapacity };
}

export function BankModule({ onMove, canMoveToRange, onMoveToRange, onTransferToInventory, onSort }: BankModuleProps): JSX.Element {
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
  const [contextMenu, setContextMenu] = useState<BankContextMenuState | undefined>(undefined);

  useEffect(() => {
    if (activeBankTab > expansion.unlockedTabCount) setActiveBankTab(expansion.unlockedTabCount);
  }, [activeBankTab, expansion.unlockedTabCount]);

  useEffect(() => {
    if (contextMenu === undefined) return;
    const close = (): void => { setContextMenu(undefined); };
    const closeOnEscape = (event: KeyboardEvent): void => { if (event.key === "Escape") close(); };
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  const tabStart = (activeBankTab - 1) * expansion.tabCapacity;
  const tabEnd = tabStart + expansion.tabCapacity;
  const activeTabSlots = bank.slots.filter((slot) => slot.position >= tabStart && slot.position < tabEnd);
  const activeTabOccupied = activeTabSlots.reduce((count, slot) => count + (slot.itemId === undefined ? 0 : 1), 0);
  const capacity = getStorageCapacitySnapshot(activeTabOccupied, expansion.tabCapacity);
  const filteredSlots = activeTabSlots.filter((slot) => matchesBankFilter(slot, activeFilter));
  const activeLabel = ROMAN_TAB_LABELS[activeBankTab - 1] ?? String(activeBankTab);

  const moveItemToTab = (from: number, tabNumber: number): boolean => {
    if (onMoveToRange === undefined || tabNumber === activeBankTab) return false;
    if (bank.slots.find((slot) => slot.position === from)?.itemId === undefined) return false;
    return onMoveToRange(from, getTabRange(tabNumber, expansion.tabCapacity));
  };

  const moveDraggedItemToTab = (event: DragEvent<HTMLButtonElement>, tabNumber: number): void => {
    event.preventDefault();
    setDragTargetTab(undefined);
    const from = readDraggedBankPosition(event);
    if (from !== undefined && moveItemToTab(from, tabNumber)) setActiveBankTab(tabNumber);
  };

  const openMoveContextMenu = (event: MouseEvent<HTMLButtonElement>, slot: InventorySlotVM): void => {
    event.preventDefault();
    if (onMoveToRange === undefined || expansion.unlockedTabCount <= 1 || slot.itemId === undefined) return;
    setContextMenu({ position: slot.position, x: event.clientX, y: event.clientY });
  };

  return (
    <div className="storage-module">
      {expansion.unlockedTabCount > 1 && (
        <div className="storage-module__bank-tabs" role="tablist" aria-label="Onglets de banque">
          {Array.from({ length: expansion.unlockedTabCount }, (_, index) => index + 1).map((tabNumber) => {
            const label = ROMAN_TAB_LABELS[tabNumber - 1] ?? String(tabNumber);
            return (
              <button
                key={tabNumber}
                type="button"
                role="tab"
                aria-selected={activeBankTab === tabNumber}
                className={activeBankTab === tabNumber || dragTargetTab === tabNumber ? "is-active" : ""}
                onClick={() => { setActiveBankTab(tabNumber); }}
                onDragOver={(event) => {
                  if (tabNumber === activeBankTab || onMoveToRange === undefined) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragTargetTab(tabNumber);
                }}
                onDragLeave={() => { if (dragTargetTab === tabNumber) setDragTargetTab(undefined); }}
                onDrop={(event) => { moveDraggedItemToTab(event, tabNumber); }}
                title={tabNumber === activeBankTab ? undefined : `Déposer ici pour déplacer vers Banque ${label}`}
              >
                Banque {label}
              </button>
            );
          })}
        </div>
      )}

      <section className={`storage-module__summary storage-module__summary--${capacity.state}`} aria-label={`Capacité de la banque ${activeLabel}${capacity.state === "full" ? " · pleine" : capacity.state === "warning" ? ` · presque pleine · ${String(capacity.freeSlots)} places restantes` : ""}`}>
        <div className="storage-module__summary-row">
          <div><small>Stockage sécurisé</small><span>Banque {activeLabel}</span></div>
          <strong>{String(activeTabOccupied)} <small>/ {String(expansion.tabCapacity)}</small></strong>
        </div>
        <div className="storage-module__capacity-track" aria-hidden="true">
          <span className="storage-module__capacity-fill" style={{ width: `${String(capacity.percent)}%` }} />
        </div>
      </section>

      <div className="storage-module__toolbar">
        <button type="button" className="storage-module__sort-button" onClick={() => { onSort?.(tabStart, expansion.tabCapacity); }} aria-label={`Trier la banque ${activeLabel}`} title={`Trier la banque ${activeLabel}`}>
          <img src="/assets/ui/action-sort.png" alt="" aria-hidden="true" draggable={false} />
        </button>
        <div className="storage-module__filters" role="group" aria-label="Filtrer la banque">
          {BANK_FILTERS.map((filter) => (
            <button key={filter.id} type="button" className={activeFilter === filter.id ? "is-active" : ""} aria-pressed={activeFilter === filter.id} onClick={() => { setActiveFilter(filter.id); }}>
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
            interactionHint="Double-cliquez pour transférer vers l’inventaire. Glissez-déposez pour organiser."
            draggable
            {...(onMove === undefined ? {} : { onItemDrop: onMove })}
            onItemDoubleClick={(_event, slot) => { if (slot.itemId !== undefined) onTransferToInventory?.(slot.position); }}
            onItemContextMenu={openMoveContextMenu}
            {...(yieldTrackingUnlocked ? {
              canFavoriteItem: isTrackableResourceItem,
              isItemFavorite: tracking.isTracked,
              onToggleItemFavorite: (itemId: string) => { tracking.toggleTracked(createTrackedItemResource(itemId, getItemDisplayName(itemId))); },
            } : {})}
          />
        ) : <p className="storage-module__empty-filter">Aucun objet dans cette catégorie.</p>}
      </section>

      {contextMenu !== undefined && (
        <div className="storage-module__context-menu" role="menu" aria-label="Déplacer vers une autre banque" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => { event.stopPropagation(); }} onContextMenu={(event) => { event.preventDefault(); }}>
          <strong>Déplacer vers</strong>
          {Array.from({ length: expansion.unlockedTabCount }, (_, index) => index + 1)
            .filter((tabNumber) => tabNumber !== activeBankTab)
            .map((tabNumber) => {
              const label = ROMAN_TAB_LABELS[tabNumber - 1] ?? String(tabNumber);
              const range = getTabRange(tabNumber, expansion.tabCapacity);
              const canMove = canMoveToRange?.(contextMenu.position, range) ?? false;
              return (
                <button key={tabNumber} type="button" role="menuitem" disabled={!canMove} onClick={() => { moveItemToTab(contextMenu.position, tabNumber); setContextMenu(undefined); }}>
                  Banque {label}{canMove ? "" : " · pleine"}
                </button>
              );
            })}
        </div>
      )}

      <p className="storage-module__hint">
        Double-clic : vers inventaire · clic droit : déplacer vers · glissez-déposez pour organiser · déposez sur un onglet pour déplacer
        {yieldTrackingUnlocked ? " · étoile : suivre une ressource." : "."}
      </p>
    </div>
  );
}
