import { useEffect, useMemo, useState } from "react";
import { formatCompactNumber } from "../shared";
import { useNavigation } from "../navigation";
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
  const target = useMemo(() => parseMerchantView(activeView), [activeView]);
  const [service, setService] = useState<MerchantServiceId>(target?.service ?? "buy");
  const { wallet } = useMerchantData();

  useEffect(() => {
    if (target !== undefined) setService(target.service);
  }, [target]);

  const targetedEnchantInstanceId = target?.service === "enchant" ? target.instanceId : undefined;

  return (
    <div className="ui-merchant">
      <header className="ui-merchant__summary">
        <div><span>Comptoir général</span><strong>Services du marchand</strong></div>
        <div><span>Solde</span><strong>{formatCompactNumber(wallet.silver, "0")} Silver</strong></div>
      </header>
      <nav className="ui-merchant__tabs" aria-label="Services du marchand">
        {SERVICES.map((entry) => (
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
      {service === "enchant" && (
        targetedEnchantInstanceId === undefined
          ? <EnchantView />
          : <EnchantView initialInstanceId={targetedEnchantInstanceId} />
      )}
      {service === "repair" && <RepairView />}
    </div>
  );
}
