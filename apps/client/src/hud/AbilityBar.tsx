import { useCallback, useEffect } from "react";
import { ItemVisual } from "../panels/ItemVisual";
import { useGameBridge, useGameServices } from "../state/GameContext";

const HEALTH_POTION_ID = "item_health_potion";

export function AbilityBar(): JSX.Element {
  const state = useGameBridge();
  const services = useGameServices();
  const ability = state.abilities.primary;
  const potionCount = state.inventory.slots.reduce(
    (total, slot) =>
      slot.itemId === HEALTH_POTION_ID ? total + slot.quantity : total,
    0,
  );
  const potionCooldown = state.consumables.healthPotionCooldownRemaining;
  const potionCooldownRatio = state.consumables.healthPotionCooldown <= 0
    ? 0
    : Math.min(1, potionCooldown / state.consumables.healthPotionCooldown);

  const useHealthPotion = useCallback(() => {
    if (potionCount > 0 && potionCooldown <= 0) {
      services.useConsumable(HEALTH_POTION_ID);
    }
  }, [potionCount, potionCooldown, services]);

  const usePrimaryAbility = useCallback(() => {
    services.usePrimaryAbility();
  }, [services]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        event.repeat
      ) {
        return;
      }

      if (event.code === "KeyQ") {
        usePrimaryAbility();
      } else if (event.code === "Digit1") {
        useHealthPotion();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [useHealthPotion, usePrimaryAbility]);

  const cooldownRatio =
    ability === null || ability.cooldown <= 0
      ? 0
      : Math.min(1, ability.cooldownRemaining / ability.cooldown);

  return (
    <div className="ability-bar">
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
        <div
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
                <span>
                  Cooldown
                  <strong>{String(ability.cooldown)} s</strong>
                </span>
                <span>
                  Énergie
                  <strong>{String(ability.energyCost)}</strong>
                </span>
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

      {["W", "E", "R"].map((label) => (
        <button
          key={label}
          type="button"
          className="ability-bar__slot ability-bar__slot--locked"
          title={`Emplacement ${label} non débloqué`}
          disabled
        >
          <span className="ability-bar__key">{label}</span>
          <span className="ability-bar__lock">🔒</span>
        </button>
      ))}

      <button
        type="button"
        className={`ability-bar__auto${ability?.autoCast === true ? " ability-bar__auto--enabled" : ""}`}
        title="Activer ou désactiver l’utilisation automatique de la capacité"
        disabled={ability === null}
        onClick={() => {
          services.setPrimaryAbilityAutoCast(!(ability?.autoCast ?? false));
        }}
      >
        AUTO
      </button>

      <div className="ability-bar__energy" title="Énergie disponible">
        {String(Math.round(state.abilities.currentEnergy))}
        <span>/</span>
        {String(Math.round(state.abilities.maxEnergy))}
      </div>

      <div className="ability-bar__separator" aria-hidden="true" />

      <div className="ability-bar__potion-wrapper">
        <button
          type="button"
          className="ability-bar__slot ability-bar__slot--potion"
          aria-label="Utiliser une potion de soin"
          disabled={potionCount === 0 || potionCooldown > 0}
          onClick={useHealthPotion}
        >
          <span className="ability-bar__potion-visual">
            <ItemVisual itemId={HEALTH_POTION_ID} />
          </span>
          <span className="ability-bar__shortcut">1</span>
          <span className="ability-bar__quantity">{potionCount}</span>
          {potionCooldown > 0 && (
            <span className="ability-bar__cooldown-number">
              {potionCooldown.toFixed(1)}
            </span>
          )}
          <div
            className="ability-bar__cooldown"
            style={{ height: `${String(Math.round(potionCooldownRatio * 100))}%` }}
          />
        </button>

        <div className="ability-tooltip ability-tooltip--potion" role="tooltip">
          <div className="ability-tooltip__header">
            <span className="ability-tooltip__icon ability-tooltip__icon--item">
              <ItemVisual itemId={HEALTH_POTION_ID} />
            </span>
            <div>
              <strong>Potion de soin</strong>
              <span>Consommable · Touche 1</span>
            </div>
          </div>
          <p>
            Restaure instantanément une portion des points de vie maximum du héros.
          </p>
          <div className="ability-tooltip__stats">
            <span>
              Soin
              <strong>{String(state.consumables.healthPotionHealPercent)}% PV max</strong>
            </span>
            <span>
              Cooldown
              <strong>{String(state.consumables.healthPotionCooldown)} s</strong>
            </span>
            <span>
              Quantité
              <strong>{String(potionCount)}</strong>
            </span>
            <span>
              État
              <strong>
                {potionCount === 0
                  ? "Stock épuisé"
                  : potionCooldown > 0
                    ? `${potionCooldown.toFixed(1)} s`
                    : "Prête"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
