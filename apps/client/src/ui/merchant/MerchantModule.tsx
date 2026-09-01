import { useEffect, useMemo, useState } from "react";
import { RESEARCH_IDS } from "../../data/researchContentCatalog";
import { useGameServices } from "../../state/GameContext";
import { FeatureAttentionBadge } from "../attention/FeatureAttentionBadge";
import {
  FEATURE_UNLOCK_VISITS,
  useFeatureUnlockPending,
  useFeatureUnlockVisit,
} from "../attention/usePlayerAttention";
import { formatCompactNumber } from "../shared";
import { UI_MODULE_IDS, useNavigation } from "../navigation";
import { BlackMarketView } from "./black-market/BlackMarketView";
import { BuyView } from "./buy/BuyView";
import { EnchantView } from "./enchant/EnchantView";
import type { MerchantServiceId } from "./merchantModels";
import { RepairView } from "./repair/RepairView";
import { useMerchantData } from "./useMerchantData";
import "./merchant.css";

const SERVICES: readonly { readonly id: MerchantServiceId; readonly label: string }[] = [
  { id: "buy", label: "Acheter" },
  { id: "black_market", label: "Marché Noir" },
  { id: "enchant", label: "Enchanter" },
  { id: "repair", label: "Réparer" },
];

function parseMerchantView(view: string | null): {
  readonly service: MerchantServiceId;
  readonly instanceId?: string;
} | undefined {
  if (view === null) return undefined;
  const [service, instanceId] = view.split(":", 2);
  if (!SERVICES.some((entry) => entry.id === service)) return undefined;
  return {
    service: service as MerchantServiceId,
    ...(instanceId === undefined || instanceId.length === 0 ? {} : { instanceId }),
  };
}

export function MerchantModule(): JSX.Element {
  const { activeView, openModule } = useNavigation();
  const services = useGameServices();
  const academyResearch = services.getAcademyModel().research;
  const enchantmentUnlocked = academyResearch.some((entry) => (
    entry.id === RESEARCH_IDS.enchantmentStudy && entry.state === "completed"
  ));
  const blackMarketUnlocked = academyResearch.some((entry) => (
    entry.id === RESEARCH_IDS.blackMarket && entry.state === "completed"
  ));
  const target = useMemo(() => parseMerchantView(activeView), [activeView]);
  const targetService = (
    (target?.service === "enchant" && !enchantmentUnlocked)
    || (target?.service === "black_market" && !blackMarketUnlocked)
  ) ? "buy" : target?.service;
  const [service, setService] = useState<MerchantServiceId>(targetService ?? "buy");
  const { wallet } = useMerchantData();
  const enchantUnlockCount = useFeatureUnlockPending(FEATURE_UNLOCK_VISITS.enchantment);
  const blackMarketUnlockCount = useFeatureUnlockPending(FEATURE_UNLOCK_VISITS.blackMarket);

  useFeatureUnlockVisit(
    service === "enchant"
      ? FEATURE_UNLOCK_VISITS.enchantment
      : service === "black_market"
        ? FEATURE_UNLOCK_VISITS.blackMarket
        : [],
  );

  useEffect(() => {
    if (targetService !== undefined) setService(targetService);
  }, [targetService]);

  useEffect(() => {
    if (
      (service === "enchant" && !enchantmentUnlocked)
      || (service === "black_market" && !blackMarketUnlocked)
    ) {
      setService("buy");
      openModule(UI_MODULE_IDS.merchant, "buy");
    }
  }, [blackMarketUnlocked, enchantmentUnlocked, openModule, service]);

  const targetedEnchantInstanceId = target?.service === "enchant" && enchantmentUnlocked
    ? target.instanceId
    : undefined;

  const selectService = (nextService: MerchantServiceId): void => {
    setService(nextService);
    openModule(UI_MODULE_IDS.merchant, nextService);
  };

  return (
    <div className="ui-merchant">
      <header className="ui-merchant__summary">
        <div><span>Comptoir général</span><strong>Services du marchand</strong></div>
        <div><span>Solde</span><strong>{formatCompactNumber(wallet.silver, "0")} Silver</strong></div>
      </header>
      <nav className="ui-merchant__tabs" role="tablist" aria-label="Services du marchand">
        {SERVICES.filter((entry) => (
          (entry.id !== "enchant" || enchantmentUnlocked)
          && (entry.id !== "black_market" || blackMarketUnlocked)
        )).map((entry) => {
          const attentionCount = entry.id === "enchant"
            ? enchantUnlockCount
            : entry.id === "black_market"
              ? blackMarketUnlockCount
              : 0;
          return (
            <button
              type="button"
              role="tab"
              key={entry.id}
              className={service === entry.id ? "is-active" : ""}
              aria-selected={service === entry.id}
              onClick={() => { selectService(entry.id); }}
            >
              {entry.label}
              <FeatureAttentionBadge count={attentionCount} />
            </button>
          );
        })}
      </nav>
      {service === "buy" && <BuyView />}
      {service === "black_market" && blackMarketUnlocked && <BlackMarketView />}
      {service === "enchant" && enchantmentUnlocked && (
        targetedEnchantInstanceId === undefined
          ? <EnchantView />
          : <EnchantView initialInstanceId={targetedEnchantInstanceId} />
      )}
      {service === "repair" && <RepairView />}
    </div>
  );
}
