import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { InventorySlotVM } from "../../../game/GameBridge";
import { getItemTier } from "../../../data/itemPower";
import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import {
  getEnchantmentTextClass,
  getEquipmentTierFrameClass,
  getItemDisplayName,
  ItemVisual,
} from "../../../panels/ItemVisual";
import { EnchantmentDiamonds } from "../../shared/EnchantmentDiamonds";

export type EquipmentCandidateSource = "inventory" | "bank";

export interface CharacterEquipmentCandidate extends InventorySlotVM {
  readonly source: EquipmentCandidateSource;
}

interface CharacterEquipmentPickerProps {
  readonly label: string;
  readonly candidates: readonly CharacterEquipmentCandidate[];
  readonly x: number;
  readonly y: number;
  readonly onClose: () => void;
  readonly onEquip: (source: EquipmentCandidateSource, position: number) => void;
}

export function CharacterEquipmentPicker({ label, candidates, x, y, onClose, onEquip }: CharacterEquipmentPickerProps): JSX.Element {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent): void => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <section ref={ref} className="character-picker" aria-label={`Sélection ${label}`} style={{ position: "fixed", left: `${String(Math.max(8, Math.min(x + 12, window.innerWidth - 330)))}px`, top: `${String(Math.max(8, Math.min(y + 12, window.innerHeight - 390)))}px`, width: "min(320px, calc(100vw - 16px))", maxHeight: "min(380px, calc(100vh - 16px))", overflowY: "auto", zIndex: 1000 }}>
      <header className="character-picker__header">
        <div><small>Équipement compatible</small><strong>{label}</strong></div>
        <button type="button" onClick={onClose} aria-label="Fermer la sélection">×</button>
      </header>
      {candidates.length === 0 ? <p className="character-picker__empty">Aucun objet compatible dans l’inventaire ou la banque.</p> : (
        <div className="character-picker__grid">
          {candidates.map((candidate) => {
            if (candidate.itemId === undefined) return null;
            const tier = getItemTier(candidate.itemId);
            return (
              <ItemHoverTooltip
                key={`${candidate.source}:${String(candidate.position)}`}
                itemId={candidate.itemId}
                quantity={candidate.quantity}
                instanceId={candidate.instanceId}
                enchantmentOverride={candidate.enchantment}
                showEnchantmentLevel
              >
                <button type="button" className={`character-picker__item${getEquipmentTierFrameClass(tier)}`} onClick={() => { onEquip(candidate.source, candidate.position); }}>
                  <span className="character-picker__icon">
                    <ItemVisual itemId={candidate.itemId} />
                    {candidate.quantity > 1 && <small>{String(candidate.quantity)}</small>}
                  </span>
                  <span>{getItemDisplayName(candidate.itemId)}<small>{candidate.source === "bank" ? "Banque" : "Inventaire"}</small></span>
                  <span className="character-picker__enchantment"><EnchantmentDiamonds level={candidate.enchantment} /></span>
                  {tier !== undefined && <strong className={getEnchantmentTextClass(candidate.enchantment).trim()}>T{String(tier)}.{String(candidate.enchantment)}</strong>}
                </button>
              </ItemHoverTooltip>
            );
          })}
        </div>
      )}
    </section>,
    document.body,
  );
}
