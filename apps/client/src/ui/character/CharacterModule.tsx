import { useEffect, useMemo, useState } from "react";
import type { EquipmentLoadout, EquipmentSlot } from "@game/gameplay";
import { getItemTier } from "../../data/itemPower";
import { resolveEquipmentInfo } from "../../data/itemContentCatalog";
import { ItemContextMenu } from "../../panels/ItemContextMenu";
import { ItemSlot } from "../shared/ItemSlot";
import { getCroppedHeroIdleFrame, type CroppedHeroIdleFrame } from "./characterIdleFrameCrop";
import {
  getEquippedHeroIdlePresentation,
  getHeroIdleBackgroundPosition,
  getHeroIdlePreviewSize,
} from "./characterPresentation";
import { AwakenedWeaponPanel } from "./components/AwakenedWeaponPanel";
import {
  CharacterEquipmentPicker,
  type CharacterEquipmentCandidate,
} from "./components/CharacterEquipmentPicker";
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

interface EquipmentContextMenuState {
  readonly slot: EquipmentSlot;
  readonly x: number;
  readonly y: number;
}

function formatValue(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function formatWholeValue(value: number): string {
  return Math.round(value).toLocaleString("fr-FR");
}

function getLoadoutMaxTier(loadout: EquipmentLoadout): number | undefined {
  const tiers = loadout.slots
    .map((slot) => getItemTier(slot.itemId))
    .filter((tier): tier is NonNullable<ReturnType<typeof getItemTier>> => tier !== undefined);
  return tiers.length === 0 ? undefined : Math.max(...tiers);
}

export function CharacterModule(): JSX.Element {
  const character = useCharacterData();
  const actions = useCharacterActions();
  const [loadoutRevision, setLoadoutRevision] = useState(0);
  const [selectedLoadoutId, setSelectedLoadoutId] = useState("");
  const [editingLoadoutId, setEditingLoadoutId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pickerSlot, setPickerSlot] = useState<{ slot: EquipmentSlot; x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<EquipmentContextMenuState | null>(null);
  const [croppedHeroIdle, setCroppedHeroIdle] = useState<CroppedHeroIdleFrame | undefined>(undefined);

  const equipmentBySlot = useMemo(
    () => new Map(character.equipment.map((entry) => [entry.slot, entry])),
    [character.equipment],
  );
  const loadouts = useMemo(() => actions.getLoadouts(), [actions, loadoutRevision]);

  useEffect(() => {
    if (loadouts.length === 0) {
      setSelectedLoadoutId("");
      setEditingLoadoutId(null);
      return;
    }
    if (!loadouts.some((loadout) => loadout.id === selectedLoadoutId)) {
      setSelectedLoadoutId(loadouts[0]?.id ?? "");
    }
  }, [loadouts, selectedLoadoutId]);

  const selectedLoadout = loadouts.find((loadout) => loadout.id === selectedLoadoutId);
  const selectedLoadoutActive = selectedLoadout !== undefined
    && character.equipment.filter((entry) => entry.itemId !== undefined).length === selectedLoadout.slots.length
    && selectedLoadout.slots.every((slot) => equipmentBySlot.get(slot.slot)?.instanceId === slot.instanceId);
  const selectedLoadoutTier = selectedLoadout === undefined ? undefined : getLoadoutMaxTier(selectedLoadout);

  const equippedWeapon = equipmentBySlot.get("weapon");
  const heroIdle = getEquippedHeroIdlePresentation(equippedWeapon?.itemId);
  const heroIdlePreviewSize = getHeroIdlePreviewSize(heroIdle);
  const heroIdleFrameIndex = heroIdle.spriteSheet ? heroIdle.frameIndex : -1;
  const heroIdleFrameWidth = heroIdle.spriteSheet ? heroIdle.frameWidth : 0;
  const heroIdleFrameHeight = heroIdle.spriteSheet ? heroIdle.frameHeight : 0;

  useEffect(() => {
    setCroppedHeroIdle(undefined);
    const request = getCroppedHeroIdleFrame(heroIdle);
    if (request === undefined) return;

    let active = true;
    void request.then((frame) => {
      if (active) setCroppedHeroIdle(frame);
    }).catch(() => {
      if (active) setCroppedHeroIdle(undefined);
    });

    return () => {
      active = false;
    };
  }, [heroIdle.image, heroIdle.spriteSheet, heroIdleFrameIndex, heroIdleFrameWidth, heroIdleFrameHeight]);

  const croppedHeroIdlePreviewSize = heroIdle.spriteSheet
    && heroIdlePreviewSize !== undefined
    && croppedHeroIdle !== undefined
    ? {
        width: heroIdlePreviewSize.width * (croppedHeroIdle.width / heroIdle.frameWidth),
        height: heroIdlePreviewSize.height * (croppedHeroIdle.height / heroIdle.frameHeight),
      }
    : undefined;

  const hasTwoHandedWeapon = equippedWeapon?.itemId !== undefined
    && resolveEquipmentInfo(equippedWeapon.itemId)?.handling === "two_handed";
  const candidates: readonly CharacterEquipmentCandidate[] = pickerSlot === null
    ? []
    : [
        ...character.inventory.map((entry) => ({ ...entry, source: "inventory" as const })),
        ...character.bank.map((entry) => ({ ...entry, source: "bank" as const })),
      ].filter((entry) => entry.itemId !== undefined
        && resolveEquipmentInfo(entry.itemId)?.slot === pickerSlot.slot);

  const saveNewLoadout = (): void => {
    const ordinal = loadouts.length + 1;
    const id = `loadout_${Date.now().toString(36)}_${String(ordinal)}`;
    if (actions.saveLoadout(id, `Set ${String(ordinal)}`)) {
      setSelectedLoadoutId(id);
      setLoadoutRevision((revision) => revision + 1);
    }
  };

  const openLoadoutEditor = (): void => {
    if (selectedLoadout === undefined) return;
    setEditingLoadoutId(selectedLoadout.id);
    setEditingName(selectedLoadout.name);
  };

  const closeLoadoutEditor = (): void => {
    setEditingLoadoutId(null);
    setEditingName("");
  };

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
          setContextMenu(null);
          setPickerSlot((current) => current?.slot === slot
            ? null
            : { slot, x: event.clientX, y: event.clientY });
        }}
        {...(entry?.itemId === undefined ? {} : {
          onDoubleClick: () => {
            setContextMenu(null);
            if (actions.unequip(slot)) setPickerSlot(null);
          },
          onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            setPickerSlot(null);
            setContextMenu({ slot, x: event.clientX, y: event.clientY });
          },
        })}
      />
    );
  };

  return (
    <div className="character-module">
      <section className="character-module__equipment" aria-label="Équipement actuel">
        <div className="character-module__presets" aria-label="Loadouts d'équipement">
          <small className="character-module__presets-label">Loadout</small>
          <div className="character-module__preset-toolbar">
            <select
              className="character-module__preset-select"
              aria-label="Loadout sélectionné"
              value={selectedLoadoutId}
              disabled={loadouts.length === 0}
              onChange={(event) => {
                setSelectedLoadoutId(event.target.value);
                closeLoadoutEditor();
              }}
            >
              {loadouts.length === 0 && <option value="">Aucun loadout</option>}
              {loadouts.map((loadout) => (
                <option key={loadout.id} value={loadout.id}>{loadout.name}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={selectedLoadout === undefined || selectedLoadoutActive}
              onClick={() => {
                if (selectedLoadout !== undefined && actions.applyLoadout(selectedLoadout.id)) {
                  setPickerSlot(null);
                  setContextMenu(null);
                  setLoadoutRevision((revision) => revision + 1);
                }
              }}
            >{selectedLoadoutActive ? "Équipé" : "Équiper"}</button>
            <button type="button" disabled={selectedLoadout === undefined} onClick={openLoadoutEditor} title="Gérer le loadout">✎</button>
            <button type="button" onClick={saveNewLoadout} title="Enregistrer le set actuel">+</button>
          </div>
          {selectedLoadout !== undefined && (
            <div className="character-module__preset-summary">
              <span>{selectedLoadoutActive ? "Set actuellement équipé" : `${String(selectedLoadout.slots.length)} pièces enregistrées`}</span>
              {selectedLoadoutTier !== undefined && <span>T{String(selectedLoadoutTier)} max</span>}
            </div>
          )}
          {editingLoadoutId !== null && selectedLoadout?.id === editingLoadoutId && (
            <div className="character-module__preset-editor">
              <input
                aria-label="Nom du loadout"
                value={editingName}
                maxLength={40}
                onChange={(event) => { setEditingName(event.target.value); }}
              />
              <button
                type="button"
                disabled={editingName.trim().length === 0}
                onClick={() => {
                  if (actions.renameLoadout(selectedLoadout.id, editingName.trim())) {
                    closeLoadoutEditor();
                    setLoadoutRevision((revision) => revision + 1);
                  }
                }}
              >Renommer</button>
              <button
                type="button"
                onClick={() => {
                  if (actions.saveLoadout(selectedLoadout.id, selectedLoadout.name)) {
                    closeLoadoutEditor();
                    setLoadoutRevision((revision) => revision + 1);
                  }
                }}
              >Mettre à jour avec le set actuel</button>
              <button
                type="button"
                className="character-module__preset-delete"
                onClick={() => {
                  if (actions.deleteLoadout(selectedLoadout.id)) {
                    closeLoadoutEditor();
                    setLoadoutRevision((revision) => revision + 1);
                  }
                }}
              >Supprimer</button>
            </div>
          )}
        </div>

        <div className="character-module__loadout">
          <div className="character-module__slots character-module__slots--left">{LEFT_SLOTS.map(renderSlot)}</div>
          <div className="character-module__hero">
            <div className="character-module__hero-halo" />
            {croppedHeroIdle !== undefined && croppedHeroIdlePreviewSize !== undefined ? (
              <img
                className="character-module__hero-idle character-module__hero-idle--cropped"
                src={croppedHeroIdle.image}
                width={croppedHeroIdlePreviewSize.width}
                height={croppedHeroIdlePreviewSize.height}
                alt="Aperçu du héros équipé"
                draggable={false}
              />
            ) : (
              <div
                className={`character-module__hero-idle${heroIdle.spriteSheet ? " character-module__hero-idle--sheet" : ""}`}
                style={{
                  backgroundImage: `url("${heroIdle.image}")`,
                  ...(heroIdle.spriteSheet && heroIdlePreviewSize !== undefined
                    ? {
                        width: `${String(heroIdlePreviewSize.width)}px`,
                        aspectRatio: `${String(heroIdlePreviewSize.width)} / ${String(heroIdlePreviewSize.height)}`,
                        maxWidth: "100%",
                        maxHeight: "100%",
                        backgroundSize: `${String(heroIdle.frameCount * 100)}% 100%`,
                        backgroundPosition: getHeroIdleBackgroundPosition(heroIdle),
                      }
                    : {}),
                }}
                role="img"
                aria-label="Aperçu du héros équipé"
              />
            )}
          </div>
          <div className="character-module__slots character-module__slots--right">{RIGHT_SLOTS.map(renderSlot)}</div>
        </div>
      </section>

      <section className="character-module__stats" aria-label="Statistiques de combat">
        <article className="character-module__stat-card character-module__stat-card--ip">
          <img src="/assets/ui/ip.png" alt="" aria-hidden="true" draggable={false} />
          <div><span>Item Power</span><strong>{formatValue(character.itemPower)}</strong></div>
        </article>
        <article className="character-module__stat-card">
          <img src="/assets/ui/health.png" alt="" aria-hidden="true" draggable={false} />
          <div><span>Points de vie</span><strong>{formatWholeValue(character.stats.health)} / {formatWholeValue(character.stats.maxHealth)}</strong></div>
        </article>
        <article className="character-module__stat-card">
          <img src="/assets/ui/damage.png" alt="" aria-hidden="true" draggable={false} />
          <div><span>Dégâts</span><div className="character-module__stat-values"><span><small>Phys.</small><strong>{formatValue(character.stats.physicalDamage)}</strong></span><span><small>Mag.</small><strong>{formatValue(character.stats.magicalDamage)}</strong></span></div></div>
        </article>
        <article className="character-module__stat-card">
          <img src="/assets/ui/armor.png" alt="" aria-hidden="true" draggable={false} />
          <div><span>Défense</span><div className="character-module__stat-values"><span><small>Armure</small><strong>{formatValue(character.stats.armor)}</strong></span><span><small>Résist.</small><strong>{formatValue(character.stats.magicResistance)}</strong></span></div></div>
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
          onEquip={(source, position) => { if (actions.equip(source, position)) setPickerSlot(null); }}
        />
      )}
      {contextMenu !== null && (
        <ItemContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => { setContextMenu(null); }}
          onUnequip={() => {
            if (actions.unequip(contextMenu.slot)) setPickerSlot(null);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
