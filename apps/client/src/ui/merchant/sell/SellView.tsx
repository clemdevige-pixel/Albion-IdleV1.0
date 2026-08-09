import { useState } from "react";
import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import { getItemDisplayName, ItemVisual } from "../../../panels/ItemVisual";
import { TransactionConfirmModal } from "../../../panels/TransactionConfirmModal";
import { QuantityControl } from "../shared/QuantityControl";
import { useSellActions } from "./useSellActions";
import { useSellData } from "./useSellData";

interface PendingSale {
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export function SellView(): JSX.Element {
  const model = useSellData();
  const actions = useSellActions();
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [quantities, setQuantities] = useState<Readonly<Record<string, number>>>({});
  const [pending, setPending] = useState<PendingSale | null>(null);
  const selected = model.offers.find((offer) => offer.itemId === selectedItemId) ?? model.offers[0];

  if (selected === undefined) {
    return <p className="ui-merchant__empty">Aucun objet de l’inventaire n’est accepté actuellement.</p>;
  }

  const maximum = Math.max(1, Math.min(
    selected.owned,
    selected.maximumPerTransaction ?? Number.MAX_SAFE_INTEGER,
  ));
  const quantity = Math.min(quantities[selected.itemId] ?? 1, maximum);
  const total = selected.unitPrice * quantity;

  return (
    <div className="ui-merchant-service ui-merchant-sell">
      <section className="ui-merchant-list" aria-label="Objets à vendre">
        <div className="ui-merchant-section-title"><span>Inventaire éligible</span><small>{String(model.offers.length)} type(s)</small></div>
        {model.offers.map((offer) => (
          <button
            type="button"
            key={offer.itemId}
            className={`ui-merchant-item-row${offer.itemId === selected.itemId ? " is-selected" : ""}`}
            onClick={() => { setSelectedItemId(offer.itemId); }}
          >
            <ItemHoverTooltip itemId={offer.itemId} quantity={offer.owned}>
              <span className="ui-merchant-item-row__visual"><ItemVisual itemId={offer.itemId} /></span>
            </ItemHoverTooltip>
            <span className="ui-merchant-item-row__identity">
              <strong>{getItemDisplayName(offer.itemId)}</strong>
              <small>{String(offer.owned)} possédé(s)</small>
            </span>
            <b>{String(offer.unitPrice)} S</b>
          </button>
        ))}
      </section>

      <section className="ui-merchant-detail">
        <div className="ui-merchant-detail__item">
          <ItemHoverTooltip itemId={selected.itemId} quantity={selected.owned}>
            <span className="ui-merchant-detail__visual"><ItemVisual itemId={selected.itemId} /></span>
          </ItemHoverTooltip>
          <div><span>Objet sélectionné</span><h3>{getItemDisplayName(selected.itemId)}</h3></div>
        </div>
        <dl className="ui-merchant-detail__facts">
          <div><dt>Valeur unitaire</dt><dd>{String(selected.unitPrice)} Silver</dd></div>
          <div><dt>Quantité possédée</dt><dd>{String(selected.owned)}</dd></div>
        </dl>
        <div className="ui-merchant-detail__quantity">
          <span>Quantité</span>
          <QuantityControl
            label={`Quantité de ${getItemDisplayName(selected.itemId)}`}
            value={quantity}
            maximum={maximum}
            onChange={(next) => { setQuantities((current) => ({ ...current, [selected.itemId]: next })); }}
          />
        </div>
        <div className="ui-merchant-detail__total"><span>Vous recevez</span><strong>{String(total)} Silver</strong></div>
        <button type="button" className="ui-merchant__primary" onClick={() => { setPending({ itemId: selected.itemId, quantity, unitPrice: selected.unitPrice }); }}>
          Vendre
        </button>
      </section>

      {pending !== null && (
        <TransactionConfirmModal
          title="Confirmer la vente"
          cost={pending.unitPrice * pending.quantity}
          balance={model.silver}
          valueLabel="Vous recevez"
          requiresAffordability={false}
          confirmLabel="Vendre"
          onConfirm={() => {
            const succeeded = actions.sell({ ...pending, incomeRate: model.incomeRate });
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
