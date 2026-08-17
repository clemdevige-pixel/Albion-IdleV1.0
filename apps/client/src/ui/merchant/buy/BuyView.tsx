import { useMemo, useState } from "react";
import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import { getItemDisplayName, ItemVisual } from "../../../panels/ItemVisual";
import { TransactionConfirmModal } from "../../../panels/TransactionConfirmModal";
import { QuantityControl } from "../shared/QuantityControl";
import { useBuyActions } from "./useBuyActions";
import { useBuyData } from "./useBuyData";

interface PendingPurchase {
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export function BuyView(): JSX.Element {
  const model = useBuyData();
  const actions = useBuyActions();
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [quantities, setQuantities] = useState<Readonly<Record<string, number>>>({});
  const [pending, setPending] = useState<PendingPurchase | null>(null);
  const selected = model.offers.find((offer) => offer.itemId === selectedItemId) ?? model.offers[0];
  const maximum = selected === undefined
    ? 1
    : Math.max(1, Math.min(
      selected.maximumPerTransaction ?? Number.MAX_SAFE_INTEGER,
      Math.floor(model.silver / selected.unitPrice),
    ));
  const quantity = selected === undefined ? 1 : Math.min(quantities[selected.itemId] ?? 1, maximum);
  const total = selected === undefined ? 0 : selected.unitPrice * quantity;

  const catalogue = useMemo(() => model.offers, [model.offers]);

  if (selected === undefined) {
    return <p className="ui-merchant__empty">Aucun article disponible.</p>;
  }

  return (
    <div className="ui-merchant-service ui-merchant-buy">
      <section className="ui-merchant-list" aria-label="Catalogue du marchand">
        <div className="ui-merchant-section-title"><span>Catalogue</span><small>Stock illimité</small></div>
        {catalogue.map((offer) => (
          <button
            type="button"
            key={offer.itemId}
            className={`ui-merchant-item-row${offer.itemId === selected.itemId ? " is-selected" : ""}`}
            onClick={() => { setSelectedItemId(offer.itemId); }}
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
      </section>

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
    </div>
  );
}
