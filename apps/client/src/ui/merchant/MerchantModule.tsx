import { useEffect, useMemo, useState } from "react";
import { RESEARCH_IDS } from "../../data/researchContentCatalog";
import { useGameServices } from "../../state/GameContext";
import { formatCompactNumber } from "../shared";
import { useNavigation } from "../navigation";
import { BankExpansionView } from "./bank/BankExpansionView";
import { BuyView } from "./buy/BuyView";
import { EnchantView } from "./enchant/EnchantView";
import type { MerchantServiceId } from "./merchantModels";
import { RepairView } from "./repair/RepairView";
import { SellView } from "./sell/SellView";
import { useMerchantData } from "./useMerchantData";
import "./merchant.css";

const SERVICES: readonly { readonly id: MerchantServiceId; readonly label: string }[] = [
  { id: "buy", label: "Acheter" },
  { id: "sell", label: "Vendre" },
  { id: "enchant", label: "Enchanter" },
  { id: "repair", label: "Réparer" },
  { id: "bank", label: "Banque" },
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
  const { activeView } = useNavigation();
  const services = useGameServices();
  const enchantmentUnlocked = services.getAcademyModel().research.some((entry) => (
    entry.id === RESEARCH_IDS.enchantmentStudy && entry.state === "completed"
  ));
  const bankExtensionUnlocked = services.getBankExpansionModel().serviceUnlocked;
  const availableServices = SERVICES.filter((entry) => (
    (entry.id !== "enchant" || enchantmentUnlocked)
    && (entry.id !== "bank" || bankExtensionUnlocked)
  ));
  const target = useMemo(() => parseMerchantView(activeView), [activeView]);
  const targetService = (
    (target?.service === "enchant" && !enchantmentUnlocked)
    || (target?.service === "bank" && !bankExtensionUnlocked)
  )
    ? "buy"
    : target?.service;
  const [service, setService] = useState<MerchantServiceId>(targetService ?? "buy");
  const { wallet } = useMerchantData();

  useEffect(() => {
    if (targetService !== undefined) setService(targetService);
  }, [targetService]);

  useEffect(() => {
    if (
      (service === "enchant" && !enchantmentUnlocked)
      || (service === "bank" && !bankExtensionUnlocked)
    ) setService("buy");
  }, [bankExtensionUnlocked, enchantmentUnlocked, service]);

  const targetedEnchantInstanceId = target?.service === "enchant" && enchantmentUnlocked
    ? target.instanceId
    : undefined;

  return (
    <div className="ui-merchant">
      <header className="ui-merchant__summary">
        <div><span>Comptoir général</span><strong>Services du marchand</strong></div>
        <div><span>Solde</span><strong>{formatCompactNumber(wallet.silver, "0")} Silver</strong></div>
      </header>
      <nav className="ui-merchant__tabs" aria-label="Services du marchand">
        {availableServices.map((entry) => (
          <button
            type="button"
            key={entry.id}
            className={service === entry.id ? "is-active" : ""}
            aria-current={service === entry.id ? "page" : undefined}
            onClick={() => { setService(entry.id); }}
          >
            {entry.label}
          </button>
        ))}
      </nav>
      {service === "buy" && <BuyView />}
      {service === "sell" && <SellView />}
      {service === "enchant" && enchantmentUnlocked && (
        targetedEnchantInstanceId === undefined
          ? <EnchantView />
          : <EnchantView initialInstanceId={targetedEnchantInstanceId} />
      )}
      {service === "repair" && <RepairView />}
      {service === "bank" && bankExtensionUnlocked && <BankExpansionView />}
    </div>
  );
}
