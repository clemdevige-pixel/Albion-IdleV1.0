import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BLACK_MARKET_CARGO_SLOT_LIMIT,
  BLACK_MARKET_ROUTES,
  BLACK_MARKET_STACK_LIMIT,
  RESEARCH_IDS,
  type BlackMarketRouteId,
} from "@game/data";
import type { BlackMarketSnapshot } from "@game/gameplay";
import { ItemVisual, getItemDisplayName } from "../../../panels/ItemVisual.js";
import {
  blackMarketRuntime,
  type BlackMarketSelection,
} from "../../../runtime/BlackMarketRuntime.js";
import { useGameServices } from "../../../state/GameContext.js";
import { syncInventoryToBridge } from "../../../state/bridge-sync/playerInventorySync.js";
import { syncWalletToBridge } from "../../../state/bridge-sync/economySync.js";
import { formatCompactNumber } from "../../shared/index.js";
import { useMerchantData } from "../useMerchantData.js";
import "./black-market.css";

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

export function BlackMarketView(): JSX.Element {
  const services = useGameServices();
  const { wallet } = useMerchantData();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [snapshot, setSnapshot] = useState<BlackMarketSnapshot | null>(null);
  const [selection, setSelection] = useState<ReadonlyMap<string, BlackMarketSelection>>(new Map());
  const [routeId, setRouteId] = useState<BlackMarketRouteId>("watched");
  const [confirmingDeparture, setConfirmingDeparture] = useState(false);
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
  const selectedEntries = [...selection.values()];
  const selectedUnitCount = selectedEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const quote = selectedEntries.length === 0
    ? undefined
    : blackMarketRuntime.quoteSelection(selectedEntries, nowMs);

  const route = BLACK_MARKET_ROUTES.find((entry) => entry.id === routeId) ?? BLACK_MARKET_ROUTES[0];
  const selectedPayout = quote === undefined ? 0 : Math.round(quote.cargoBmValue * route.payoutMultiplier);
  const selectedEv = Math.round(selectedPayout * route.successChance);

  const setQuantity = (candidateKey: string, nextQuantity: number): void => {
    setConfirmingDeparture(false);
    const candidate = candidates.find((entry) => selectionKey(entry) === candidateKey);
    if (candidate === undefined) return;
    const clamped = Math.max(0, Math.min(
      BLACK_MARKET_STACK_LIMIT,
      candidate.availableQuantity,
      nextQuantity,
    ));
    const next = new Map(selection);
    if (clamped === 0) {
      next.delete(candidateKey);
    } else {
      if (!next.has(candidateKey) && next.size >= BLACK_MARKET_CARGO_SLOT_LIMIT) return;
      next.set(candidateKey, {
        source: candidate.source,
        itemId: candidate.itemId,
        enchantment: candidate.enchantment,
        quantity: clamped,
      });
    }
    setSelection(next);
  };

  const sendConvoy = (): void => {
    if (selectedEntries.length === 0) return;
    if (blackMarketRuntime.startConvoy(selectedEntries, routeId, nowMs)) {
      setSelection(new Map());
      setConfirmingDeparture(false);
      refreshSnapshot(nowMs);
    }
  };

  if (!blackMarketUnlocked) {
    return <p className="ui-merchant__empty">Le Marché Noir n’est pas encore débloqué.</p>;
  }
  if (snapshot === null) {
    return <p className="ui-merchant__empty">Chargement du Marché Noir…</p>;
  }

  const activeConvoy = snapshot.activeConvoy;
  const result = snapshot.lastResult;
  if (result !== null) {
    const resultRoute = BLACK_MARKET_ROUTES.find((entry) => entry.id === result.routeId);
    return (
      <section className="ui-black-market ui-black-market--result">
        <div className="ui-merchant-section-title">
          <span>{result.success ? "Convoi livré" : "Convoi perdu"}</span>
          <small>{resultRoute?.displayName ?? result.routeId}</small>
        </div>
        <div className="ui-black-market__result-card">
          <strong>{result.success ? `${formatCompactNumber(result.silverReceived, "0")} Silver` : "0 Silver"}</strong>
          <span>{result.success ? "Paiement reçu" : "Cargo intégralement perdu"}</span>
          <small>Valeur engagée : {formatCompactNumber(result.cargoEconomicValue, "0")}</small>
        </div>
        <button type="button" className="ui-merchant__primary" onClick={() => {
          blackMarketRuntime.dismissResult();
          refreshSnapshot(Date.now());
        }}>
          Fermer le récapitulatif
        </button>
      </section>
    );
  }

  if (activeConvoy !== null) {
    const activeRoute = BLACK_MARKET_ROUTES.find((entry) => entry.id === activeConvoy.routeId);
    return (
      <section className="ui-black-market ui-black-market--active">
        <div className="ui-merchant-section-title">
          <span>Convoi en cours</span>
          <small>{activeRoute?.displayName ?? activeConvoy.routeId}</small>
        </div>
        <div className="ui-black-market__active-card">
          <div><span>Temps restant</span><strong>{formatDuration(activeConvoy.completesAt - nowMs)}</strong></div>
          <div><span>Cargo</span><strong>{activeConvoy.cargo.reduce((sum, line) => sum + line.quantity, 0)} items</strong></div>
          <div><span>Valeur BM</span><strong>{formatCompactNumber(activeConvoy.cargoBmValue, "0")}</strong></div>
          <div><span>Gain potentiel</span><strong>{formatCompactNumber(activeConvoy.payoutOnSuccess, "0")}</strong></div>
        </div>
        <p className="ui-black-market__hidden-result">Résultat : ????? — révélé à l’arrivée.</p>
      </section>
    );
  }

  return (
    <section className="ui-black-market">
      <div className="ui-merchant-section-title">
        <span>Demandes spéciales</span>
        <small>Reset dans {formatDuration(snapshot.nextResetAt - nowMs)}</small>
      </div>
      <div className="ui-black-market__demands">
        {snapshot.demands.map((demand) => (
          <article key={demand.id}>
            <strong>{demandLabel(demand.targetType, demand.targetId)} T{String(demand.tier)}</strong>
            <span>{String(demand.requiredQuantity - demand.fulfilledQuantity)} / {String(demand.requiredQuantity)} restants</span>
            <b>+{String(Math.round(demand.bonus * 100))}%</b>
          </article>
        ))}
      </div>

      <div className="ui-merchant-section-title">
        <span>Cargo</span>
        <small>{String(selection.size)} / {String(BLACK_MARKET_CARGO_SLOT_LIMIT)} stacks · {String(selectedUnitCount)} / 40 items</small>
      </div>
      <div className="ui-black-market__candidates">
        {candidates.length === 0 && <p className="ui-merchant__empty">Aucun équipement éligible dans l’inventaire ou la banque.</p>}
        {candidates.map((candidate) => {
          const key = selectionKey(candidate);
          const quantity = selection.get(key)?.quantity ?? 0;
          return (
            <article key={key} className={quantity > 0 ? "is-selected" : ""}>
              <div className="ui-black-market__item-visual"><ItemVisual itemId={candidate.itemId} /></div>
              <div className="ui-black-market__item-copy">
                <strong>{getItemDisplayName(candidate.itemId)}{candidate.enchantment > 0 ? ` .${String(candidate.enchantment)}` : ""}</strong>
                <small>{candidate.source === "inventory" ? "Inventaire" : "Banque"} · dispo x{String(candidate.availableQuantity)}</small>
                <span>BM : {formatCompactNumber(candidate.normalBmValue, "0")} / unité</span>
              </div>
              <div className="ui-black-market__quantity">
                <button type="button" onClick={() => { setQuantity(key, quantity - 1); }}>−</button>
                <b>{String(quantity)}</b>
                <button type="button" onClick={() => { setQuantity(key, quantity + 1); }}>+</button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="ui-black-market__cargo-total">
        <span>Valeur économique</span><strong>{formatCompactNumber(quote?.cargoEconomicValue ?? 0, "0")}</strong>
        <span>Valeur BM avec demandes</span><strong>{formatCompactNumber(quote?.cargoBmValue ?? 0, "0")}</strong>
      </div>

      <div className="ui-merchant-section-title"><span>Routes</span><small>Échec = perte totale</small></div>
      <div className="ui-black-market__routes">
        {BLACK_MARKET_ROUTES.map((candidateRoute) => {
          const payout = quote === undefined ? 0 : Math.round(quote.cargoBmValue * candidateRoute.payoutMultiplier);
          const ev = Math.round(payout * candidateRoute.successChance);
          return (
            <button
              type="button"
              key={candidateRoute.id}
              className={routeId === candidateRoute.id ? "is-selected" : ""}
              onClick={() => {
                setRouteId(candidateRoute.id);
                setConfirmingDeparture(false);
              }}
            >
              <strong>{candidateRoute.displayName}</strong>
              <span>{String(Math.round(candidateRoute.successChance * 100))}% succès · x{String(candidateRoute.payoutMultiplier)}</span>
              <small>{formatDuration(candidateRoute.durationMs)}</small>
              <b>{formatCompactNumber(payout, "0")} Silver</b>
              <em>EV {formatCompactNumber(ev, "0")}</em>
            </button>
          );
        })}
      </div>

      {confirmingDeparture && quote !== undefined ? (
        <div className="ui-black-market__confirmation" role="alertdialog" aria-label="Confirmer le départ du convoi">
          <strong>Confirmer le convoi — {route.displayName}</strong>
          <span>{String(Math.round(route.successChance * 100))}% de succès · {formatDuration(route.durationMs)} · {formatCompactNumber(selectedPayout, "0")} Silver en cas de succès</span>
          <small>Le cargo et les demandes sont engagés immédiatement. Échec = perte totale. Aucune annulation ni récupération après le départ.</small>
          <div>
            <button type="button" onClick={() => { setConfirmingDeparture(false); }}>Retour</button>
            <button type="button" className="ui-merchant__primary" onClick={sendConvoy}>Confirmer le départ</button>
          </div>
        </div>
      ) : (
        <div className="ui-black-market__departure">
          <div>
            <span>Gain si succès</span>
            <strong>{formatCompactNumber(selectedPayout, "0")} Silver</strong>
            <small>EV : {formatCompactNumber(selectedEv, "0")} · cargo et demandes engagés au départ</small>
          </div>
          <button
            type="button"
            className="ui-merchant__primary"
            disabled={quote === undefined || selectedUnitCount === 0}
            onClick={() => { setConfirmingDeparture(true); }}
          >
            Envoyer le convoi
          </button>
        </div>
      )}
    </section>
  );
}
