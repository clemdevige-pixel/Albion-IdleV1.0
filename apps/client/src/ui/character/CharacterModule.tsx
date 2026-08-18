import { useMemo, useState } from "react";
import type { EquipmentSlot } from "@game/gameplay";
import { getItemDefinition } from "../../panels/ItemVisual";
import { ItemSlot } from "../shared/ItemSlot";
import { getEquippedHeroIdlePresentation } from "./characterPresentation";
import { AwakenedWeaponPanel } from "./components/AwakenedWeaponPanel";
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

function formatWholeValue(value: number): string {
  return Math.round(value).toLocaleString("fr-FR");
}

export function CharacterModule(): JSX.Element {
  const character = useCharacterData();
  const actions = useCharacterActions();
  const [pickerSlot, setPickerSlot] = useState<{
    slot: EquipmentSlot;
    x: number;
    y: number;
  } | null>(null);

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
      && getItemDefinition(entry.itemId)?.slot === pickerSlot.slot);

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
        selected={pickerSlot?.slot === slot}
        disabled={isLocked}
        disabledContent={<><strong>×</strong><small>2 mains</small></>}
        onClick={(event) => {
          if (event.detail > 1) return;
          setPickerSlot((current) => current?.slot === slot
            ? null
            : { slot, x: event.clientX, y: event.clientY });
        }}
        {...(entry?.itemId === undefined
          ? {}
          : {
              onDoubleClick: () => {
                if (actions.unequip(slot)) setPickerSlot(null);
              },
            })}
      />
    );
  };

  return (
    <div className="character-module">
      <section className="character-module__equipment" aria-label="Équipement actuel">
        <div className="character-module__equipment-heading">
          <span>Équipement</span>
        </div>

        <div className="character-module__loadout">
          <div className="character-module__slots character-module__slots--left">
            {LEFT_SLOTS.map(renderSlot)}
          </div>

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
          </div>

          <div className="character-module__slots character-module__slots--right">
            {RIGHT_SLOTS.map(renderSlot)}
          </div>
        </div>
      </section>

      <section className="character-module__stats" aria-label="Statistiques de combat">
        <article className="character-module__stat-card character-module__stat-card--ip">
          <img src="/assets/ui/ip.png" alt="" aria-hidden="true" draggable={false} />
          <div>
            <span>Item Power</span>
            <strong>{formatValue(character.itemPower)}</strong>
          </div>
        </article>

        <article className="character-module__stat-card">
          <img src="/assets/ui/health.png" alt="" aria-hidden="true" draggable={false} />
          <div>
            <span>Points de vie</span>
            <strong>{formatWholeValue(character.stats.health)} / {formatWholeValue(character.stats.maxHealth)}</strong>
          </div>
        </article>

        <article className="character-module__stat-card">
          <img src="/assets/ui/damage.png" alt="" aria-hidden="true" draggable={false} />
          <div>
            <span>Dégâts</span>
            <div className="character-module__stat-values">
              <span><small>Phys.</small><strong>{formatValue(character.stats.physicalDamage)}</strong></span>
              <span><small>Mag.</small><strong>{formatValue(character.stats.magicalDamage)}</strong></span>
            </div>
          </div>
        </article>

        <article className="character-module__stat-card">
          <img src="/assets/ui/armor.png" alt="" aria-hidden="true" draggable={false} />
          <div>
            <span>Défense</span>
            <div className="character-module__stat-values">
              <span><small>Armure</small><strong>{formatValue(character.stats.armor)}</strong></span>
              <span><small>Résist.</small><strong>{formatValue(character.stats.magicResistance)}</strong></span>
            </div>
          </div>
        </article>
      </section>

      <AwakenedWeaponPanel />

      {pickerSlot !== null && (
        <CharacterEquipmentPicker
          label={SLOT_LABELS[pickerSlot.slot]}
          candidates={candidates}
          x={pickerSlot.x}
          y={pickerSlot.y}
          onClose={() => { setPickerSlot(null); }}
          onEquip={(position) => {
            if (actions.equip(position)) setPickerSlot(null);
          }}
        />
      )}
    </div>
  );
}
