import { useCallback, useMemo, useState } from "react";
import {
  asEconomyTransactionId,
  getEnchantmentItemPowerBonus,
  type ItemInstanceId,
} from "@game/gameplay";
import { PanelContainer } from "./PanelContainer";
import { TransactionConfirmModal } from "./TransactionConfirmModal";
import {
  getEnchantmentFrameClass,
  getItemDisplayName,
  ItemVisual,
} from "./ItemVisual";
import { ItemHoverTooltip } from "./ItemHoverTooltip";
import { useGameBridge, useGameServices } from "../state/GameContext";
import {
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncWalletToBridge,
} from "../state/bridgeSync";
import { usePanelManager } from "./usePanelManager";

type MerchantView = "buy" | "sell" | "repair" | "enchant";

const ENCHANTMENT_MATERIAL_LABELS: Readonly<Record<string, string>> = {
  item_resource_enchantment_essence: "Essence d’enchantement",
  item_resource_arcane_crystal: "Cristal arcanique",
  item_resource_enchantment_catalyst: "Catalyseur d’enchantement",
};

const ENCHANTMENT_STOCK_ITEMS = [
  "item_resource_enchantment_essence",
  "item_resource_arcane_crystal",
  "item_resource_enchantment_catalyst",
] as const;

interface PendingTransaction {
  readonly direction: "buy" | "sell";
  readonly itemId: string;
  readonly unitPrice: number;
  readonly quantity: number;
}

export function VendorPanel(): JSX.Element | null {
  const { activePanel, closePanel } = usePanelManager();
  const state = useGameBridge();
  const services = useGameServices();
  const [view, setView] = useState<MerchantView>("buy");
  const [pending, setPending] = useState<PendingTransaction | null>(null);
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>({});
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [selectedEnchantInstance, setSelectedEnchantInstance] = useState<string | null>(null);

  const ownedByItem = useMemo(() => {
    const totals = new Map<string, number>();
    for (const slot of state.inventory.slots) {
      if (slot.itemId !== undefined) {
        totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + slot.quantity);
      }
    }
    return totals;
  }, [state.inventory.slots]);

  const sellableOffers = state.vendor.offers.filter(
    (offer) => offer.sellPrice !== null && (ownedByItem.get(offer.itemId) ?? 0) > 0,
  );
  const enchantableItems = useMemo(() => {
    const inventoryItems = state.inventory.slots
      .filter((slot) => slot.itemId !== undefined && slot.instanceId !== undefined)
      .map((slot) => ({ ...slot, equipped: false as const }));
    const equippedItems = state.equipment.slots
      .filter((slot) => slot.itemId !== undefined && slot.instanceId !== undefined)
      .map((slot) => ({
        ...slot,
        quantity: 1,
        position: -1,
        equipped: true as const,
      }));
    return [...equippedItems, ...inventoryItems].filter((slot) => {
      if (slot.instanceId === undefined) return false;
      const preview = services.enchantmentService.preview(
        slot.instanceId as ItemInstanceId,
      );
      return preview !== undefined && preview.failureReason !== "item_not_enchantable";
    });
  }, [
    services.enchantmentService,
    state.equipment.slots,
    state.inventory.slots,
  ]);
  const enchantmentPreview = selectedEnchantInstance === null
    ? undefined
    : services.enchantmentService.preview(
      selectedEnchantInstance as ItemInstanceId,
    );

  const setSellQuantity = useCallback((itemId: string, quantity: number, owned: number) => {
    const safeQuantity = Math.max(1, Math.min(owned, Math.floor(quantity)));
    setSellQuantities((current) => ({ ...current, [itemId]: safeQuantity }));
  }, []);

  const setBuyQuantity = useCallback((itemId: string, quantity: number, unitPrice: number) => {
    const affordable = Math.max(1, Math.floor(state.wallet.silver / unitPrice));
    const safeQuantity = Math.max(1, Math.min(affordable, Math.floor(quantity)));
    setBuyQuantities((current) => ({ ...current, [itemId]: safeQuantity }));
  }, [state.wallet.silver]);

  const openSale = useCallback((itemId: string, unitPrice: number, quantity: number) => {
    setPending({ direction: "sell", itemId, unitPrice, quantity });
  }, []);

  const handleConfirm = useCallback(() => {
    if (pending === null) {
      return;
    }
    const {
      bridge,
      economyTransactionService,
      walletId,
      playerId,
      heroId,
      inventoryManager,
      currencyService,
    } = services;
    const txId = asEconomyTransactionId(
      `tx_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
    );
    const total = pending.unitPrice * pending.quantity;
    const result = economyTransactionService.execute({
      type: pending.direction === "buy" ? "vendor_purchase" : "vendor_sale",
      transactionId: txId,
      playerId,
      playerEntityId: heroId,
      walletId,
      vendorId: "vendor_general",
      itemId: pending.itemId,
      quantity: pending.quantity,
    });

    if (result.ok) {
      const isPurchase = pending.direction === "buy";
      bridge.addTransaction({
        id: txId,
        type: isPurchase ? "purchase" : "sale",
        description: `${isPurchase ? "Achat" : "Vente"} : ${getItemDisplayName(pending.itemId)} ×${String(pending.quantity)}`,
        amount: total,
        timestamp: Date.now(),
      });
      bridge.addEconomyNotification({
        id: `notif_${txId}`,
        type: "success",
        message: `${isPurchase ? "Achat" : "Vente"} · ${String(pending.quantity)} × ${getItemDisplayName(pending.itemId)} · ${String(total)} Silver`,
        timestamp: Date.now(),
      });
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncWalletToBridge(bridge, currencyService, walletId, state.wallet.incomeRate);
      setSellQuantities((current) => ({ ...current, [pending.itemId]: 1 }));
      if (isPurchase) {
        setBuyQuantities((current) => ({ ...current, [pending.itemId]: 1 }));
      }
    } else {
      bridge.addEconomyNotification({
        id: `notif_${txId}`,
        type: "error",
        message: `Transaction impossible : ${result.code}`,
        timestamp: Date.now(),
      });
    }
    setPending(null);
  }, [pending, services, state.wallet.incomeRate]);

  if (activePanel !== "vendor") {
    return null;
  }

  const totalPendingValue = pending === null ? 0 : pending.unitPrice * pending.quantity;

  return (
    <PanelContainer title="Marchand" onClose={closePanel}>
      <div className="merchant-panel">
        <header className="merchant-panel__header">
          <div>
            <span className="merchant-panel__eyebrow">COMPTOIR GÉNÉRAL</span>
            <h2>Services du marchand</h2>
          </div>
          <strong className="merchant-panel__balance">S {String(state.wallet.silver)}</strong>
        </header>

        <div className="merchant-panel__workspace">
          <aside className="merchant-panel__services" aria-label="Services du marchand">
            <div
              className={
                view === "buy" || view === "sell"
                  ? "merchant-service merchant-service--active merchant-service--expanded"
                  : "merchant-service"
              }
            >
              <button
                type="button"
                className="merchant-service__header"
                onClick={() => { setView("buy"); }}
              >
                <span className="merchant-service__icon">🛒</span>
                <span>
                  <strong>Marchand</strong>
                  <small>Achat et vente</small>
                </span>
                <i>›</i>
              </button>
              {(view === "buy" || view === "sell") && (
                <div className="merchant-service__subnav">
                  <button
                    type="button"
                    className={view === "buy" ? "is-active" : ""}
                    onClick={() => { setView("buy"); }}
                  >
                    Acheter
                  </button>
                  <button
                    type="button"
                    className={view === "sell" ? "is-active" : ""}
                    onClick={() => { setView("sell"); }}
                  >
                    Vendre
                  </button>
                </div>
              )}
            </div>

            <MerchantServiceTab
              active={view === "enchant"}
              icon="✦"
              label="Enchanteur"
              description="Renforcer l’équipement"
              onClick={() => { setView("enchant"); }}
            />
            <MerchantServiceTab
              active={view === "repair"}
              icon="🔨"
              label="Réparateur"
              description="Restaurer la durabilité"
              onClick={() => { setView("repair"); }}
            />
          </aside>

          <main className="merchant-panel__service-content">

        {view === "buy" && (
          <section className="merchant-panel__content">
            <div className="merchant-panel__section-heading">
              <div>
                <span className="merchant-panel__eyebrow">STOCK DU MARCHAND</span>
                <h3>Articles à acheter</h3>
              </div>
              <span>Stock illimité</span>
            </div>
            <div className="merchant-grid">
              {state.vendor.offers.filter((offer) =>
                offer.buyPrice !== null
                && (offer.itemId === "item_health_potion" || offer.itemId === "item_energy_potion"),
              ).map((offer) => {
                const unitPrice = offer.buyPrice ?? 0;
                const quantity = buyQuantities[offer.itemId] ?? 1;
                return (
                <article key={offer.itemId} className="merchant-card">
                  <ItemHoverTooltip itemId={offer.itemId} quantity={quantity}>
                    <div className="merchant-card__visual"><ItemVisual itemId={offer.itemId} /></div>
                  </ItemHoverTooltip>
                  <div className="merchant-card__body">
                    <strong>{getItemDisplayName(offer.itemId)}</strong>
                    <span>Possédé : {String(ownedByItem.get(offer.itemId) ?? 0)}</span>
                    <div className="merchant-card__quantity">
                      <button type="button" onClick={() => { setBuyQuantity(offer.itemId, quantity - 1, unitPrice); }}>−</button>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, Math.floor(state.wallet.silver / unitPrice))}
                        value={quantity}
                        onChange={(event) => {
                          setBuyQuantity(offer.itemId, Number(event.currentTarget.value), unitPrice);
                        }}
                      />
                      <button type="button" onClick={() => { setBuyQuantity(offer.itemId, quantity + 1, unitPrice); }}>+</button>
                    </div>
                    <div className="merchant-card__footer">
                      <b>{String(unitPrice * quantity)} Silver</b>
                      <button
                        type="button"
                        disabled={state.wallet.silver < unitPrice * quantity}
                        onClick={() => {
                          setPending({
                            direction: "buy",
                            itemId: offer.itemId,
                            unitPrice,
                            quantity,
                          });
                        }}
                      >
                        Acheter
                      </button>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
          </section>
        )}

        {view === "sell" && (
          <section className="merchant-panel__content">
            <div className="merchant-panel__section-heading">
              <div>
                <span className="merchant-panel__eyebrow">RACHAT</span>
                <h3>Vendre des objets</h3>
              </div>
              <span>Choisissez une quantité ou vendez toute la pile.</span>
            </div>
            {sellableOffers.length === 0 ? (
              <p className="merchant-panel__empty">Le marchand n’accepte actuellement aucun objet de votre inventaire.</p>
            ) : (
              <div className="merchant-sell-list">
                {sellableOffers.map((offer) => {
                  const owned = ownedByItem.get(offer.itemId) ?? 0;
                  const quantity = Math.min(owned, sellQuantities[offer.itemId] ?? 1);
                  const unitPrice = offer.sellPrice ?? 0;
                  return (
                    <article key={offer.itemId} className="merchant-sell-row">
                      <div className="merchant-sell-row__item">
                        <ItemHoverTooltip itemId={offer.itemId} quantity={owned}>
                          <span className="merchant-sell-row__visual"><ItemVisual itemId={offer.itemId} /></span>
                        </ItemHoverTooltip>
                        <div>
                          <strong>{getItemDisplayName(offer.itemId)}</strong>
                          <span>{String(owned)} possédé(s) · {String(unitPrice)} Silver/unité</span>
                        </div>
                      </div>
                      <div className="merchant-sell-row__quantity">
                        <button type="button" onClick={() => { setSellQuantity(offer.itemId, quantity - 1, owned); }}>−</button>
                        <input
                          type="number"
                          min={1}
                          max={owned}
                          value={quantity}
                          aria-label={`Quantité de ${getItemDisplayName(offer.itemId)}`}
                          onChange={(event) => {
                            setSellQuantity(offer.itemId, Number(event.currentTarget.value), owned);
                          }}
                        />
                        <button type="button" onClick={() => { setSellQuantity(offer.itemId, quantity + 1, owned); }}>+</button>
                      </div>
                      <strong className="merchant-sell-row__value">{String(unitPrice * quantity)} S</strong>
                      <div className="merchant-sell-row__actions">
                        <button type="button" onClick={() => { openSale(offer.itemId, unitPrice, quantity); }}>
                          Vendre
                        </button>
                        <button
                          type="button"
                          className="merchant-sell-row__all"
                          onClick={() => { openSale(offer.itemId, unitPrice, owned); }}
                        >
                          Tout vendre
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {view === "repair" && (
          <section className="merchant-panel__content">
            <div className="merchant-panel__section-heading">
              <div>
                <span className="merchant-panel__eyebrow">ATELIER</span>
                <h3>Réparer l’équipement</h3>
              </div>
              <span>Le marchand restaure entièrement la durabilité.</span>
            </div>
            {state.repair.items.length === 0 ? (
              <p className="merchant-panel__empty">Aucun équipement endommagé.</p>
            ) : (
              <>
                <div className="merchant-repair-list">
                  {state.repair.items.map((item) => {
                    const percentage = item.maxDurability === 0
                      ? 0
                      : Math.round((item.currentDurability / item.maxDurability) * 100);
                    return (
                      <article key={item.instanceId} className="merchant-repair-row">
                        <ItemHoverTooltip itemId={item.itemId} instanceId={item.instanceId}>
                          <span className="merchant-repair-row__visual"><ItemVisual itemId={item.itemId} /></span>
                        </ItemHoverTooltip>
                        <div className="merchant-repair-row__body">
                          <strong>{getItemDisplayName(item.itemId)}</strong>
                          <span>{String(item.currentDurability)} / {String(item.maxDurability)} · {String(percentage)}%</span>
                          <div><i style={{ width: `${String(percentage)}%` }} /></div>
                        </div>
                        <b>{String(item.repairCost)} S</b>
                      </article>
                    );
                  })}
                </div>
                <footer className="merchant-repair-total">
                  <div>
                    <span>Coût total</span>
                    <strong>{String(state.repair.totalCost)} Silver</strong>
                  </div>
                  <button
                    type="button"
                    disabled={state.repair.totalCost === 0 || state.wallet.silver < state.repair.totalCost}
                    onClick={() => { services.repairAll(); }}
                  >
                    Tout réparer
                  </button>
                </footer>
              </>
            )}
          </section>
        )}

        {view === "enchant" && (
          <section className="merchant-panel__content merchant-enchant">
            <div className="merchant-panel__section-heading">
              <div>
                <span className="merchant-panel__eyebrow">ATELIER D’ENCHANTEMENT</span>
                <h3>Renforcer un équipement</h3>
              </div>
              <span>Amélioration garantie · Niveau maximal actuel : .3</span>
            </div>

            <div className="merchant-enchant__stocks" aria-label="Stocks d’enchantement">
              {ENCHANTMENT_STOCK_ITEMS.map((itemId) => (
                <div key={itemId}>
                  <ItemVisual itemId={itemId} />
                  <span>{ENCHANTMENT_MATERIAL_LABELS[itemId]}</span>
                  <strong>{String(ownedByItem.get(itemId) ?? 0)}</strong>
                </div>
              ))}
            </div>

            <div className="merchant-enchant__layout">
              <div className="merchant-enchant__inventory">
                <h4>Équipements disponibles</h4>
                <div className="merchant-enchant__grid">
                  {enchantableItems.map((slot) => {
                    const itemId = slot.itemId;
                    const instanceId = slot.instanceId;
                    if (itemId === undefined || instanceId === undefined) return null;
                    const preview = services.enchantmentService.preview(
                      instanceId as ItemInstanceId,
                    );
                    if (preview === undefined || preview.failureReason === "item_not_enchantable") {
                      return null;
                    }
                    return (
                      <button
                        key={instanceId}
                        type="button"
                        className={
                          selectedEnchantInstance === instanceId
                            ? `merchant-enchant__item merchant-enchant__item--selected${
                              getEnchantmentFrameClass(slot.enchantment)
                            }`
                            : `merchant-enchant__item${
                              getEnchantmentFrameClass(slot.enchantment)
                            }`
                        }
                        onClick={() => { setSelectedEnchantInstance(instanceId); }}
                      >
                        <ItemVisual itemId={itemId} />
                        <span>{getItemDisplayName(itemId)}</span>
                        <strong>.{String(slot.enchantment)}</strong>
                        {slot.equipped && (
                          <em className="merchant-enchant__equipped">Équipé</em>
                        )}
                      </button>
                    );
                  })}
                </div>
                {enchantableItems.length === 0 && (
                  <p className="merchant-panel__empty">
                    Aucun équipement compatible disponible.
                  </p>
                )}
              </div>

              <div className="merchant-enchant__preview">
                {enchantmentPreview === undefined ? (
                  <p className="merchant-panel__empty">
                    Sélectionnez un équipement pour afficher son amélioration.
                  </p>
                ) : (
                  <>
                    <div className="merchant-enchant__selected">
                      <ItemVisual itemId={enchantmentPreview.itemId} />
                      <div>
                        <span>{getItemDisplayName(enchantmentPreview.itemId)}</span>
                        <strong>
                          .{String(enchantmentPreview.currentLevel)}
                          {" → "}
                          {enchantmentPreview.nextLevel === undefined
                            ? "MAX"
                            : `.${String(enchantmentPreview.nextLevel)}`}
                        </strong>
                      </div>
                    </div>

                    {enchantmentPreview.nextLevel !== undefined && (
                      <div className="merchant-enchant__power">
                        <span>Gain de puissance</span>
                        <strong>
                          +{String(
                            getEnchantmentItemPowerBonus(enchantmentPreview.nextLevel)
                            - getEnchantmentItemPowerBonus(enchantmentPreview.currentLevel),
                          )} IP
                        </strong>
                      </div>
                    )}

                    <div className="merchant-enchant__costs">
                      <div>
                        <span>Silver</span>
                        <strong className={state.wallet.silver < enchantmentPreview.silverCost ? "is-missing" : ""}>
                          {String(state.wallet.silver)} / {String(enchantmentPreview.silverCost)}
                        </strong>
                      </div>
                      {enchantmentPreview.materials.map((material) => (
                        <div key={material.itemId}>
                          <span>
                            {ENCHANTMENT_MATERIAL_LABELS[material.itemId]
                              ?? getItemDisplayName(material.itemId)}
                          </span>
                          <strong className={material.missing > 0 ? "is-missing" : ""}>
                            {String(material.owned)} / {String(material.quantity)}
                          </strong>
                        </div>
                      ))}
                    </div>

                    {enchantmentPreview.failureReason === "level_reserved" && (
                      <p className="merchant-enchant__warning">
                        Le niveau .4 est réservé à une mécanique ultérieure.
                      </p>
                    )}
                    {enchantmentPreview.failureReason === "maximum_level_reached" && (
                      <p className="merchant-enchant__warning">
                        Niveau maximal actuellement disponible atteint.
                      </p>
                    )}

                    <button
                      type="button"
                      className="merchant-enchant__confirm"
                      disabled={!enchantmentPreview.canAfford}
                      onClick={() => {
                        const transactionId =
                          `tx_enchant_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`;
                        const result = services.enchantmentService.enchant(
                          enchantmentPreview.instanceId,
                          transactionId,
                        );
                        if (result.ok) {
                          services.bridge.addEconomyNotification({
                            id: `notif_${transactionId}`,
                            type: "success",
                            message: `Enchantement réussi · .${String(result.toLevel)}`,
                            timestamp: Date.now(),
                          });
                          syncInventoryToBridge(
                            services.bridge,
                            services.inventoryManager,
                            services.heroId,
                          );
                          syncEquipmentToBridge(
                            services.bridge,
                            services.equipmentManager,
                            services.heroId,
                          );
                          syncWalletToBridge(
                            services.bridge,
                            services.currencyService,
                            services.walletId,
                            state.wallet.incomeRate,
                          );
                          setSelectedEnchantInstance(result.instanceId);
                        } else {
                          services.bridge.addEconomyNotification({
                            id: `notif_${transactionId}`,
                            type: "error",
                            message: `Enchantement impossible : ${result.reason}`,
                            timestamp: Date.now(),
                          });
                        }
                      }}
                    >
                      Enchanter en .{String(enchantmentPreview.nextLevel ?? enchantmentPreview.currentLevel)}
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        )}
          </main>
        </div>
      </div>

      {pending !== null && (
        <TransactionConfirmModal
          title={pending.direction === "buy" ? "Confirmer l’achat" : "Confirmer la vente"}
          cost={totalPendingValue}
          balance={state.wallet.silver}
          valueLabel={pending.direction === "buy" ? "Coût" : "Vous recevez"}
          requiresAffordability={pending.direction === "buy"}
          confirmLabel={pending.direction === "buy" ? "Acheter" : "Vendre"}
          onConfirm={handleConfirm}
          onCancel={() => { setPending(null); }}
        >
          <p className="tx-modal__item-name">
            {getItemDisplayName(pending.itemId)} ×{String(pending.quantity)}
          </p>
        </TransactionConfirmModal>
      )}
    </PanelContainer>
  );
}

function MerchantServiceTab(props: {
  readonly active: boolean;
  readonly icon: string;
  readonly label: string;
  readonly description: string;
  readonly onClick: () => void;
}): JSX.Element {
  return (
    <div
      className={
        props.active
          ? "merchant-service merchant-service--active"
          : "merchant-service"
      }
    >
      <button
        type="button"
        className="merchant-service__header"
        aria-current={props.active ? "page" : undefined}
        onClick={props.onClick}
      >
        <span className="merchant-service__icon">{props.icon}</span>
        <span>
          <strong>{props.label}</strong>
          <small>{props.description}</small>
        </span>
        <i>›</i>
      </button>
    </div>
  );
}
