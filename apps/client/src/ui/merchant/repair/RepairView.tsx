import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import { getItemDisplayName, ItemVisual } from "../../../panels/ItemVisual";
import { useRepairActions } from "./useRepairActions";
import { useRepairData } from "./useRepairData";

export function RepairView(): JSX.Element {
  const model = useRepairData();
  const actions = useRepairActions();

  if (model.items.length === 0) {
    return <p className="ui-merchant__empty">Aucun équipement endommagé.</p>;
  }

  return (
    <div className="ui-merchant-service ui-merchant-repair">
      <section className="ui-merchant-list" aria-label="Équipement à réparer">
        <div className="ui-merchant-section-title"><span>Équipement endommagé</span><small>{String(model.items.length)} objet(s)</small></div>
        {model.items.map((item) => {
          const percentage = item.maxDurability === 0
            ? 0
            : Math.round((item.currentDurability / item.maxDurability) * 100);
          return (
            <article key={item.instanceId} className="ui-merchant-repair__row">
              <ItemHoverTooltip itemId={item.itemId} quantity={1} instanceId={item.instanceId}>
                <span className="ui-merchant-item-row__visual"><ItemVisual itemId={item.itemId} /></span>
              </ItemHoverTooltip>
              <div>
                <strong>{getItemDisplayName(item.itemId)}</strong>
                <span>{String(item.currentDurability)} / {String(item.maxDurability)}</span>
                <div className="ui-merchant-repair__track"><i style={{ width: `${String(percentage)}%` }} /></div>
              </div>
              <b>{String(item.repairCost)} S</b>
            </article>
          );
        })}
      </section>
      <section className="ui-merchant-detail ui-merchant-repair__summary">
        <dl className="ui-merchant-detail__facts">
          <div><dt>Coût total</dt><dd>{String(model.totalCost)} Silver</dd></div>
          <div><dt>Votre solde</dt><dd className={model.silver < model.totalCost ? "is-missing" : ""}>{String(model.silver)} Silver</dd></div>
        </dl>
        <button type="button" className="ui-merchant__primary" disabled={!model.canRepairAll} onClick={actions.repairAll}>
          Tout réparer
        </button>
      </section>
    </div>
  );
}
