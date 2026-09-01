import { useCallback, useState, type MouseEvent } from "react";
import { resolveEquipmentInfo } from "../../data/itemContentCatalog";
import { isRelicInventoryItem } from "../../data/relicContentCatalog";
import { RESEARCH_IDS } from "../../data/researchContentCatalog.js";
import { getFragmentAssemblyRecipe } from "../../data/specialCraftRecipes.js";
import type { InventorySlotVM } from "../../game/GameBridge";
import { ItemContextMenu } from "../../panels/ItemContextMenu";
import { getItemDisplayName } from "../../panels/ItemVisual";
import type { StorageRange } from "../../runtime/StorageRuntime";
import { useGameServices } from "../../state/GameContext";
import { FeatureAttentionBadge } from "../attention/FeatureAttentionBadge";
import {
  acknowledgeFeatureUnlocks,
  FEATURE_UNLOCK_VISITS,
  useFeatureUnlockPending,
  useFeatureUnlockVisit,
} from "../attention/usePlayerAttention";
import { BankModule } from "../bank";
import {
  createTrackedItemResource,
  isTrackableResourceItem,
  useResourceTracking,
} from "../dashboard/ResourceTrackingContext";
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
type InventoryFilter = "all" | "equipment" | "resources" | "special";

const INVENTORY_FILTERS: readonly { readonly id: InventoryFilter; readonly label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "equipment", label: "Équipement" },
  { id: "resources", label: "Ressources" },
  { id: "special", label: "Spéciaux" },
];

const ROMAN_TAB_LABELS = ["I", "II", "III", "IV", "V"] as const;

function isSpecialInventoryItem(itemId: string): boolean {
  return isRelicInventoryItem(itemId)
    || itemId.startsWith("item_resource_dungeon_key_")
    || itemId.startsWith("item_resource_artifact_")
    || itemId.startsWith("item_resource_key_fragment_");
}

function isEquipmentInventoryItem(itemId: string): boolean {
  return resolveEquipmentInfo(itemId) !== undefined;
}

function matchesInventoryFilter(slot: InventorySlotVM, filter: InventoryFilter): boolean {
  if (filter === "all") return true;
  const itemId = slot.itemId;
  if (itemId === undefined) return false;
  if (filter === "equipment") return isEquipmentInventoryItem(itemId);
  if (filter === "special") return isSpecialInventoryItem(itemId);
  return !isEquipmentInventoryItem(itemId) && !isSpecialInventoryItem(itemId);
}

function getBankTabRange(tabNumber: number, tabCapacity: number): StorageRange {
  return { start: (tabNumber - 1) * tabCapacity, length: tabCapacity };
}

export function InventoryModule(): JSX.Element {
  const inventory = useInventoryData();
  const actions = useInventoryActions();
  const services = useGameServices();
  const tracking = useResourceTracking();
  const bankExpansion = services.getBankExpansionModel();
  const yieldTrackingUnlocked = services.getAcademyModel().research.some(
    (research) => research.id === RESEARCH_IDS.yieldAnalysis && research.state === "completed",
  );
  const [activeTab, setActiveTab] = useState<StorageTab>("inventory");
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>("all");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const bankUnlockCount = useFeatureUnlockPending(FEATURE_UNLOCK_VISITS.bank);
  const yieldTrackingUnlockCount = useFeatureUnlockPending(FEATURE_UNLOCK_VISITS.resourceYieldTracking);

  useFeatureUnlockVisit(activeTab === "bank" ? FEATURE_UNLOCK_VISITS.bank : []);

  const capacityRatio = inventory.capacity === 0
    ? 0
    : Math.min(100, (inventory.occupied / inventory.capacity) * 100);
  const filteredSlots = inventory.slots.filter((slot) => matchesInventoryFilter(slot, activeFilter));

  const handleDoubleClick = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    slot: InventorySlotVM,
  ) => {
    if (slot.itemId === undefined || isRelicInventoryItem(slot.itemId)) return;
    if (event.shiftKey) {
      actions.transfer("inventory", slot.position, "bank");
      return;
    }
    if (getFragmentAssemblyRecipe(slot.itemId) !== undefined) {
      actions.assembleFragments(slot.itemId);
      return;
    }
    if (isEquipmentInventoryItem(slot.itemId)) actions.equip(slot.position);
    else actions.useConsumable(slot.itemId);
  }, [actions]);

  const handleContextMenu = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    slot: InventorySlotVM,
  ) => {
    event.preventDefault();
    if (slot.itemId === undefined || isRelicInventoryItem(slot.itemId)) {
      setContextMenu(null);
      return;
    }
    setContextMenu({ position: slot.position, x: event.clientX, y: event.clientY });
  }, []);

  const handleFilterChange = useCallback((filter: InventoryFilter) => {
    setActiveFilter(filter);
    setContextMenu(null);
  }, []);

  const contextItemId = contextMenu === null
    ? undefined
    : inventory.slots.find((slot) => slot.position === contextMenu.position)?.itemId;
  const contextIsEquipment = contextItemId !== undefined && isEquipmentInventoryItem(contextItemId);
  const bankDestinations = Array.from({ length: bankExpansion.unlockedTabCount }, (_, index) => {
    const tabNumber = index + 1;
    const range = getBankTabRange(tabNumber, bankExpansion.tabCapacity);
    return {
      tabNumber,
      label: `Banque ${ROMAN_TAB_LABELS[index] ?? String(tabNumber)}`,
      disabled: contextMenu === null
        || !actions.canTransferToRange("inventory", contextMenu.position, "bank", range),
    };
  });

  const handleMoveToBankTab = useCallback((position: number, tabNumber: number) => {
    actions.transferToRange(
      "inventory",
      position,
      "bank",
      getBankTabRange(tabNumber, bankExpansion.tabCapacity),
    );
    setContextMenu(null);
  }, [actions, bankExpansion.tabCapacity]);

  return (
    <div className="storage-module">
      <div className="storage-module__tabs" role="tablist" aria-label="Stockage">
        <button type="button" role="tab" aria-selected={activeTab === "inventory"} className={activeTab === "inventory" ? "is-active" : ""} onClick={() => { setActiveTab("inventory"); setContextMenu(null); }}>
          Inventaire
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "bank"} className={activeTab === "bank" ? "is-active" : ""} onClick={() => { setActiveTab("bank"); setContextMenu(null); }}>
          Banque
          <FeatureAttentionBadge count={bankUnlockCount} />
        </button>
      </div>

      {activeTab === "bank" ? (
        <BankModule
          onMove={(from, to) => { actions.move("bank", from, to); }}
          canMoveToRange={(from, range) => actions.canMoveToRange("bank", from, range)}
          onMoveToRange={(from, range) => actions.moveToRange("bank", from, range)}
          onTransferToInventory={(position) => { actions.transfer("bank", position, "inventory"); }}
          onSort={(start, length) => { actions.sort("bank", start, length); }}
        />
      ) : (
        <>
          <section className="storage-module__summary" aria-label="Capacité de l’inventaire">
            <div className="storage-module__summary-row">
              <div><small>Stockage personnel</small><span>Sac du héros</span></div>
              <strong>{String(inventory.occupied)} <small>/ {String(inventory.capacity)}</small></strong>
            </div>
            <div className="storage-module__capacity-track" aria-hidden="true">
              <span className="storage-module__capacity-fill" style={{ width: `${String(capacityRatio)}%` }} />
            </div>
          </section>

          <div className="storage-module__toolbar">
            <button type="button" className="storage-module__sort-button" onClick={() => { actions.sort("inventory"); }} aria-label="Trier l’inventaire" title="Trier l’inventaire">
              <img src="/assets/ui/action-sort.png" alt="" aria-hidden="true" draggable={false} />
            </button>
            <div className="storage-module__filters" role="group" aria-label="Filtrer l’inventaire">
              {INVENTORY_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={activeFilter === filter.id ? "is-active" : ""}
                  aria-pressed={activeFilter === filter.id}
                  onClick={() => { handleFilterChange(filter.id); }}
                >
                  {filter.label}
                  {filter.id === "resources" && <FeatureAttentionBadge count={yieldTrackingUnlockCount} />}
                </button>
              ))}
            </div>
            <span className="storage-module__shortcut">Maj + double-clic → banque</span>
          </div>

          <section className="storage-module__surface">
            {filteredSlots.length > 0 ? (
              <ItemGrid
                slots={filteredSlots}
                label={`Objets dans l’inventaire · filtre ${INVENTORY_FILTERS.find((filter) => filter.id === activeFilter)?.label ?? "Tous"}`}
                interactive
                draggable
                onItemDrop={(from, to) => { actions.move("inventory", from, to); }}
                onItemDoubleClick={handleDoubleClick}
                onItemContextMenu={handleContextMenu}
                {...(yieldTrackingUnlocked ? {
                  canFavoriteItem: isTrackableResourceItem,
                  isItemFavorite: tracking.isTracked,
                  onToggleItemFavorite: (itemId: string) => {
                    tracking.toggleTracked(createTrackedItemResource(itemId, getItemDisplayName(itemId)));
                    acknowledgeFeatureUnlocks(FEATURE_UNLOCK_VISITS.resourceYieldTracking);
                  },
                } : {})}
              />
            ) : (
              <p className="storage-module__empty-filter">Aucun objet dans cette catégorie.</p>
            )}
          </section>

          <p className="storage-module__hint">
            Double-clic : utiliser / équiper / assembler les fragments · glissez-déposez pour organiser · clic droit : déplacer vers une banque
            {yieldTrackingUnlocked ? " · étoile : suivre une ressource." : "."}
          </p>

          {contextMenu !== null && contextItemId !== undefined && (
            <ItemContextMenu
              position={contextMenu.position}
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => { setContextMenu(null); }}
              {...(contextIsEquipment ? {
                onEquip: (position: number) => { actions.equip(position); setContextMenu(null); },
              } : {})}
              bankDestinations={bankDestinations}
              onMoveToBank={handleMoveToBankTab}
            />
          )}
        </>
      )}
    </div>
  );
}
