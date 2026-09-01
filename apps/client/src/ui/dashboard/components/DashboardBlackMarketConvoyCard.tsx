import { useCallback, useEffect, useState } from "react";
import { BLACK_MARKET_ROUTES, RESEARCH_IDS } from "@game/data";
import type { BlackMarketSnapshot } from "@game/gameplay";
import { blackMarketRuntime } from "../../../runtime/BlackMarketRuntime.js";
import { useGameServices } from "../../../state/GameContext.js";
import { syncInventoryToBridge } from "../../../state/bridge-sync/playerInventorySync.js";
import { syncWalletToBridge } from "../../../state/bridge-sync/economySync.js";
import { useNavigation } from "../../navigation";
import { UI_MODULE_IDS } from "../../navigation/moduleIds";
import { formatCompactNumber } from "../../shared";
import { useMerchantData } from "../../merchant/useMerchantData.js";
import { DashboardCard } from "./DashboardCard";
import "./DashboardBlackMarketConvoyCard.css";

type ActiveBlackMarketConvoy = NonNullable<BlackMarketSnapshot["activeConvoy"]>;

export interface DashboardBlackMarketConvoyModel {
  readonly convoy: ActiveBlackMarketConvoy;
  readonly nowMs: number;
}

function formatRemainingDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${String(hours)}h ${String(minutes).padStart(2, "0")}m`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function useDashboardBlackMarketConvoy(): DashboardBlackMarketConvoyModel | null {
  const services = useGameServices();
  const { wallet } = useMerchantData();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [snapshot, setSnapshot] = useState<BlackMarketSnapshot | null>(null);

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

  useEffect(() => {
    if (!blackMarketUnlocked) {
      setSnapshot(null);
      return undefined;
    }

    const refresh = (): void => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      setSnapshot(blackMarketRuntime.getSnapshot(nextNow));
    };

    refresh();
    const intervalId = window.setInterval(refresh, 1000);
    return () => { window.clearInterval(intervalId); };
  }, [blackMarketUnlocked, getUnlockedTiers, onMutation]);

  const convoy = snapshot?.activeConvoy;
  return convoy === null || convoy === undefined ? null : { convoy, nowMs };
}

export function DashboardBlackMarketConvoyCard({
  model,
}: {
  readonly model: DashboardBlackMarketConvoyModel;
}): JSX.Element {
  const navigation = useNavigation();
  const { convoy, nowMs } = model;
  const route = BLACK_MARKET_ROUTES.find((entry) => entry.id === convoy.routeId);
  const durationMs = Math.max(1, convoy.completesAt - convoy.departedAt);
  const progress = Math.max(0, Math.min(100, ((nowMs - convoy.departedAt) / durationMs) * 100));
  const remainingMs = Math.max(0, convoy.completesAt - nowMs);
  const itemCount = convoy.cargo.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <DashboardCard
      sectionId="black-market-convoy"
      meta={formatRemainingDuration(remainingMs)}
    >
      <button
        type="button"
        className="dashboard-black-market-convoy"
        onClick={() => { navigation.openModule(UI_MODULE_IDS.merchant, "black_market"); }}
        title="Ouvrir le Marché Noir"
      >
        <div className="dashboard-black-market-convoy__summary">
          <div>
            <span>Convoi en route</span>
            <strong>{route?.displayName ?? convoy.routeId}</strong>
            <small>{String(itemCount)} item{itemCount > 1 ? "s" : ""} engagé{itemCount > 1 ? "s" : ""}</small>
          </div>
          <div className="dashboard-black-market-convoy__payout">
            <span>Gain potentiel</span>
            <strong>{formatCompactNumber(convoy.payoutOnSuccess, "0")} Silver</strong>
            <small>{String(Math.round((route?.successChance ?? 0) * 100))}% de succès</small>
          </div>
        </div>
        <div
          className="dashboard-progress dashboard-progress--gold"
          role="progressbar"
          aria-label="Progression du convoi Black Market"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span style={{ width: `${String(progress)}%` }} />
        </div>
      </button>
    </DashboardCard>
  );
}
