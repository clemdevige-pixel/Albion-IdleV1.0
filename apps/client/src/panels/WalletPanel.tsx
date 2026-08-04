import { PanelContainer } from "./PanelContainer";
import { useGameBridge } from "../state/GameContext";
import { usePanelManager } from "./usePanelManager";
import { CurrencyDisplay } from "./CurrencyDisplay";

/**
 * Wallet panel — shows Silver balance, income rate, and recent transaction history.
 */
export function WalletPanel(): JSX.Element | null {
  const { activePanel, closePanel } = usePanelManager();
  const state = useGameBridge();

  if (activePanel !== "wallet") {
    return null;
  }

  const { wallet, transactionHistory } = state;

  return (
    <PanelContainer title="Portefeuille" onClose={closePanel}>
      <div className="wallet-panel">
        <div className="wallet-panel__balance">
          <span className="wallet-panel__label">{"Argent"}</span>
          <CurrencyDisplay amount={wallet.silver} incomeRate={wallet.incomeRate} size="large" />
        </div>

        <div className="wallet-panel__history">
          <h4 className="wallet-panel__history-title">{"Historique"}</h4>
          {transactionHistory.length === 0 ? (
            <p className="wallet-panel__empty">{"Aucune transaction"}</p>
          ) : (
            <ul className="wallet-panel__list">
              {transactionHistory.map((entry) => (
                <li key={entry.id} className="wallet-panel__entry">
                  <span className={`wallet-panel__entry-icon wallet-panel__entry-icon--${entry.type}`}>
                    {iconForType(entry.type)}
                  </span>
                  <span className="wallet-panel__entry-desc">{entry.description}</span>
                  <span className={`wallet-panel__entry-amount${entry.type === "credit" || entry.type === "sale" ? " wallet-panel__entry-amount--positive" : " wallet-panel__entry-amount--negative"}`}>
                    {entry.type === "credit" || entry.type === "sale" ? "+" : "-"}{String(entry.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PanelContainer>
  );
}

function iconForType(type: string): string {
  switch (type) {
    case "purchase": return "\u{1F6D2}";
    case "sale": return "\u{1F4B0}";
    case "repair": return "\u{1F527}";
    case "credit": return "\u{2B06}";
    case "debit": return "\u{2B07}";
    default: return "\u{1F4B0}";
  }
}
