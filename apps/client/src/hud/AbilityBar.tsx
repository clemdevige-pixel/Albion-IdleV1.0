import { useCallback, useEffect } from "react";
import { ItemVisual } from "../panels/ItemVisual";
import {
  HEALTH_POTION_ID,
  useAbilityBarUiModel,
  useCombatHudActions,
} from "../ui/combat-hud/combatHudSelectors";

const LOCKED_SLOTS = ["W", "E"] as const;

export function AbilityBar(): JSX.Element {
  const model = useAbilityBarUiModel();
  const actions = useCombatHudActions();
  const ability = model.ability;
  const potionCount = model.potionCount;
  const potionCooldown = model.potionCooldownRemaining;
  const potionCooldownRatio = model.potionCooldown <= 0
    ? 0
    : Math.min(1, potionCooldown / model.potionCooldown);

  const useHealthPotion = useCallback(() => {
    if (potionCount > 0 && potionCooldown <= 0) actions.useHealthPotion();
  }, [actions, potionCount, potionCooldown]);

  const usePrimaryAbility = useCallback(() => {
    actions.usePrimaryAbility();
  }, [actions]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || event.repeat
      ) return;

      if (event.code === "KeyQ") usePrimaryAbility();
      if (event.code === "Digit1") useHealthPotion();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, [useHealthPotion, usePrimaryAbility]);

  const cooldownRatio = ability === null || ability.cooldown <= 0
    ? 0
    : Math.min(1, ability.cooldownRemaining / ability.cooldown);

  return (
    <section className="combat-controls" aria-label="Commandes de combat">
      <div className="combat-controls__abilities">
        <span className="combat-controls__label">Compétences</span>
        <div className="ability-bar__skills">
          <button
            type="button"
            className={`ability-bar__slot ability-bar__slot--active${
              ability?.isReady === true ? " ability-bar__slot--ready" : ""
            }`}
            aria-label={ability?.name ?? "Aucune capacité équipée"}
            disabled={ability === null}
            onClick={usePrimaryAbility}
          >
            <span className="ability-bar__key">Q</span>
            <span className="ability-bar__ability-icon">{ability?.icon ?? "?"}</span>
            {ability !== null && ability.cooldownRemaining > 0 && (
              <span className="ability-bar__cooldown-number">
                {ability.cooldownRemaining.toFixed(1)}
              </span>
            )}
            <span
              className="ability-bar__cooldown"
              style={{ height: `${String(Math.round(cooldownRatio * 100))}%` }}
            />
            <div className="ability-tooltip" role="tooltip">
              {ability === null ? (
                <span className="ability-tooltip__empty">
                  Équipez une arme pour obtenir une capacité.
                </span>
              ) : (
                <>
                  <div className="ability-tooltip__header">
                    <span className="ability-tooltip__icon">{ability.icon}</span>
                    <div>
                      <strong>{ability.name}</strong>
                      <span>Capacité active · Touche Q</span>
                    </div>
                  </div>
                  <p>{ability.description}</p>
                  <div className="ability-tooltip__stats">
                    <span>Recharge <strong>{String(ability.cooldown)} s</strong></span>
                  </div>
                  <div className={`ability-tooltip__mode${
                    ability.autoCast ? " ability-tooltip__mode--auto" : ""
                  }`}>
                    {ability.autoCast ? "Activation automatique" : "Activation manuelle"}
                  </div>
                </>
              )}
            </div>
          </button>

          {LOCKED_SLOTS.map((label) => (
            <button
              key={label}
              type="button"
              className="ability-bar__slot ability-bar__slot--locked"
              title={`Emplacement ${label} non débloqué`}
              disabled
            >
              <span className="ability-bar__key">{label}</span>
              <span className="ability-bar__lock" aria-hidden="true">◆</span>
            </button>
          ))}
        </div>
      </div>

      <div className="combat-controls__utility">
        <span className="combat-controls__label">Tactique</span>
        <button
          type="button"
          className={`ability-bar__auto${ability?.autoCast === true ? " ability-bar__auto--enabled" : ""}`}
          title="Activer ou désactiver l’utilisation automatique de la capacité"
          disabled={ability === null}
          onClick={() => { actions.setPrimaryAbilityAutoCast(!(ability?.autoCast ?? false)); }}
        >
          <span>AUTO</span>
          <i aria-hidden="true" />
        </button>
      </div>

      <div className="combat-controls__consumable">
        <span className="combat-controls__label">Soin</span>
        <div className="ability-bar__potion-wrapper">
          <button
            type="button"
            className="ability-bar__slot ability-bar__slot--potion"
            aria-label="Utiliser une potion de soin"
            disabled={potionCount === 0 || potionCooldown > 0}
            onClick={useHealthPotion}
          >
            <span className="ability-bar__potion-visual"><ItemVisual itemId={HEALTH_POTION_ID} /></span>
            <span className="ability-bar__shortcut">1</span>
            <span className="ability-bar__quantity">{potionCount}</span>
            {potionCooldown > 0 && (
              <span className="ability-bar__cooldown-number">{potionCooldown.toFixed(1)}</span>
            )}
            <span
              className="ability-bar__cooldown"
              style={{ height: `${String(Math.round(potionCooldownRatio * 100))}%` }}
            />
          </button>
          <div className="ability-tooltip ability-tooltip--potion" role="tooltip">
            <div className="ability-tooltip__header">
              <span className="ability-tooltip__icon ability-tooltip__icon--item">
                <ItemVisual itemId={HEALTH_POTION_ID} />
              </span>
              <div><strong>Potion de soin</strong><span>Consommable · Touche 1</span></div>
            </div>
            <p>Restaure instantanément une portion des points de vie maximum du héros.</p>
            <div className="ability-tooltip__stats">
              <span>Soin <strong>{String(model.potionHealPercent)}% PV max</strong></span>
              <span>Recharge <strong>{String(model.potionCooldown)} s</strong></span>
              <span>Quantité <strong>{String(potionCount)}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
