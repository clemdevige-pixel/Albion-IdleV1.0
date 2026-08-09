import type { EquipmentSlotVM, InventorySlotVM } from "../../../game/GameBridge";
import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import {
  getEnchantmentFrameClass,
  getItemDisplayName,
  ItemVisual,
} from "../../../panels/ItemVisual";

interface CharacterEquipmentPickerProps {
  readonly label: string;
  readonly equipped: EquipmentSlotVM | undefined;
  readonly candidates: readonly InventorySlotVM[];
  readonly onClose: () => void;
  readonly onEquip: (position: number) => void;
  readonly onUnequip: () => void;
}

export function CharacterEquipmentPicker({
  label,
  equipped,
  candidates,
  onClose,
  onEquip,
  onUnequip,
}: CharacterEquipmentPickerProps): JSX.Element {
  return (
    <section className="character-picker" aria-label={`Sélection ${label}`}>
      <header className="character-picker__header">
        <div>
          <small>Équipement compatible</small>
          <strong>{label}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la sélection">×</button>
      </header>

      {equipped?.itemId !== undefined && (
        <div className="character-picker__current">
          <span>Équipé</span>
          <strong>{getItemDisplayName(equipped.itemId)}</strong>
          <button type="button" onClick={onUnequip}>Retirer</button>
        </div>
      )}

      {candidates.length === 0 ? (
        <p className="character-picker__empty">Aucun objet compatible dans l’inventaire.</p>
      ) : (
        <div className="character-picker__grid">
          {candidates.map((candidate) => {
            if (candidate.itemId === undefined) return null;
            return (
              <ItemHoverTooltip
                key={candidate.position}
                itemId={candidate.itemId}
                quantity={candidate.quantity}
                instanceId={candidate.instanceId}
              >
                <button
                  type="button"
                  className={`character-picker__item${
                    getEnchantmentFrameClass(candidate.enchantment)
                  }`}
                  onClick={() => { onEquip(candidate.position); }}
                >
                  <span className="character-picker__icon">
                    <ItemVisual itemId={candidate.itemId} />
                    {candidate.quantity > 1 && <small>{String(candidate.quantity)}</small>}
                  </span>
                  <span>{getItemDisplayName(candidate.itemId)}</span>
                </button>
              </ItemHoverTooltip>
            );
          })}
        </div>
      )}
    </section>
  );
}
