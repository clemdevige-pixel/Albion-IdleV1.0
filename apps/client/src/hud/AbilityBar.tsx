import { useCallback, useEffect } from "react";
import { resolveAbilityIconPath } from "../data/abilityIconPresentation";
import { ItemVisual } from "../panels/ItemVisual";
import {
  HEALTH_POTION_ID,
  useAbilityBarUiModel,
  useCombatHudActions,
} from "../ui/combat-hud/combatHudSelectors";
import "./AbilityBar.css";

const SHORTCUTS = ["Q", "W", "E"] as const;

export function AbilityBar(): JSX.Element {
  const model = useAbilityBarUiModel();
  const actions = useCombatHudActions();
  const abilities = model.abilities;
  const primaryAbility = abilities[0];
  const potionCount = model.potionCount;
  const potionCooldown = model.potionCooldownRemaining;
  const potionCooldownRatio = model.potionCooldown <= 0
    ? 0
    : Math.min(1, potionCooldown / model.potionCooldown);

  const useHealthPotion = useCallback(() => {
    if (potionCount > 0 && potionCooldown <= 0) actions.useHealthPotion();
  }, [actions, potionCount, potionCooldown]);

  const useWeaponAbility = useCallback((slotIndex: number) => {
    actions.useWeaponAbility(slotIndex);
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

      if (event.code === "KeyQ") useWeaponAbility(0);
      if (event.code === "KeyW") useWeaponAbility(1);
      if (event.code === "KeyE") useWeaponAbility(2);
      if (event.code === "Digit1") useHealthPotion();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, [useHealthPotion, useWeaponAbility]);

  return (
    <section className="combat-controls" aria-label="Commandes de combat">
      <div className="combat-controls__abilities">
        <span className="combat-controls__label">Compétences</span>
        <div className="ability-bar__skills">
          {abilities.map((ability, slotIndex) => {
            const shortcut = SHORTCUTS[slotIndex] ?? "Q";
            const cooldownRatio = ability === null || ability.cooldown <= 0
              ? 0
              : Math.min(1, ability.cooldownRemaining / ability.cooldown);

            if (ability === null) {
              return (
                <button
                  key={shortcut}
                  type="button"
                  className="ability-bar__slot ability-bar__slot--locked"
                  title={`Emplacement ${shortcut} non débloqué`}
                  disabled
                >
                  <span className="ability-bar__key">{shortcut}</span>
                  <span className="ability-bar__lock" aria-hidden="true">◆</span>
                </button>
              );
            }

            const iconPath = resolveAbilityIconPath(ability.id);
            return (
              <button
                key={shortcut}
                type="button"
                className={`ability-bar__slot ability-bar__slot--active${
                  ability.isReady ? " ability-bar__slot--ready" : ""
                }`}
                aria-label={ability.name}
                onClick={() => { useWeaponAbility(slotIndex); }}
              >
                <span className="ability-bar__key">{shortcut}</span>
                <span className="ability-bar__ability-icon">
                  <img src={iconPath} alt="" aria-hidden="true" />
                </span>
                {ability.cooldownRemaining > 0 && (
                  <span className="ability-bar__cooldown-number">
                    {ability.cooldownRemaining.toFixed(1)}
                  </span>
                )}
                <span
                  className="ability-bar__cooldown"
                  style={{ height: `${String(Math.round(cooldownRatio * 100))}%` }}
                />
                <div className="ability-tooltip" role="tooltip">
                  <div className="ability-tooltip__header">
                    <span className="ability-tooltip__icon">
                      <img src={iconPath} alt="" aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{ability.name}</strong>
                      <span>Capacité active · Touche {shortcut}</span>
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
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="combat-controls__utility">
        <span className="combat-controls__label">Tactique</span>
        <button
          type="button"
          className={`ability-bar__auto${primaryAbility?.autoCast === true ? " ability-bar__auto--enabled" : ""}`}
          title={primaryAbility?.autoCast === true ? "Désactiver l'utilisation automatique des compétences" : "Activer l'utilisation automatique des compétences"}
          aria-label={primaryAbility?.autoCast === true ? "Désactiver l'utilisation automatique des compétences" : "Activer l'utilisation automatique des compétences"}
          aria-pressed={primaryAbility?.autoCast === true}
          disabled={primaryAbility === null}
          onClick={() => { actions.setPrimaryAbilityAutoCast(!(primaryAbility?.autoCast ?? false)); }}
        >
          <img
            className="ability-bar__auto-image"
            src={primaryAbility?.autoCast === true ? "/assets/ui/auto_active.png" : "/assets/ui/auto_inactive.png"}
            alt=""
            aria-hidden="true"
          />
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
