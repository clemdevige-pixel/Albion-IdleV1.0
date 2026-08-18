import { useState } from "react";
import type { AwakenedTraitId, ItemInstanceId } from "@game/gameplay";
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
};

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
  if (traitId === "damage" || traitId === "ability_power" || traitId === "cooldown_reduction") {
    return `+${formatNumber(displayed)}%`;
  }
  return `+${formatNumber(displayed)}`;
}

export function AwakenedWeaponPanel(): JSX.Element | null {
  const bridge = useGameBridge();
  const services = useGameServices();
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);

  const equippedWeapon = bridge.equipment.slots.find((slot) => slot.slot === "weapon");
  const equippedWeaponInstanceId = equippedWeapon?.instanceId as ItemInstanceId | undefined;
  const state = equippedWeapon?.enchantment === 4 && equippedWeaponInstanceId !== undefined
    ? services.awakenedWeaponService.getState(equippedWeaponInstanceId)
    : undefined;
  const derived = equippedWeaponInstanceId === undefined
    ? undefined
    : services.awakenedWeaponService.getDerivedState(equippedWeaponInstanceId);
  const displayTraitValue = (traitId: AwakenedTraitId, value: number): string =>
    formatTraitValue(
      traitId,
      value,
      (id, storedValue) => services.awakenedWeaponService.getDisplayTraitValue(id, storedValue),
    );

  if (equippedWeapon?.enchantment !== 4) return null;

  if (state === undefined || derived === undefined) {
    return (
      <section className="character-module__awakening" aria-label="Éveil de l'arme">
        <div className="character-module__equipment-heading"><span>Éveil .4</span></div>
        <p className="character-module__awakening-empty">
          L'arme .4 sera initialisée dès sa première attribution de Fame éligible.
        </p>
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
    } else if (confirmation.kind === "offer") {
      ok = services.beginAwakenedTraitOffer(confirmation.targetIndex);
    } else {
      ok = services.resetAwakenedWeapon();
    }
    if (ok) setConfirmation(null);
  };

  return (
    <section className="character-module__awakening" aria-label="Éveil de l'arme">
      <div className="character-module__equipment-heading">
        <span>Éveil .4</span>
        <small>Strain {String(state.strain)}</small>
      </div>

      <div className="character-module__awakening-summary">
        <div>
          <span>Attunement</span>
          <strong>{formatNumber(state.storedAttunement, 0)} / {formatNumber(derived.attunementCap, 0)}</strong>
        </div>
        <div>
          <span>Investi</span>
          <strong>{formatNumber(state.lifetimeAttunementInvested, 0)}</strong>
        </div>
        <div>
          <span>Prochain Awake</span>
          <strong>{formatNumber(actionCost.attunement, 0)} Att. · {formatNumber(actionCost.silver, 0)} Silver</strong>
        </div>
      </div>

      <div className="character-module__awakening-traits">
        {[0, 1, 2].map((index) => {
          const trait = state.traits[index];
          const unlocked = index < derived.unlockedTraitSlots;
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
                  <strong>Verrouillé</strong>
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
                        Reroll
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
            <small>{offer.kind === "fill" ? "Choisissez votre trait" : `Reroll du trait ${String(offer.targetIndex + 1)}`}</small>
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
                <strong>{displayTraitValue(proposal.traitId, proposal.finalGain)}</strong>
                {proposal.critical && <em>CRIT ×2</em>}
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
          blockedMessage="Attunement insuffisant"
          confirmLabel={confirmation.kind === "reset" ? "Réinitialiser" : "Confirmer"}
          onConfirm={confirmAction}
          onCancel={() => { setConfirmation(null); }}
        >
          {confirmation.kind === "reset" ? (
            <p>
              Tous les traits, leur progression, la Strain et l'Attunement investi seront perdus. L'arme restera .4.
            </p>
          ) : (
            <p>
              Coût : <strong>{formatNumber(actionCost.attunement, 0)} Attunement</strong>. La Strain passera de {String(state.strain)} à {String(state.strain + 1)}.
            </p>
          )}
        </TransactionConfirmModal>
      )}
    </section>
  );
}
