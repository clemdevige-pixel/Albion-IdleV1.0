import { useMemo, useState } from "react";
import type { EquipmentSlot } from "@game/gameplay";
import { getItemDefinition } from "../../panels/ItemVisual";
import { ItemSlot } from "../shared/ItemSlot";
import { getEquippedHeroIdlePresentation } from "./characterPresentation";
import { CharacterEquipmentPicker } from "./components/CharacterEquipmentPicker";
import { useCharacterActions } from "./useCharacterActions";
import { useCharacterData } from "./useCharacterData";
import "./character.css";

const SLOT_LABELS: Readonly<Record<EquipmentSlot, string>> = {
  head: "Tête",
  chest: "Torse",
  boots: "Bottes",
  weapon: "Arme",
  off_hand: "Main gauche",
  cape: "Cape",
};

const LEFT_SLOTS: readonly EquipmentSlot[] = ["head", "chest", "boots"];
const RIGHT_SLOTS: readonly EquipmentSlot[] = ["weapon", "off_hand", "cape"];

function formatValue(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  });
}

export function CharacterModule(): JSX.Element {
  const character = useCharacterData();
  const actions = useCharacterActions();
  const [pickerSlot, setPickerSlot] = useState<EquipmentSlot | null>(null);

  const equipmentBySlot = useMemo(
    () => new Map(character.equipment.map((entry) => [entry.slot, entry])),
    [character.equipment],
  );
  const equippedWeapon = equipmentBySlot.get("weapon");
  const heroIdle = getEquippedHeroIdlePresentation(equippedWeapon?.itemId);
  const hasTwoHandedWeapon = equippedWeapon?.itemId !== undefined
    && getItemDefinition(equippedWeapon.itemId)?.handling === "two_handed";
  const candidates = pickerSlot === null
    ? []
    : character.inventory.filter((entry) => entry.itemId !== undefined
      && getItemDefinition(entry.itemId)?.slot === pickerSlot);

  const renderSlot = (slot: EquipmentSlot): JSX.Element => {
    const entry = equipmentBySlot.get(slot);
    const isLocked = slot === "off_hand" && hasTwoHandedWeapon;
    return (
      <ItemSlot
        key={slot}
        label={SLOT_LABELS[slot]}
        itemId={entry?.itemId}
        instanceId={entry?.instanceId}
        enchantment={entry?.enchantment ?? 0}
        selected={pickerSlot === slot}
        disabled={isLocked}
        disabledContent={<><strong>×</strong><small>2 mains</small></>}
        onClick={() => {
          setPickerSlot((current) => current === slot ? null : slot);
        }}
      />
    );
  };

  return (
    <div className="character-module">
      <section className="character-module__equipment" aria-label="Équipement actuel">
        <div className="character-module__equipment-heading">
          <span>Équipement</span>
          <small>Cliquez sur un emplacement pour le remplacer</small>
        </div>

        <div className="character-module__loadout">
          <div className="character-module__slots">{LEFT_SLOTS.map(renderSlot)}</div>
          <div className="character-module__hero">
            <div className="character-module__hero-halo" />
            <div
              className={`character-module__hero-idle${
                heroIdle.spriteSheet ? " character-module__hero-idle--sheet" : ""
              }`}
              style={{ backgroundImage: `url("${heroIdle.image}")` }}
              role="img"
              aria-label="Aperçu du héros équipé"
            />
            <strong>HÉROS</strong>
          </div>
          <div className="character-module__slots">{RIGHT_SLOTS.map(renderSlot)}</div>
        </div>
      </section>

      <section className="character-module__power">
        <span>Puissance d’objet moyenne</span>
        <strong>{formatValue(character.itemPower)} <small>IP</small></strong>
      </section>

      <section className="character-module__stats" aria-label="Statistiques essentielles">
        <h3>Statistiques essentielles</h3>
        <div className="character-module__stat-grid">
          <article>
            <span>Points de vie</span>
            <strong>{formatValue(character.stats.health)} / {formatValue(character.stats.maxHealth)}</strong>
          </article>
          <article>
            <span>Dégâts</span>
            <div><small>Phys.</small><strong>{formatValue(character.stats.physicalDamage)}</strong></div>
            <div><small>Mag.</small><strong>{formatValue(character.stats.magicalDamage)}</strong></div>
          </article>
          <article>
            <span>Défense</span>
            <div><small>Armure</small><strong>{formatValue(character.stats.armor)}</strong></div>
            <div><small>Résist.</small><strong>{formatValue(character.stats.magicResistance)}</strong></div>
          </article>
        </div>
      </section>

      {pickerSlot !== null && (
        <CharacterEquipmentPicker
          label={SLOT_LABELS[pickerSlot]}
          equipped={equipmentBySlot.get(pickerSlot)}
          candidates={candidates}
          onClose={() => { setPickerSlot(null); }}
          onEquip={(position) => {
            if (actions.equip(position)) setPickerSlot(null);
          }}
          onUnequip={() => {
            if (actions.unequip(pickerSlot)) setPickerSlot(null);
          }}
        />
      )}
    </div>
  );
}
