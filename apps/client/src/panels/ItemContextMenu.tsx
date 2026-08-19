import { useEffect, useRef } from "react";

export interface ItemContextMenuProps {
  readonly position: number;
  readonly x: number;
  readonly y: number;
  readonly itemId: string;
  readonly onClose: () => void;
  readonly onEquip?: ((position: number) => void) | undefined;
  readonly onToggleTrack?: ((itemId: string) => void) | undefined;
  readonly isTracked?: boolean | undefined;
}

/**
 * Right-click context menu for storage items.
 */
export function ItemContextMenu({
  position,
  x,
  y,
  itemId,
  onClose,
  onEquip,
  onToggleTrack,
  isTracked = false,
}: ItemContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      if (ref.current !== null && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => { document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: `${String(x)}px`, top: `${String(y)}px` }}
    >
      {onEquip !== undefined && (
        <button
          type="button"
          className="context-menu__item"
          onClick={() => { onEquip(position); }}
        >
          Equiper
        </button>
      )}
      {onToggleTrack !== undefined && (
        <button
          type="button"
          className="context-menu__item"
          onClick={() => { onToggleTrack(itemId); onClose(); }}
        >
          {isTracked ? "Ne plus suivre" : "Suivre la ressource"}
        </button>
      )}
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
