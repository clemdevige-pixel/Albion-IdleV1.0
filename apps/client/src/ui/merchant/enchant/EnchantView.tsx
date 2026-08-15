import { useState } from "react";
import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import {
  getEnchantmentTextClass,
  getEquipmentTierFrameClass,
  getItemDefinition,
  getItemDisplayName,
  ItemVisual,
} from "../../../panels/ItemVisual";
import { useEnchantActions } from "./useEnchantActions";
import { useEnchantData } from "./useEnchantData";

const FAILURE_MESSAGES: Readonly<Record<string, string>> = {
  combat_active: "Arrêtez le combat et attendez la fin du segment avant d’enchanter.",
  level_reserved: "Le niveau .4 est réservé à une mécanique ultérieure.",
  maximum_level_reached: "Niveau maximal actuellement disponible atteint.",
  insufficient_silver: "Silver insuffisant.",
  insufficient_materials: "Ressources insuffisantes.",
  inventory_full: "Inventaire plein.",
};

export function EnchantView(): JSX.Element {
  const [requestedInstanceId, setRequestedInstanceId] = useState<string | null>(null);
  const model = useEnchantData(requestedInstanceId);
  const actions = useEnchantActions();
  return (
    <div className="ui-merchant-service ui-merchant-enchant">
      <section className="ui-merchant-enchant__stocks" aria-label="Stocks d’enchantement">
        {model.stocks.map((stock) => <div key={stock.itemId}><ItemVisual itemId={stock.itemId} /><span>{stock.name}</span><strong>{String(stock.quantity)}</strong></div>)}
      </section>
      {model.items.length === 0 ? <p className="ui-merchant__empty">Aucun équipement compatible disponible.</p> : (
        <>
          <section className="ui-merchant-list" aria-label="Équipements à enchanter">
            <div className="ui-merchant-section-title"><span>Équipements</span><small>Inventaire et équipés</small></div>
            {model.items.map((item) => {
              const definition = getItemDefinition(item.itemId);
              return (
                <button type="button" key={item.instanceId} className={`ui-merchant-item-row${item.instanceId === model.selectedInstanceId ? " is-selected" : ""}${getEquipmentTierFrameClass(definition?.tier)}`} onClick={() => { setRequestedInstanceId(item.instanceId); }}>
                  <ItemHoverTooltip itemId={item.itemId} quantity={1} instanceId={item.instanceId}><span className="ui-merchant-item-row__visual"><ItemVisual itemId={item.itemId} /></span></ItemHoverTooltip>
                  <span className="ui-merchant-item-row__identity">
                    <strong>{getItemDisplayName(item.itemId)}</strong>
                    <small className={getEnchantmentTextClass(item.enchantment).trim()}>T{String(definition?.tier ?? "?")}.{String(item.enchantment)}{item.equipped ? " · Équipé" : ""}</small>
                  </span>
                  <b className={getEnchantmentTextClass(item.enchantment).trim()}>.{String(item.enchantment)}</b>
                </button>
              );
            })}
          </section>
          {model.preview !== undefined && (
            <section className="ui-merchant-detail ui-merchant-enchant__detail">
              <div className="ui-merchant-detail__item">
                <ItemHoverTooltip itemId={model.preview.itemId} quantity={1} instanceId={model.preview.instanceId} enchantmentOverride={model.preview.nextLevel ?? model.preview.currentLevel}>
                  <span className="ui-merchant-detail__visual"><ItemVisual itemId={model.preview.itemId} /></span>
                </ItemHoverTooltip>
                <div><span>Amélioration sélectionnée</span><h3>{getItemDisplayName(model.preview.itemId)}</h3><strong className="ui-merchant-enchant__level">.{String(model.preview.currentLevel)} → {model.preview.nextLevel === undefined ? "MAX" : `.${String(model.preview.nextLevel)}`}</strong></div>
              </div>
              {model.preview.nextLevel !== undefined && <div className="ui-merchant-detail__total"><span>Gain de puissance</span><strong>+{String(model.preview.itemPowerGain)} IP</strong></div>}
              <dl className="ui-merchant-detail__facts">
                <div><dt>Silver</dt><dd className={model.silver < model.preview.silverCost ? "is-missing" : ""}>{String(model.silver)} / {String(model.preview.silverCost)}</dd></div>
                {model.preview.materials.map((material) => <div key={material.itemId}><dt>{material.name}</dt><dd className={material.missing > 0 ? "is-missing" : ""}>{String(material.owned)} / {String(material.required)}</dd></div>)}
              </dl>
              {model.preview.failureReason !== undefined && <p className="ui-merchant__warning">{FAILURE_MESSAGES[model.preview.failureReason] ?? "Enchantement indisponible."}</p>}
              <button type="button" className="ui-merchant__primary ui-merchant__primary--enchant" disabled={!model.preview.canAfford} onClick={() => { const instanceId = actions.enchant(model.preview?.instanceId ?? "", model.incomeRate); if (instanceId !== undefined) setRequestedInstanceId(instanceId); }}>Enchanter en .{String(model.preview.nextLevel ?? model.preview.currentLevel)}</button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
