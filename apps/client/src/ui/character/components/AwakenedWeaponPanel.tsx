import { useState } from "react";
import type { AwakenedTraitId, ItemInstanceId } from "@game/gameplay";
import { isAwakeningEligibleWeapon } from "../../../data/enchantmentItemPolicy.js";
import { TransactionConfirmModal } from "../../../panels/TransactionConfirmModal";
import { useGameBridge, useGameServices } from "../../../state/GameContext";
import "./awakenedWeaponPanel.css";

const TRAIT_LABELS: Readonly<Record<AwakenedTraitId, string>> = {
  item_power: "Item Power",
  damage: "Dégâts",
  ability_power: "Puissance des compétences",
  cooldown_reduction: "Réduction des temps de recharge",
  max_health: "Points de vie",
  armor: "Armure",
  magic_resistance: "Résistance magique",
  fame_bonus: "Bonus de Fame",
};

const TRAIT_IDS: readonly AwakenedTraitId[] = [
  "item_power",
  "damage",
  "ability_power",
  "cooldown_reduction",
  "max_health",
  "armor",
  "magic_resistance",
  "fame_bonus",
];

type PendingConfirmation =
  | { readonly kind: "improve"; readonly traitIndex: number }
  | { readonly kind: "offer"; readonly targetIndex: number }
  | { readonly kind: "reset" };

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits });
}

function formatTraitValue(
  traitId: AwakenedTraitId,
  value: number,
  resolveDisplayValue: (traitId: AwakenedTraitId, value: number) => number,
): string {
  const displayed = resolveDisplayValue(traitId, value);
  if (traitId === "item_power") return `+${formatNumber(displayed, 0)} IP`;
  if (
    traitId === "damage"
    || traitId === "ability_power"
    || traitId === "cooldown_reduction"
    || traitId === "fame_bonus"
  ) {
    return `+${formatNumber(displayed)}%`;
  }
  return `+${formatNumber(displayed)}`;
}

export function AwakenedWeaponPanel(): JSX.Element | null {
  const bridge = useGameBridge();
  const services = useGameServices();
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRollInfo, setShowRollInfo] = useState(false);
  const [criticalTrait, setCriticalTrait] = useState<AwakenedTraitId | null>(null);

  const equippedWeapon = bridge.equipment.slots.find((slot) => slot.slot === "weapon");
  const equippedWeaponItemId = equippedWeapon?.itemId;
  const awakeningEligible = equippedWeapon !== undefined
    && equippedWeapon.enchantment === 4
    && equippedWeaponItemId !== undefined
    && isAwakeningEligibleWeapon(equippedWeaponItemId);
  const equippedWeaponInstanceId = equippedWeapon?.instanceId as ItemInstanceId | undefined;
  const state = awakeningEligible && equippedWeaponInstanceId !== undefined
    ? services.awakenedWeaponService.getState(equippedWeaponInstanceId)
    : undefined;
  const derived = awakeningEligible && equippedWeaponInstanceId !== undefined
    ? services.awakenedWeaponService.getDerivedState(equippedWeaponInstanceId)
    : undefined;
  const displayTraitValue = (traitId: AwakenedTraitId, value: number): string =>
    formatTraitValue(
      traitId,
      value,
      (id, storedValue) => services.awakenedWeaponService.getDisplayTraitValue(id, storedValue),
    );
  void refreshKey;

  if (!awakeningEligible) return null;

  if (state === undefined || derived === undefined || equippedWeaponInstanceId === undefined) {
    return (
      <section className="character-module__awakening" aria-label="Éveil de l'arme">
        <div className="character-module__equipment-heading"><span>Éveil de l'arme</span></div>
        <p className="character-module__awakening-empty">
          L'état d'éveil de cette arme .4 est indisponible. Rééquipe l'arme ou recharge la sauvegarde.
        </p>
      </section>
    );
  }

  const rollInfo = TRAIT_IDS.map((traitId) => {
    const range = services.awakenedWeaponService.getTraitRollRange(traitId);
    const currentValue = state.traits.find((trait) => trait.traitId === traitId)?.value ?? 0;
    if (traitId === "cooldown_reduction") {
      const currentDisplayed = services.awakenedWeaponService.getDisplayTraitValue(traitId, currentValue);
      const minDisplayed = services.awakenedWeaponService.getDisplayTraitValue(traitId, currentValue + range.min);
      const maxDisplayed = services.awakenedWeaponService.getDisplayTraitValue(traitId, currentValue + range.max);
      return {
        traitId,
        rangeLabel: `+${formatNumber(minDisplayed - currentDisplayed)}% à +${formatNumber(maxDisplayed - currentDisplayed)}%`,
      };
    }
    return {
      traitId,
      rangeLabel: `${displayTraitValue(traitId, range.min)} à ${displayTraitValue(traitId, range.max)}`,
    };
  });

  if (!state.awakened) {
    const awakenWeapon = (): void => {
      const result = services.awakenedWeaponService.awaken(equippedWeaponInstanceId);
      if (!result.ok) {
        services.bridge.addEconomyNotification({
          id: `notif_awakening_failed_${String(Date.now())}`,
          type: "error",
          message: result.reason === "awakening_threshold_not_reached"
            ? "Harmonisation insuffisante pour éveiller cette arme."
            : "Impossible d'éveiller cette arme dans l'état actuel.",
          timestamp: Date.now(),
        });
        return;
      }
      services.saveGame();
      services.bridge.addEconomyNotification({
        id: `notif_awakened_${String(Date.now())}`,
        type: "success",
        message: "Arme éveillée · le premier trait peut maintenant être tiré.",
        timestamp: Date.now(),
      });
      setRefreshKey((value) => value + 1);
    };

    return (
      <section className="character-module__awakening" aria-label="Éveil de l'arme">
        <div className="character-module__equipment-heading">
          <span>Éveil de l'arme</span>
          <small>Non éveillée</small>
        </div>
        <div className="character-module__awakening-summary">
          <div>
            <span>Harmonisation d'éveil</span>
            <strong>{formatNumber(state.storedAttunement, 0)} / {formatNumber(derived.awakeningAttunementThreshold, 0)}</strong>
          </div>
          <div>
            <span>Cap actuel</span>
            <strong>{formatNumber(derived.attunementCap, 0)}</strong>
          </div>
        </div>
        <p className="character-module__awakening-empty">
          Équipe cette arme .4 et gagne de la Fame PvE éligible pour charger son Harmonisation, puis éveille-la pour débloquer les traits.
        </p>
        <button
          type="button"
          className="character-module__awakening-reset"
          disabled={!derived.canAwaken}
          onClick={awakenWeapon}
        >
          Éveiller l'arme
        </button>
      </section>
    );
  }

  const actionCost = derived.actionCost;
  const canPayAttunement = state.storedAttunement >= actionCost.attunement;
  const offer = state.pendingTraitOffer;

  const confirmAction = (): void => {
    if (confirmation === null) return;
    let ok = false;
    if (confirmation.kind === "improve") {
      ok = services.improveAwakenedTrait(confirmation.traitIndex);
      if (ok) {
        const outcome = services.awakenedWeaponService.getLastImprovementOutcome(equippedWeaponInstanceId);
        setCriticalTrait(outcome?.roll.critical === true ? outcome.roll.traitId : null);
      }
    } else if (confirmation.kind === "offer") {
      ok = services.beginAwakenedTraitOffer(confirmation.targetIndex);
      if (ok) setCriticalTrait(null);
    } else {
      ok = services.resetAwakenedWeapon();
      if (ok) setCriticalTrait(null);
    }
    if (ok) setConfirmation(null);
  };

  return (
    <section className="character-module__awakening" aria-label="Éveil de l'arme">
      <div className="character-module__awakening-heading-row">
        <div className="character-module__equipment-heading">
          <span>Éveil de l'arme</span>
          <small>Strain {String(state.strain)}</small>
        </div>
        <button
          type="button"
          className="character-module__awakening-info-button"
          aria-label="Voir les plages de lancement des traits"
          aria-expanded={showRollInfo}
          onClick={() => { setShowRollInfo((value) => !value); }}
        >
          i
        </button>
      </div>

      {showRollInfo && (
        <div className="character-module__awakening-roll-info">
          <div>
            <strong>Lancements possibles</strong>
            <small>
              Crit amélioration : {formatNumber(services.awakenedWeaponService.getCriticalChance() * 100, 0)}% · ×2.
            </small>
          </div>
          <dl>
            {rollInfo.map((entry) => (
              <div key={entry.traitId}>
                <dt>{TRAIT_LABELS[entry.traitId]}</dt>
                <dd>{entry.rangeLabel}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {criticalTrait !== null && (
        <div className="character-module__awakening-critical" role="status">
          <strong>CRITIQUE ×2</strong>
          <span>{TRAIT_LABELS[criticalTrait]} · amélioration doublée</span>
        </div>
      )}

      <div className="character-module__awakening-summary">
        <div>
          <span>Harmonisation</span>
          <strong>{formatNumber(state.storedAttunement, 0)} / {formatNumber(derived.attunementCap, 0)}</strong>
        </div>
        <div>
          <span>Investi</span>
          <strong>{formatNumber(state.lifetimeAttunementInvested, 0)}</strong>
        </div>
        <div>
          <span>Prochain éveil</span>
          <strong>{formatNumber(actionCost.attunement, 0)} Harm. · {formatNumber(actionCost.silver, 0)} Silver</strong>
        </div>
      </div>

      <div className="character-module__awakening-traits">
        {[0, 1, 2].map((index) => {
          const trait = state.traits[index];
          const unlocked = index < derived.unlockedTraitSlots;
          const unlockAt = index === 1 ? 10 : index === 2 ? 30 : 0;
          return (
            <article key={index} className={`character-module__awakening-trait${!unlocked ? " is-locked" : ""}`}>
              <div>
                <small>Trait {String(index + 1)}</small>
                {trait !== undefined ? (
                  <>
                    <strong>{TRAIT_LABELS[trait.traitId]}</strong>
                    <span>{displayTraitValue(trait.traitId, trait.value)}</span>
                  </>
                ) : unlocked ? (
                  <strong>Slot disponible</strong>
                ) : (
                  <strong>Verrouillé · Strain {String(unlockAt)}</strong>
                )}
              </div>
              {offer === undefined && unlocked && (
                <div className="character-module__awakening-actions">
                  {trait === undefined ? (
                    <button type="button" onClick={() => { setConfirmation({ kind: "offer", targetIndex: index }); }}>
                      Tirer un trait
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setConfirmation({ kind: "improve", traitIndex: index }); }}>
                        Améliorer
                      </button>
                      <button type="button" onClick={() => { setConfirmation({ kind: "offer", targetIndex: index }); }}>
                        Relance
                      </button>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {offer !== undefined && (
        <div className="character-module__awakening-offer">
          <div>
            <small>{offer.kind === "fill" ? "Choisissez votre trait" : `Relance du trait ${String(offer.targetIndex + 1)}`}</small>
            <strong>Propositions</strong>
          </div>
          <div className="character-module__awakening-proposals">
            {offer.proposals.map((proposal) => (
              <button
                key={proposal.traitId}
                type="button"
                onClick={() => { services.resolveAwakenedTraitOffer(proposal.traitId); }}
              >
                <span>{TRAIT_LABELS[proposal.traitId]}</span>
                <strong>{displayTraitValue(proposal.traitId, proposal.baseRoll)}</strong>
              </button>
            ))}
          </div>
          {offer.kind === "reroll" && (
            <button
              type="button"
              className="character-module__awakening-keep"
              onClick={() => { services.resolveAwakenedTraitOffer(); }}
            >
              Conserver le trait actuel
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        className="character-module__awakening-reset"
        onClick={() => { setConfirmation({ kind: "reset" }); }}
      >
        Réinitialiser l'éveil
      </button>

      {confirmation !== null && (
        <TransactionConfirmModal
          title={confirmation.kind === "reset" ? "Réinitialiser l'éveil" : "Modifier l'arme éveillée"}
          cost={confirmation.kind === "reset" ? 0 : actionCost.silver}
          balance={bridge.wallet.silver}
          valueLabel="Coût Silver"
          additionalConfirmCondition={confirmation.kind === "reset" || canPayAttunement}
          blockedMessage="Harmonisation insuffisante"
          confirmLabel={confirmation.kind === "reset" ? "Réinitialiser" : "Confirmer"}
          onConfirm={confirmAction}
          onCancel={() => { setConfirmation(null); }}
        >
          {confirmation.kind === "reset" ? (
            <p>
              Tous les traits, leur progression, la Strain et l'Harmonisation seront perdus. L'arme restera .4 et devra être éveillée à nouveau.
            </p>
          ) : (
            <p>
              Coût : <strong>{formatNumber(actionCost.attunement, 0)} Harmonisation</strong>. La Strain passera de {String(state.strain)} à {String(state.strain + 1)}.
            </p>
          )}
        </TransactionConfirmModal>
      )}
    </section>
  );
}
