import { useEffect, useState } from "react";
import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import {
  getEnchantmentTextClass,
  getItemDefinition,
  getItemDisplayName,
  ItemVisual,
} from "../../../panels/ItemVisual";
import { useEnchantActions } from "./useEnchantActions";
import { useEnchantData } from "./useEnchantData";

const MAX_ENCHANTMENT_LEVEL = 4;

const FAILURE_MESSAGES: Readonly<Record<string, string>> = {
  combat_active: "Arrêtez le combat et attendez la fin du segment avant d’enchanter.",
  level_reserved: "Ce niveau d’enchantement n’est pas disponible pour cet équipement.",
  maximum_level_reached: "Niveau maximal d’enchantement atteint.",
  insufficient_silver: "Silver insuffisant.",
  insufficient_materials: "Ressources insuffisantes.",
  inventory_full: "Inventaire plein.",
};

const SOURCE_LABELS = {
  equipped: "Équipé",
  inventory: "Inventaire",
  bank: "Banque",
} as const;

function EnchantmentScale({ level }: { readonly level: number }): JSX.Element {
  return (
    <span
      className={`ui-merchant-enchant__scale ui-merchant-enchant__scale--${String(level)}`}
      aria-label={`Enchantement ${String(level)} sur ${String(MAX_ENCHANTMENT_LEVEL)}`}
    >
      <small>Niveau d’enchantement</small>
      <span className="ui-merchant-enchant__pips" aria-hidden="true">
        {Array.from({ length: MAX_ENCHANTMENT_LEVEL }, (_, index) => (
          <i key={index} className={index < level ? "is-filled" : ""} />
        ))}
      </span>
      <b className={getEnchantmentTextClass(level).trim()}>.{String(level)}</b>
    </span>
  );
}

export function EnchantView({
  initialInstanceId,
}: {
  readonly initialInstanceId?: string;
}): JSX.Element {
  const [requestedInstanceId, setRequestedInstanceId] = useState<string | null>(initialInstanceId ?? null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const model = useEnchantData(requestedInstanceId, selectedTier);
  const actions = useEnchantActions();

  useEffect(() => {
    if (initialInstanceId !== undefined) {
      setSelectedTier(null);
      setRequestedInstanceId(initialInstanceId);
    }
  }, [initialInstanceId]);

  return (
    <div className="ui-merchant-service ui-merchant-enchant">
      <section className="ui-merchant-enchant__stocks" aria-label="Stocks d’enchantement">
        {model.stocks.map((stock) => <div key={stock.itemId}><ItemVisual itemId={stock.itemId} /><span>{stock.name}</span><strong>{String(stock.quantity)}</strong></div>)}
      </section>
      <section className="ui-merchant-enchant__tier-filter" aria-label="Filtrer les équipements par tier">
        <button type="button" className={selectedTier === null ? "is-active" : ""} onClick={() => { setSelectedTier(null); setRequestedInstanceId(null); }}>Tous</button>
        {model.availableTiers.map((tier) => (
          <button type="button" key={tier} className={selectedTier === tier ? "is-active" : ""} onClick={() => { setSelectedTier(tier); setRequestedInstanceId(null); }}>T{String(tier)}</button>
        ))}
      </section>
      {model.items.length === 0 ? <p className="ui-merchant__empty">Aucun équipement compatible disponible.</p> : (
        <>
          <section className="ui-merchant-list" aria-label="Équipements à enchanter">
            <div className="ui-merchant-section-title"><span>Équipements</span><small>Inventaire, banque et équipés</small></div>
            {model.items.map((item) => {
              const definition = getItemDefinition(item.itemId);
              return (
                <button type="button" key={item.instanceId} className={`ui-merchant-item-row ui-merchant-enchant__item-row${item.instanceId === model.selectedInstanceId ? " is-selected" : ""}`} onClick={() => { setRequestedInstanceId(item.instanceId); }}>
                  <ItemHoverTooltip itemId={item.itemId} quantity={1} instanceId={item.instanceId}><span className="ui-merchant-item-row__visual"><ItemVisual itemId={item.itemId} /></span></ItemHoverTooltip>
                  <span className="ui-merchant-item-row__identity">
                    <strong>{getItemDisplayName(item.itemId)}</strong>
                    <small className={getEnchantmentTextClass(item.enchantment).trim()}>T{String(definition?.tier ?? "?")}.{String(item.enchantment)} · {SOURCE_LABELS[item.source]}</small>
                  </span>
                  <EnchantmentScale level={item.enchantment} />
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
