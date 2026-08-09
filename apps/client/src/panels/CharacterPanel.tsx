import { useCallback, useState, type MouseEvent } from "react";
import type { EquipmentSlot } from "@game/gameplay";
import { PanelContainer } from "./PanelContainer";
import { useGameBridge, useGameServices } from "../state/GameContext";
import { usePanelManager } from "./usePanelManager";
import { ItemHoverTooltip } from "./ItemHoverTooltip";
import { ItemContextMenu } from "./ItemContextMenu";
import {
  getEnchantmentFrameClass,
  getItemDefinition,
  getItemDisplayName,
  ItemVisual,
} from "./ItemVisual";
import { resolveEquipmentPresentation } from "../data/equipmentPresentation";
import { renderManifestRegistry } from "../game/render/defaultRenderManifestRegistry";
import { calculateAverageEquippedItemPower } from "../ui/state/equipmentUiSelectors";
import {
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncStatsToBridge,
} from "../state/bridgeSync";

const STAT_LABELS: Readonly<Record<string, string>> = {
  stat_max_health: "PV maximum",
  stat_max_energy: "Énergie maximale",
  stat_physical_damage: "Dégâts physiques",
  stat_magical_damage: "Dégâts magiques",
  stat_armor: "Armure",
  stat_magic_resistance: "Résistance magique",
  stat_attack_speed: "Vitesse d’attaque",
  stat_move_speed: "Vitesse de déplacement",
};

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

interface HeroIdlePresentation {
  readonly image: string;
  readonly spriteSheet: boolean;
}

function getEquippedHeroIdleSheet(
  weaponId: string | undefined,
): HeroIdlePresentation {
  const presentation = resolveEquipmentPresentation(weaponId);
  if (presentation !== undefined) {
    const actorManifest = renderManifestRegistry.getActor(
      presentation.actorManifestId,
    );
    if (actorManifest !== undefined) {
      return {
        image: actorManifest.animations.idle.assetPath,
        spriteSheet: true,
      };
    }
  }
  if (weaponId !== undefined) {
    return {
      image: "/assets/characters/hero-broadsword-idle-sheet-v1.png",
      spriteSheet: true,
    };
  }
  return {
    image: "/assets/hero-knight-pixel-v1.png",
    spriteSheet: false,
  };
}

export function CharacterPanel(): JSX.Element | null {
  const { activePanel, closePanel } = usePanelManager();
  const state = useGameBridge();
  const services = useGameServices();
  const [pickerSlot, setPickerSlot] = useState<EquipmentSlot | null>(null);
  const [inventoryContextMenu, setInventoryContextMenu] = useState<{
    position: number;
    x: number;
    y: number;
  } | null>(null);

  const handleUnequip = useCallback(
    (slot: EquipmentSlot) => {
      const { equipmentManager, inventoryManager, statsManager, heroId, bridge } =
        services;
      const result = equipmentManager.unequipToInventory(heroId, slot);
      if (result.ok) {
        syncInventoryToBridge(bridge, inventoryManager, heroId);
        syncEquipmentToBridge(bridge, equipmentManager, heroId);
        syncStatsToBridge(bridge, statsManager, heroId);
      }
    },
    [services],
  );

  const handleEquip = useCallback(
    (position: number) => {
      const { equipmentManager, inventoryManager, statsManager, heroId, bridge } =
        services;
      const result = equipmentManager.equipFromInventory(heroId, position);
      if (result.ok) {
        syncInventoryToBridge(bridge, inventoryManager, heroId);
        syncEquipmentToBridge(bridge, equipmentManager, heroId);
        syncStatsToBridge(bridge, statsManager, heroId);
        setPickerSlot(null);
      }
    },
    [services],
  );

  const handleInventoryDoubleClick = useCallback(
    (position: number, itemId: string) => {
      if (getItemDefinition(itemId) !== undefined) {
        handleEquip(position);
        return;
      }
      services.useConsumable(itemId);
    },
    [handleEquip, services],
  );

  const handleInventoryContextMenu = useCallback(
    (event: MouseEvent, position: number, hasItem: boolean) => {
      event.preventDefault();
      if (hasItem) {
        setInventoryContextMenu({
          position,
          x: event.clientX,
          y: event.clientY,
        });
      }
    },
    [],
  );

  if (activePanel !== "character") {
    return null;
  }

  const equipmentBySlot = new Map(
    state.equipment.slots.map((entry) => [entry.slot, entry]),
  );
  const equippedWeapon = equipmentBySlot.get("weapon");
  const heroIdle = getEquippedHeroIdleSheet(equippedWeapon?.itemId);
  const hasTwoHandedWeapon =
    equippedWeapon?.itemId != null &&
    getItemDefinition(equippedWeapon.itemId)?.handling === "two_handed";
  const averageItemPower = calculateAverageEquippedItemPower(
    state.equipment,
    state.progression.masteries,
  );
  const compatibleInventoryItems = pickerSlot === null
    ? []
    : state.inventory.slots.filter((inventorySlot) => {
      if (inventorySlot.itemId == null) return false;
      return getItemDefinition(inventorySlot.itemId)?.slot === pickerSlot;
    });

  const renderSlot = (slot: EquipmentSlot): JSX.Element => {
    const entry = equipmentBySlot.get(slot);
    const filled = entry?.itemId != null;
    const lockedByWeapon = slot === "off_hand" && hasTwoHandedWeapon;

    const slotButton = (
      <button
        type="button"
        className={`character-loadout__slot${
          filled ? " character-loadout__slot--filled" : ""
        }${lockedByWeapon ? " character-loadout__slot--locked" : ""}${
          getEnchantmentFrameClass(entry?.enchantment)
        }`}
        disabled={lockedByWeapon}
        onClick={() => {
          if (lockedByWeapon) return;
          setPickerSlot((current) => current === slot ? null : slot);
        }}
        title={
          lockedByWeapon
            ? "Indisponible : arme à deux mains équipée"
            : filled
              ? `${SLOT_LABELS[slot]} — cliquer pour changer`
              : `${SLOT_LABELS[slot]} — cliquer pour choisir`
        }
      >
        <span className="character-loadout__slot-label">{SLOT_LABELS[slot]}</span>
        {lockedByWeapon ? (
          <span className="character-loadout__locked">
            <strong>×</strong>
            <small>Arme à<br />deux mains</small>
          </span>
        ) : entry?.itemId != null ? (
          <span className="character-loadout__item">
            <ItemVisual itemId={entry.itemId} />
          </span>
        ) : (
          <span className="character-loadout__empty">+</span>
        )}
      </button>
    );

    if (entry?.itemId != null && !lockedByWeapon) {
      return (
        <ItemHoverTooltip
          key={slot}
          itemId={entry.itemId}
          quantity={1}
          instanceId={entry.instanceId}
        >
          {slotButton}
        </ItemHoverTooltip>
      );
    }

    return <span key={slot}>{slotButton}</span>;
  };

  return (
    <PanelContainer title="Personnage" onClose={closePanel}>
      <div className="character-screen">
        <section className="character-sheet">
          <div className="character-sheet__identity">
            <div className="character-sheet__avatar" />
            <div>
              <span className="character-sheet__eyebrow">Aventurier</span>
              <h2>Héros</h2>
              <span className="character-sheet__health">
                {String(Math.ceil(state.playerHealth))} /{" "}
                {String(Math.ceil(state.playerMaxHealth))} PV
              </span>
            </div>
          </div>

          <h3>Caractéristiques</h3>
          <div className="character-sheet__stats">
            <div className="character-sheet__stat character-sheet__stat--item-power">
              <span>IP moyen</span>
              <strong>
                {averageItemPower.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                })} IP
              </strong>
            </div>
            {state.stats.stats.map((stat) => (
              <div key={stat.id} className="character-sheet__stat">
                <span>{STAT_LABELS[stat.id] ?? stat.id}</span>
                <strong>
                  {String(Math.round(stat.computed * 100) / 100)}
                  {stat.base !== stat.computed && (
                    <small>
                      {" "}
                      ({String(Math.round(stat.base * 100) / 100)})
                    </small>
                  )}
                </strong>
              </div>
            ))}
          </div>

        </section>

        <section className="character-loadout">
          <div className="character-loadout__heading">
            <span>Équipement actuel</span>
            <small>Cliquez sur un emplacement pour gérer son équipement</small>
          </div>

          <div className="character-loadout__board">
            <div className="character-loadout__column">
              {LEFT_SLOTS.map(renderSlot)}
            </div>

            <div className="character-loadout__hero">
              <div className="character-loadout__halo" />
              <div
                className={`character-loadout__hero-idle${
                  heroIdle.spriteSheet
                    ? " character-loadout__hero-idle--sheet"
                    : " character-loadout__hero-idle--single"
                }`}
                style={{ backgroundImage: `url("${heroIdle.image}")` }}
                role="img"
                aria-label="Héros équipé"
              />
              <strong>HÉROS</strong>
            </div>

            <div className="character-loadout__column">
              {RIGHT_SLOTS.map(renderSlot)}
            </div>
          </div>

          {pickerSlot !== null && (
            <div className="character-equipment-picker" role="dialog">
              <div className="character-equipment-picker__heading">
                <div>
                  <small>Équipement compatible</small>
                  <strong>{SLOT_LABELS[pickerSlot]}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => { setPickerSlot(null); }}
                  aria-label="Fermer la sélection"
                >
                  ×
                </button>
              </div>

              {equipmentBySlot.get(pickerSlot)?.itemId != null && (
                <div className="character-equipment-picker__current">
                  <span>Actuellement équipé</span>
                  <strong>
                    {getItemDisplayName(equipmentBySlot.get(pickerSlot)?.itemId ?? "")}
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      handleUnequip(pickerSlot);
                      setPickerSlot(null);
                    }}
                  >
                    Retirer
                  </button>
                </div>
              )}

              {compatibleInventoryItems.length > 0 ? (
                <div className="character-equipment-picker__grid">
                  {compatibleInventoryItems.map((inventorySlot) => {
                    const itemId = inventorySlot.itemId;
                    if (itemId == null) return null;
                    return (
                      <ItemHoverTooltip
                        key={inventorySlot.position}
                        itemId={itemId}
                        quantity={inventorySlot.quantity}
                        instanceId={inventorySlot.instanceId}
                      >
                        <button
                          type="button"
                          className={`character-equipment-picker__item${
                            getEnchantmentFrameClass(inventorySlot.enchantment)
                          }`}
                          onClick={() => { handleEquip(inventorySlot.position); }}
                          title={`Équiper ${getItemDisplayName(itemId)}`}
                        >
                          <span className="character-equipment-picker__icon">
                            <ItemVisual itemId={itemId} />
                            {inventorySlot.quantity > 1 && (
                              <small>{String(inventorySlot.quantity)}</small>
                            )}
                          </span>
                          <span>{getItemDisplayName(itemId)}</span>
                        </button>
                      </ItemHoverTooltip>
                    );
                  })}
                </div>
              ) : (
                <p className="character-equipment-picker__empty">
                  Aucun équipement compatible dans l’inventaire.
                </p>
              )}
            </div>
          )}
        </section>

        <aside className="character-inventory">
          <div className="character-inventory__heading">
            <div>
              <small>SAC</small>
              <h3>Inventaire</h3>
            </div>
            <strong>
              {String(state.inventory.occupied)} / {String(state.inventory.capacity)}
            </strong>
          </div>
          <div className="character-inventory__grid">
            {state.inventory.slots.map((slot) => {
              const slotContent = (
                <div
                  className={`character-inventory__slot${
                    slot.itemId != null ? " character-inventory__slot--filled" : ""
                  }${getEnchantmentFrameClass(slot.enchantment)}`}
                  onContextMenu={(event) => {
                    handleInventoryContextMenu(
                      event,
                      slot.position,
                      slot.itemId != null,
                    );
                  }}
                  onDoubleClick={() => {
                    if (slot.itemId != null) {
                      handleInventoryDoubleClick(slot.position, slot.itemId);
                    }
                  }}
                >
                  {slot.itemId != null && (
                    <>
                      <ItemVisual itemId={slot.itemId} />
                      {slot.quantity > 1 && <small>{String(slot.quantity)}</small>}
                    </>
                  )}
                </div>
              );

              if (slot.itemId == null) {
                return <span key={slot.position}>{slotContent}</span>;
              }

              return (
                <ItemHoverTooltip
                  key={slot.position}
                  itemId={slot.itemId}
                  quantity={slot.quantity}
                  instanceId={slot.instanceId}
                >
                  {slotContent}
                </ItemHoverTooltip>
              );
            })}
          </div>
          <p>Double-cliquez pour équiper ou utiliser.</p>

        </aside>

        {inventoryContextMenu !== null && (
          <ItemContextMenu
            position={inventoryContextMenu.position}
            x={inventoryContextMenu.x}
            y={inventoryContextMenu.y}
            onClose={() => { setInventoryContextMenu(null); }}
            onEquip={handleEquip}
            itemId={
              state.inventory.slots.find(
                (slot) => slot.position === inventoryContextMenu.position,
              )?.itemId ?? ""
            }
          />
        )}
      </div>
    </PanelContainer>
  );
}
