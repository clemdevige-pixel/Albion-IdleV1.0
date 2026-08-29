import { useState } from "react";
import { TransactionConfirmModal } from "../../../panels/TransactionConfirmModal";
import { useGameServices } from "../../../state/GameContext";
import { formatCompactNumber } from "../../shared";
import { useMerchantData } from "../useMerchantData";

const ROMAN_TAB_LABELS = ["I", "II", "III", "IV", "V"] as const;

export function BankExpansionView(): JSX.Element {
  const services = useGameServices();
  const { wallet } = useMerchantData();
  const model = services.getBankExpansionModel();
  const [confirming, setConfirming] = useState(false);
  const purchase = model.nextPurchase;

  return (
    <div className="ui-merchant-service">
      <section className="ui-merchant-detail">
        <div className="ui-merchant-section-title">
          <span>Extensions de banque</span>
          <small>{String(model.unlockedTabCount)} / {String(model.maxTabCount)} onglets</small>
        </div>

        <div className="ui-merchant-detail__item">
          <div>
            <span>Stockage bancaire</span>
            <h3>{purchase === null ? "Capacité maximale atteinte" : `Banque ${ROMAN_TAB_LABELS[purchase.tabNumber - 1] ?? String(purchase.tabNumber)}`}</h3>
            <small>
              Chaque onglet dispose de {String(model.tabCapacity)} emplacements indépendants.
            </small>
          </div>
        </div>

        {purchase === null ? (
          <p className="ui-merchant__empty">Les cinq onglets de banque sont débloqués.</p>
        ) : (
          <>
            <div className="ui-merchant-detail__total">
              <span>Prix de l’extension</span>
              <strong>{formatCompactNumber(purchase.silverCost, "0")} Silver</strong>
            </div>
            <button
              type="button"
              className="ui-merchant__primary"
              disabled={wallet.silver < purchase.silverCost}
              onClick={() => { setConfirming(true); }}
            >
              Acheter Banque {ROMAN_TAB_LABELS[purchase.tabNumber - 1] ?? String(purchase.tabNumber)}
            </button>
          </>
        )}
      </section>

      {confirming && purchase !== null && (
        <TransactionConfirmModal
          title="Acheter une extension de banque"
          cost={purchase.silverCost}
          balance={wallet.silver}
          confirmLabel="Acheter"
          onConfirm={() => {
            services.purchaseNextBankTab();
            setConfirming(false);
          }}
          onCancel={() => { setConfirming(false); }}
        >
          <p className="tx-modal__item-name">
            Banque {ROMAN_TAB_LABELS[purchase.tabNumber - 1] ?? String(purchase.tabNumber)} · {String(model.tabCapacity)} emplacements
          </p>
        </TransactionConfirmModal>
      )}
    </div>
  );
}
