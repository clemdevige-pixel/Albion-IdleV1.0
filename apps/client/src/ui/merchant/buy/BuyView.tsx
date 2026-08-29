import { useMemo, useState } from "react";
import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import { getItemDisplayName, ItemVisual } from "../../../panels/ItemVisual";
import { TransactionConfirmModal } from "../../../panels/TransactionConfirmModal";
import { useGameServices } from "../../../state/GameContext";
import { formatCompactNumber } from "../../shared";
import { QuantityControl } from "../shared/QuantityControl";
import { DailyOffersView } from "./DailyOffersView";
import { useBuyActions } from "./useBuyActions";
import { useBuyData } from "./useBuyData";

interface PendingPurchase {
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

const BANK_EXTENSION_SELECTION_ID = "merchant_service_bank_extension";
const ROMAN_TAB_LABELS = ["I", "II", "III", "IV", "V"] as const;

export function BuyView(): JSX.Element {
  const services = useGameServices();
  const model = useBuyData();
  const actions = useBuyActions();
  const bankModel = services.getBankExpansionModel();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [quantities, setQuantities] = useState<Readonly<Record<string, number>>>({});
  const [pending, setPending] = useState<PendingPurchase | null>(null);
  const [confirmingBankExtension, setConfirmingBankExtension] = useState(false);

  const bankExtensionAvailable = bankModel.serviceUnlocked && bankModel.nextPurchase !== null;
  const bankSelected = selectedId === BANK_EXTENSION_SELECTION_ID && bankExtensionAvailable;
  const selected = bankSelected
    ? undefined
    : model.offers.find((offer) => offer.itemId === selectedId) ?? model.offers[0];
  const maximum = selected === undefined
    ? 1
    : Math.max(1, Math.min(
      selected.maximumPerTransaction ?? Number.MAX_SAFE_INTEGER,
      Math.floor(model.silver / selected.unitPrice),
    ));
  const quantity = selected === undefined ? 1 : Math.min(quantities[selected.itemId] ?? 1, maximum);
  const total = selected === undefined ? 0 : selected.unitPrice * quantity;
  const bankPurchase = bankModel.nextPurchase;
  const bankTabLabel = bankPurchase === null
    ? ""
    : ROMAN_TAB_LABELS[bankPurchase.tabNumber - 1] ?? String(bankPurchase.tabNumber);

  const catalogue = useMemo(() => model.offers, [model.offers]);

  return (
    <div className="ui-merchant-service ui-merchant-buy">
      <DailyOffersView />

      {(selected === undefined && !bankExtensionAvailable) ? (
        <p className="ui-merchant__empty">Aucun article permanent disponible.</p>
      ) : (
        <>
          <section className="ui-merchant-list" aria-label="Catalogue du marchand">
            <div className="ui-merchant-section-title"><span>Catalogue</span><small>Stock illimité</small></div>
            {catalogue.map((offer) => (
              <button
                type="button"
                key={offer.itemId}
                className={`ui-merchant-item-row${!bankSelected && offer.itemId === selected?.itemId ? " is-selected" : ""}`}
                onClick={() => { setSelectedId(offer.itemId); }}
              >
                <ItemHoverTooltip itemId={offer.itemId} quantity={1}>
                  <span className="ui-merchant-item-row__visual"><ItemVisual itemId={offer.itemId} /></span>
                </ItemHoverTooltip>
                <span className="ui-merchant-item-row__identity">
                  <strong>{getItemDisplayName(offer.itemId)}</strong>
                  <small>Possédé : {String(offer.owned)}</small>
                </span>
                <b>{String(offer.unitPrice)} S</b>
              </button>
            ))}
            {bankExtensionAvailable && bankPurchase !== null && (
              <button
                type="button"
                className={`ui-merchant-item-row${bankSelected ? " is-selected" : ""}`}
                onClick={() => { setSelectedId(BANK_EXTENSION_SELECTION_ID); }}
              >
                <span className="ui-merchant-item-row__visual" aria-hidden="true">
                  <strong>{bankTabLabel}</strong>
                </span>
                <span className="ui-merchant-item-row__identity">
                  <strong>Extension de banque</strong>
                  <small>{String(bankModel.unlockedTabCount)} / {String(bankModel.maxTabCount)} onglets</small>
                </span>
                <b>{formatCompactNumber(bankPurchase.silverCost, "0")} S</b>
              </button>
            )}
          </section>

          {bankSelected && bankPurchase !== null ? (
            <section className="ui-merchant-detail ui-merchant-buy__detail">
              <div className="ui-merchant-detail__item">
                <span className="ui-merchant-detail__visual" aria-hidden="true">
                  <strong>{bankTabLabel}</strong>
                </span>
                <div>
                  <span>Service</span>
                  <h3>Banque {bankTabLabel}</h3>
                  <small>{String(bankModel.unlockedTabCount)} / {String(bankModel.maxTabCount)} onglets débloqués</small>
                </div>
              </div>
              <div className="ui-merchant-buy__purchase-row">
                <div className="ui-merchant-detail__quantity">
                  <span>Capacité ajoutée</span>
                  <strong>+{String(bankModel.tabCapacity)} emplacements</strong>
                </div>
                <div className="ui-merchant-detail__total">
                  <span>Total</span>
                  <strong>{formatCompactNumber(bankPurchase.silverCost, "0")} Silver</strong>
                </div>
              </div>
              <button
                type="button"
                className="ui-merchant__primary"
                disabled={model.silver < bankPurchase.silverCost}
                onClick={() => { setConfirmingBankExtension(true); }}
              >
                Acheter
              </button>
            </section>
          ) : selected !== undefined ? (
            <section className="ui-merchant-detail ui-merchant-buy__detail">
              <div className="ui-merchant-detail__item">
                <ItemHoverTooltip itemId={selected.itemId} quantity={quantity}>
                  <span className="ui-merchant-detail__visual"><ItemVisual itemId={selected.itemId} /></span>
                </ItemHoverTooltip>
                <div>
                  <span>Achat</span>
                  <h3>{getItemDisplayName(selected.itemId)}</h3>
                  <small>Prix unitaire · {String(selected.unitPrice)} Silver</small>
                </div>
              </div>
              <div className="ui-merchant-buy__purchase-row">
                <div className="ui-merchant-detail__quantity">
                  <span>Quantité</span>
                  <QuantityControl
                    label={`Quantité de ${getItemDisplayName(selected.itemId)}`}
                    value={quantity}
                    maximum={maximum}
                    onChange={(next) => { setQuantities((current) => ({ ...current, [selected.itemId]: next })); }}
                  />
                </div>
                <div className="ui-merchant-detail__total"><span>Total</span><strong>{String(total)} Silver</strong></div>
              </div>
              <button
                type="button"
                className="ui-merchant__primary"
                disabled={model.silver < total}
                onClick={() => { setPending({ itemId: selected.itemId, quantity, unitPrice: selected.unitPrice }); }}
              >
                Acheter
              </button>
            </section>
          ) : null}
        </>
      )}

      {pending !== null && (
        <TransactionConfirmModal
          title="Confirmer l’achat"
          cost={pending.unitPrice * pending.quantity}
          balance={model.silver}
          confirmLabel="Acheter"
          onConfirm={() => {
            const succeeded = actions.buy({ ...pending, incomeRate: model.incomeRate });
            if (succeeded) setQuantities((current) => ({ ...current, [pending.itemId]: 1 }));
            setPending(null);
          }}
          onCancel={() => { setPending(null); }}
        >
          <p className="tx-modal__item-name">{getItemDisplayName(pending.itemId)} ×{String(pending.quantity)}</p>
        </TransactionConfirmModal>
      )}

      {confirmingBankExtension && bankPurchase !== null && (
        <TransactionConfirmModal
          title="Acheter une extension de banque"
          cost={bankPurchase.silverCost}
          balance={model.silver}
          confirmLabel="Acheter"
          onConfirm={() => {
            services.purchaseNextBankTab();
            setConfirmingBankExtension(false);
          }}
          onCancel={() => { setConfirmingBankExtension(false); }}
        >
          <p className="tx-modal__item-name">
            Banque {bankTabLabel} · +{String(bankModel.tabCapacity)} emplacements
          </p>
        </TransactionConfirmModal>
      )}
    </div>
  );
}
