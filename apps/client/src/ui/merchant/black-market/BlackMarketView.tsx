import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BLACK_MARKET_CARGO_SLOT_LIMIT,
  BLACK_MARKET_ROUTES,
  BLACK_MARKET_STACK_LIMIT,
  RESEARCH_IDS,
  type BlackMarketRouteId,
} from "@game/data";
import type { BlackMarketSnapshot } from "@game/gameplay";
import { resolveEquipmentInfo } from "../../../data/itemContentCatalog.js";
import { getItemTier } from "../../../data/itemPower.js";
import { resolveWeaponFamilyId } from "../../../data/weaponContentCatalog.js";
import { ItemVisual, getItemDisplayName } from "../../../panels/ItemVisual.js";
import {
  blackMarketRuntime,
  type BlackMarketCandidate,
  type BlackMarketSelection,
} from "../../../runtime/BlackMarketRuntime.js";
import { useGameServices } from "../../../state/GameContext.js";
import { syncInventoryToBridge } from "../../../state/bridge-sync/playerInventorySync.js";
import { syncWalletToBridge } from "../../../state/bridge-sync/economySync.js";
import { formatCompactNumber } from "../../shared/index.js";
import { useMerchantData } from "../useMerchantData.js";
import "./black-market.css";

type StockSourceFilter = "all" | "inventory" | "bank";
type StockTypeFilter = "all" | "weapon" | "head" | "chest" | "boots";
type StockSort = "value" | "tier" | "quantity" | "name";
type CargoSlot = BlackMarketSelection | null;

const EMPTY_CARGO: readonly CargoSlot[] = Array.from(
  { length: BLACK_MARKET_CARGO_SLOT_LIMIT },
  () => null,
);

function selectionKey(selection: Pick<BlackMarketSelection, "source" | "itemId" | "enchantment">): string {
  return `${selection.source}|${selection.itemId}|${String(selection.enchantment)}`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours)}h ${String(minutes).padStart(2, "0")}m`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function demandLabel(targetType: string, targetId: string): string {
  if (targetType === "armor_slot") {
    return targetId === "head" ? "Têtes" : targetId === "torso" ? "Plastrons" : "Bottes";
  }
  return targetId === "fire_staff"
    ? "Bâtons de feu"
    : targetId === "gloves"
      ? "Gants"
      : targetId === "dagger"
        ? "Dagues"
        : targetId === "bow"
          ? "Arcs"
          : "Épées";
}

function armorDemandSlot(itemId: string): string | undefined {
  const slot = resolveEquipmentInfo(itemId)?.slot;
  if (slot === "head") return "head";
  if (slot === "chest") return "torso";
  if (slot === "boots") return "boots";
  return undefined;
}

function matchesDemand(candidate: BlackMarketCandidate, snapshot: BlackMarketSnapshot): boolean {
  const tier = getItemTier(candidate.itemId);
  if (tier === undefined) return false;
  const weaponFamily = resolveWeaponFamilyId(candidate.itemId);
  const armorSlot = armorDemandSlot(candidate.itemId);
  return snapshot.demands.some((demand) => (
    demand.fulfilledQuantity < demand.requiredQuantity
    && demand.tier === tier
    && (
      (demand.targetType === "weapon_family" && demand.targetId === weaponFamily)
      || (demand.targetType === "armor_slot" && demand.targetId === armorSlot)
    )
  ));
}

function matchesType(candidate: BlackMarketCandidate, type: StockTypeFilter): boolean {
  if (type === "all") return true;
  const slot = resolveEquipmentInfo(candidate.itemId)?.slot;
  if (type === "weapon") return slot === "weapon";
  return slot === type;
}

export function BlackMarketView(): JSX.Element {
  const services = useGameServices();
  const { wallet } = useMerchantData();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [snapshot, setSnapshot] = useState<BlackMarketSnapshot | null>(null);
  const [cargoSlots, setCargoSlots] = useState<readonly CargoSlot[]>(EMPTY_CARGO);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [routeId, setRouteId] = useState<BlackMarketRouteId>("watched");
  const [confirmingDeparture, setConfirmingDeparture] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [stockSource, setStockSource] = useState<StockSourceFilter>("all");
  const [stockTier, setStockTier] = useState<number | "all">("all");
  const [stockType, setStockType] = useState<StockTypeFilter>("all");
  const [stockEnchant, setStockEnchant] = useState<number | "all">("all");
  const [demandOnly, setDemandOnly] = useState(false);
  const [stockSort, setStockSort] = useState<StockSort>("value");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [, forceRevision] = useState(0);

  const blackMarketUnlocked = services.getAcademyModel().research.some((entry) => (
    entry.id === RESEARCH_IDS.blackMarket && entry.state === "completed"
  ));

  const getUnlockedTiers = useCallback((): readonly number[] => (
    [...new Set(
      services.bridge.world.zones
        .filter((zone) => zone.isUnlocked && zone.tier >= 4 && zone.tier <= 8)
        .map((zone) => zone.tier),
    )].sort((a, b) => a - b)
  ), [services]);

  const onMutation = useCallback((): void => {
    syncInventoryToBridge(services.bridge, services.inventoryManager, services.heroId);
    syncWalletToBridge(
      services.bridge,
      services.currencyService,
      services.walletId,
      wallet.incomeRate,
    );
    services.saveGame();
    forceRevision((value) => value + 1);
  }, [services, wallet.incomeRate]);

  blackMarketRuntime.bind({
    inventoryManager: services.inventoryManager,
    heroId: services.heroId,
    bankId: services.bankId,
    currencyService: services.currencyService,
    walletId: services.walletId,
    awakenedWeaponService: services.awakenedWeaponService,
    isUnlocked: () => blackMarketUnlocked,
    getUnlockedTiers,
    onMutation,
  });

  const refreshSnapshot = useCallback((atMs: number): void => {
    setSnapshot(blackMarketRuntime.getSnapshot(atMs));
  }, []);

  useEffect(() => {
    refreshSnapshot(nowMs);
    const intervalId = window.setInterval(() => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      refreshSnapshot(nextNow);
    }, 1000);
    return () => { window.clearInterval(intervalId); };
  }, [refreshSnapshot]);

  const candidates = useMemo(
    () => blackMarketUnlocked ? blackMarketRuntime.getCandidates() : [],
    [blackMarketUnlocked, nowMs, snapshot],
  );
  const selectedEntries = cargoSlots.filter((slot): slot is BlackMarketSelection => slot !== null);
  const selectedUnitCount = selectedEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const quote = selectedEntries.length === 0
    ? undefined
    : blackMarketRuntime.quoteSelection(selectedEntries, nowMs);
  const route = BLACK_MARKET_ROUTES.find((entry) => entry.id === routeId) ?? BLACK_MARKET_ROUTES[0];
  const cargoBmValue = quote?.cargoBmValue ?? 0;
  const selectedPayout = Math.round(cargoBmValue * route.payoutMultiplier);
  const selectedEv = Math.round(selectedPayout * route.successChance);

  const visibleCandidates = useMemo(() => {
    if (snapshot === null) return [];
    const query = stockSearch.trim().toLocaleLowerCase("fr");
    return candidates
      .filter((candidate) => stockSource === "all" || candidate.source === stockSource)
      .filter((candidate) => stockTier === "all" || getItemTier(candidate.itemId) === stockTier)
      .filter((candidate) => stockEnchant === "all" || candidate.enchantment === stockEnchant)
      .filter((candidate) => matchesType(candidate, stockType))
      .filter((candidate) => !demandOnly || matchesDemand(candidate, snapshot))
      .filter((candidate) => query === "" || getItemDisplayName(candidate.itemId).toLocaleLowerCase("fr").includes(query))
      .sort((a, b) => {
        if (stockSort === "tier") return (getItemTier(b.itemId) ?? 0) - (getItemTier(a.itemId) ?? 0);
        if (stockSort === "quantity") return b.availableQuantity - a.availableQuantity;
        if (stockSort === "name") return getItemDisplayName(a.itemId).localeCompare(getItemDisplayName(b.itemId), "fr");
        return b.normalBmValue - a.normalBmValue;
      });
  }, [candidates, demandOnly, snapshot, stockEnchant, stockSearch, stockSort, stockSource, stockTier, stockType]);

  const updateSlot = (index: number, nextSlot: CargoSlot): void => {
    setConfirmingDeparture(false);
    setCargoSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? nextSlot : slot));
  };

  const selectCandidate = (candidate: BlackMarketCandidate): void => {
    if (activeSlotIndex === null) return;
    const duplicateIndex = cargoSlots.findIndex((slot, index) => (
      index !== activeSlotIndex && slot !== null && selectionKey(slot) === selectionKey(candidate)
    ));
    if (duplicateIndex >= 0) {
      setActiveSlotIndex(duplicateIndex);
      return;
    }
    const wasEmpty = cargoSlots[activeSlotIndex] === null;
    updateSlot(activeSlotIndex, {
      source: candidate.source,
      itemId: candidate.itemId,
      enchantment: candidate.enchantment,
      quantity: 1,
    });
    if (wasEmpty) setActiveSlotIndex(null);
  };

  const changeActiveQuantity = (delta: number): void => {
    if (activeSlotIndex === null) return;
    const slot = cargoSlots[activeSlotIndex];
    if (slot === null) return;
    const candidate = candidates.find((entry) => selectionKey(entry) === selectionKey(slot));
    if (candidate === undefined) return;
    const nextQuantity = Math.max(1, Math.min(
      BLACK_MARKET_STACK_LIMIT,
      candidate.availableQuantity,
      slot.quantity + delta,
    ));
    updateSlot(activeSlotIndex, { ...slot, quantity: nextQuantity });
  };

  const sendConvoy = (): void => {
    if (selectedEntries.length === 0) return;
    if (blackMarketRuntime.startConvoy(selectedEntries, routeId, nowMs)) {
      setCargoSlots(EMPTY_CARGO);
      setActiveSlotIndex(null);
      setConfirmingDeparture(false);
      refreshSnapshot(nowMs);
    }
  };

  if (!blackMarketUnlocked) return <p className="ui-merchant__empty">Le Marché Noir n’est pas encore débloqué.</p>;
  if (snapshot === null) return <p className="ui-merchant__empty">Chargement du Marché Noir…</p>;

  const activeConvoy = snapshot.activeConvoy;
  const result = snapshot.lastResult;
  if (result !== null) {
    const resultRoute = BLACK_MARKET_ROUTES.find((entry) => entry.id === result.routeId);
    return (
      <section className="ui-black-market ui-black-market--result">
        <div className="ui-merchant-section-title"><span>{result.success ? "Convoi livré" : "Convoi perdu"}</span><small>{resultRoute?.displayName ?? result.routeId}</small></div>
        <div className="ui-black-market__result-card">
          <strong>{result.success ? `${formatCompactNumber(result.silverReceived, "0")} Silver` : "0 Silver"}</strong>
          <span>{result.success ? "Paiement reçu" : "Cargo intégralement perdu"}</span>
        </div>
        <button type="button" className="ui-merchant__primary" onClick={() => { blackMarketRuntime.dismissResult(); refreshSnapshot(Date.now()); }}>Fermer le récapitulatif</button>
      </section>
    );
  }

  if (activeConvoy !== null) {
    const activeRoute = BLACK_MARKET_ROUTES.find((entry) => entry.id === activeConvoy.routeId);
    return (
      <section className="ui-black-market ui-black-market--active">
        <div className="ui-merchant-section-title"><span>Convoi en cours</span><small>{activeRoute?.displayName ?? activeConvoy.routeId}</small></div>
        <div className="ui-black-market__active-card">
          <div><span>Temps restant</span><strong>{formatDuration(activeConvoy.completesAt - nowMs)}</strong></div>
          <div><span>Cargo</span><strong>{activeConvoy.cargo.reduce((sum, line) => sum + line.quantity, 0)} items</strong></div>
          <div><span>Valeur BM</span><strong>{formatCompactNumber(activeConvoy.payoutOnSuccess, "0")}</strong></div>
        </div>
        <p className="ui-black-market__hidden-result">Résultat : ????? — révélé à l’arrivée.</p>
      </section>
    );
  }

  const activeSlot = activeSlotIndex === null ? null : cargoSlots[activeSlotIndex];

  return (
    <section className="ui-black-market">
      <div className="ui-merchant-section-title"><span>Demandes spéciales</span><small>Reset dans {formatDuration(snapshot.nextResetAt - nowMs)}</small></div>
      <div className="ui-black-market__demands">
        {snapshot.demands.map((demand) => (
          <article key={demand.id}>
            <strong>{demandLabel(demand.targetType, demand.targetId)} T{String(demand.tier)}</strong>
            <b>+{String(Math.round(demand.bonus * 100))}%</b>
            <span>{String(demand.requiredQuantity - demand.fulfilledQuantity)} / {String(demand.requiredQuantity)} restants</span>
          </article>
        ))}
      </div>

      <div className="ui-merchant-section-title"><span>Cargo</span><small>{String(selectedEntries.length)} / {String(BLACK_MARKET_CARGO_SLOT_LIMIT)} slots · {String(selectedUnitCount)} / 40 items</small></div>
      <div className="ui-black-market__cargo-slots">
        {cargoSlots.map((slot, index) => {
          const candidate = slot === null ? undefined : candidates.find((entry) => selectionKey(entry) === selectionKey(slot));
          const isDemand = candidate !== undefined && matchesDemand(candidate, snapshot);
          const tier = slot === null ? undefined : getItemTier(slot.itemId);
          const displayName = slot === null ? "" : getItemDisplayName(slot.itemId);
          return (
            <button
              type="button"
              key={index}
              title={slot === null ? `Ajouter au slot ${String(index + 1)}` : displayName}
              aria-label={slot === null ? `Ajouter au slot ${String(index + 1)}` : `${displayName}, T${String(tier ?? "?")}.${String(slot.enchantment)}, quantité ${String(slot.quantity)}`}
              className={`ui-black-market__cargo-slot${slot === null ? " is-empty" : ""}${isDemand ? " is-demand" : ""}`}
              onClick={() => { setActiveSlotIndex(index); setConfirmingDeparture(false); }}
            >
              {slot === null ? (
                <><span className="ui-black-market__slot-plus">+</span><small>Ajouter</small></>
              ) : (
                <>
                  <ItemVisual itemId={slot.itemId} />
                  <strong>T{String(tier ?? "?")}.{String(slot.enchantment)}</strong>
                  <span>x{String(slot.quantity)}</span>
                  {isDemand && <b>Demandé</b>}
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="ui-black-market__cargo-total">
        <span>Valeur BM du cargo</span><strong>{formatCompactNumber(cargoBmValue, "0")}</strong>
      </div>

      <div className="ui-merchant-section-title"><span>Routes</span><small>Échec = perte totale</small></div>
      <div className="ui-black-market__routes">
        {BLACK_MARKET_ROUTES.map((candidateRoute) => {
          const payout = Math.round(cargoBmValue * candidateRoute.payoutMultiplier);
          const ev = Math.round(payout * candidateRoute.successChance);
          return (
            <button type="button" key={candidateRoute.id} className={routeId === candidateRoute.id ? "is-selected" : ""} onClick={() => { setRouteId(candidateRoute.id); setConfirmingDeparture(false); }}>
              <strong>{candidateRoute.displayName}</strong>
              <div className="ui-black-market__route-meta">
                <span>{String(Math.round(candidateRoute.successChance * 100))}% succès</span>
                <small>{formatDuration(candidateRoute.durationMs)}</small>
              </div>
              <div className="ui-black-market__route-payout">
                <small>Gain si succès</small>
                <b>{formatCompactNumber(payout, "0")}</b>
              </div>
              <em>EV {formatCompactNumber(ev, "0")}</em>
            </button>
          );
        })}
      </div>

      {confirmingDeparture && quote !== undefined ? (
        <div className="ui-black-market__confirmation" role="alertdialog" aria-label="Confirmer le départ du convoi">
          <strong>Confirmer — {route.displayName}</strong>
          <span>{String(Math.round(route.successChance * 100))}% de succès · {formatDuration(route.durationMs)} · {formatCompactNumber(selectedPayout, "0")} Silver</span>
          <small>Le cargo et les demandes sont engagés immédiatement. Échec = perte totale. Aucune annulation.</small>
          <div><button type="button" onClick={() => { setConfirmingDeparture(false); }}>Retour</button><button type="button" className="ui-merchant__primary" onClick={sendConvoy}>Confirmer le départ</button></div>
        </div>
      ) : (
        <div className="ui-black-market__departure">
          <div><span>{route.displayName}</span><small>EV : {formatCompactNumber(selectedEv, "0")} Silver</small></div>
          <button type="button" className="ui-merchant__primary" disabled={quote === undefined || selectedUnitCount === 0} onClick={() => { setConfirmingDeparture(true); }}>Envoyer le convoi</button>
        </div>
      )}

      {activeSlotIndex !== null && (
        <div className="ui-black-market__picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setActiveSlotIndex(null); }}>
          <section className="ui-black-market__picker" role="dialog" aria-modal="true" aria-label={`Remplir le slot ${String(activeSlotIndex + 1)}`}>
            <header>
              <div><strong>Slot {String(activeSlotIndex + 1)}</strong><small>{activeSlot === null ? "Choisir un équipement" : "Modifier ou remplacer"}</small></div>
              <button type="button" onClick={() => { setActiveSlotIndex(null); }}>×</button>
            </header>

            {activeSlot !== null && (
              <div className="ui-black-market__picker-current">
                <ItemVisual itemId={activeSlot.itemId} />
                <div><strong>{getItemDisplayName(activeSlot.itemId)}{activeSlot.enchantment > 0 ? ` .${String(activeSlot.enchantment)}` : ""}</strong><small>{activeSlot.source === "inventory" ? "Inventaire" : "Banque"}</small></div>
                <div className="ui-black-market__quantity"><button type="button" onClick={() => { changeActiveQuantity(-1); }}>−</button><b>{String(activeSlot.quantity)}</b><button type="button" onClick={() => { changeActiveQuantity(1); }}>+</button></div>
                <button type="button" className="ui-black-market__remove" onClick={() => { updateSlot(activeSlotIndex, null); }}>Retirer</button>
              </div>
            )}

            <div className="ui-black-market__picker-filters">
              <input type="search" value={stockSearch} placeholder="Rechercher…" onChange={(event) => { setStockSearch(event.target.value); }} />
              <select value={String(stockTier)} onChange={(event) => { setStockTier(event.target.value === "all" ? "all" : Number(event.target.value)); }}><option value="all">Tous tiers</option>{[4, 5, 6, 7, 8].map((tierOption) => <option key={tierOption} value={tierOption}>T{String(tierOption)}</option>)}</select>
              <select value={stockType} onChange={(event) => { setStockType(event.target.value as StockTypeFilter); }}><option value="all">Tous types</option><option value="weapon">Armes</option><option value="head">Têtes</option><option value="chest">Plastrons</option><option value="boots">Bottes</option></select>
              <label className="ui-black-market__demand-filter"><input type="checkbox" checked={demandOnly} onChange={(event) => { setDemandOnly(event.target.checked); }} />Demandes uniquement</label>
              <button type="button" className="ui-black-market__advanced-toggle" aria-expanded={advancedFiltersOpen} onClick={() => { setAdvancedFiltersOpen((value) => !value); }}>
                {advancedFiltersOpen ? "Masquer les filtres avancés" : "Filtres avancés"}
              </button>
              {advancedFiltersOpen && (
                <div className="ui-black-market__advanced-filters">
                  <select value={stockSource} onChange={(event) => { setStockSource(event.target.value as StockSourceFilter); }}><option value="all">Tout stockage</option><option value="inventory">Inventaire</option><option value="bank">Banque</option></select>
                  <select value={String(stockEnchant)} onChange={(event) => { setStockEnchant(event.target.value === "all" ? "all" : Number(event.target.value)); }}><option value="all">Tous enchant.</option>{[0, 1, 2, 3, 4].map((level) => <option key={level} value={level}>.{String(level)}</option>)}</select>
                  <select value={stockSort} onChange={(event) => { setStockSort(event.target.value as StockSort); }}><option value="value">Valeur BM</option><option value="tier">Tier</option><option value="quantity">Quantité</option><option value="name">Nom</option></select>
                </div>
              )}
            </div>

            <div className="ui-black-market__picker-list">
              {visibleCandidates.length === 0 && <p className="ui-merchant__empty">Aucun équipement ne correspond aux filtres.</p>}
              {visibleCandidates.map((candidate) => {
                const key = selectionKey(candidate);
                const selectedElsewhere = cargoSlots.some((slot, index) => index !== activeSlotIndex && slot !== null && selectionKey(slot) === key);
                const isDemand = matchesDemand(candidate, snapshot);
                return (
                  <button type="button" key={key} disabled={selectedElsewhere} onClick={() => { selectCandidate(candidate); }}>
                    <ItemVisual itemId={candidate.itemId} />
                    <span><strong>{getItemDisplayName(candidate.itemId)}{candidate.enchantment > 0 ? ` .${String(candidate.enchantment)}` : ""}</strong><small>{candidate.source === "inventory" ? "Inventaire" : "Banque"} · x{String(candidate.availableQuantity)}</small></span>
                    <span className="ui-black-market__picker-value"><b>{formatCompactNumber(candidate.normalBmValue, "0")}</b>{isDemand && <small>Demandé</small>}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}