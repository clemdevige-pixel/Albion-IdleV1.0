import { useEffect, useRef } from "react";

export interface ItemContextMenuBankDestination {
  readonly tabNumber: number;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface ItemContextMenuProps {
  readonly position?: number;
  readonly x: number;
  readonly y: number;
  readonly onClose: () => void;
  readonly onEquip?: ((position: number) => void) | undefined;
  readonly onUnequip?: (() => void) | undefined;
  readonly bankDestinations?: readonly ItemContextMenuBankDestination[] | undefined;
  readonly onMoveToBank?: ((position: number, tabNumber: number) => void) | undefined;
}

/**
 * Right-click context menu for item actions.
 */
export function ItemContextMenu({
  position,
  x,
  y,
  onClose,
  onEquip,
  onUnequip,
  bankDestinations = [],
  onMoveToBank,
}: ItemContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: Event) => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: `${String(x + 12)}px`, top: `${String(y + 12)}px` }}
    >
      {onEquip !== undefined && position !== undefined && (
        <button
          type="button"
          className="context-menu__item"
          onClick={() => { onEquip(position); }}
        >
          Equiper
        </button>
      )}
      {onUnequip !== undefined && (
        <button
          type="button"
          className="context-menu__item"
          onClick={onUnequip}
        >
          Déséquiper
        </button>
      )}
      {onMoveToBank !== undefined && position !== undefined && bankDestinations.map((destination) => (
        <button
          key={destination.tabNumber}
          type="button"
          className="context-menu__item"
          disabled={destination.disabled === true}
          onClick={() => { onMoveToBank(position, destination.tabNumber); }}
        >
          Déplacer vers {destination.label}{destination.disabled === true ? " · pleine" : ""}
        </button>
      ))}
      <button
        type="button"
        className="context-menu__item"
        onClick={onClose}
      >
        Annuler
      </button>
    </div>
  );
}
