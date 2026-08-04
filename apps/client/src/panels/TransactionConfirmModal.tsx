import { useCallback, type ReactNode } from "react";

export interface TransactionConfirmProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly cost: number;
  readonly balance: number;
  readonly valueLabel?: string;
  readonly requiresAffordability?: boolean;
  readonly confirmLabel?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Confirmation modal for buy/sell/repair transactions.
 */
export function TransactionConfirmModal({
  title,
  children,
  cost,
  balance,
  valueLabel = "Coût",
  requiresAffordability = true,
  confirmLabel = "Confirmer",
  onConfirm,
  onCancel,
}: TransactionConfirmProps): JSX.Element {
  const canAfford = !requiresAffordability || balance >= cost;

  const handleConfirm = useCallback(() => {
    if (canAfford) {
      onConfirm();
    }
  }, [canAfford, onConfirm]);

  return (
    <div className="tx-modal-overlay" onClick={onCancel} role="presentation">
      <div className="tx-modal" onClick={(e) => { e.stopPropagation(); }} role="dialog" aria-label={title}>
        <div className="tx-modal__header">
          <h3 className="tx-modal__title">{title}</h3>
          <button className="tx-modal__close" onClick={onCancel} type="button" aria-label="Close">
            {"✕"}
          </button>
        </div>
        <div className="tx-modal__body">
          {children}
          <div className="tx-modal__cost-row">
            <span className="tx-modal__cost-label">{valueLabel}</span>
            <span className="tx-modal__cost-value">{String(cost)}{" Silver"}</span>
          </div>
          <div className="tx-modal__balance-row">
            <span className="tx-modal__balance-label">{"Solde"}</span>
            <span className={`tx-modal__balance-value${!canAfford ? " tx-modal__balance-value--insufficient" : ""}`}>
              {String(balance)}{" Silver"}
            </span>
          </div>
          {requiresAffordability && !canAfford && (
            <p className="tx-modal__error">{"Argent insuffisant"}</p>
          )}
        </div>
        <div className="tx-modal__actions">
          <button className="tx-modal__btn tx-modal__btn--cancel" onClick={onCancel} type="button">
            {"Annuler"}
          </button>
          <button
            className="tx-modal__btn tx-modal__btn--confirm"
            onClick={handleConfirm}
            disabled={!canAfford}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
