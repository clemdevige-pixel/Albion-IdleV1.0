import { PanelContainer } from "./PanelContainer";
import { useGameBridge } from "../state/GameContext";
import { usePanelManager } from "./usePanelManager";

/**
 * Repair panel — shows equipment durability and repair costs.
 * Repair service is not yet fully wired; this panel displays placeholder data.
 */
export function RepairPanel(): JSX.Element | null {
  const { activePanel, closePanel } = usePanelManager();
  const state = useGameBridge();

  if (activePanel !== "repair") {
    return null;
  }

  const { repair, wallet } = state;

  return (
    <PanelContainer title="Reparation" onClose={closePanel}>
      <div className="repair-panel">
        <div className="repair-panel__balance">
          <span className="repair-panel__silver">{"S "}{String(wallet.silver)}</span>
        </div>
        {repair.items.length === 0 ? (
          <p className="repair-panel__empty">{"Aucun equipement a reparer"}</p>
        ) : (
          <>
            <ul className="repair-panel__list">
              {repair.items.map((item) => {
                const pct = item.maxDurability > 0 ? Math.round((item.currentDurability / item.maxDurability) * 100) : 0;
                return (
                  <li key={item.instanceId} className="repair-panel__item">
                    <div className="repair-panel__item-info">
                      <span className="repair-panel__item-name">
                        {item.itemId.replace("item_", "").replace(/_/g, " ")}
                      </span>
                      <span className="repair-panel__item-durability">
                        {String(item.currentDurability)}{" / "}{String(item.maxDurability)}{" ("}{String(pct)}{"%)"}
                      </span>
                    </div>
                    <div className="repair-panel__dur-bar">
                      <div
                        className="repair-panel__dur-fill"
                        style={{ width: `${String(pct)}%` }}
                      />
                    </div>
                    <div className="repair-panel__item-cost">
                      {String(item.repairCost)}{" Silver"}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="repair-panel__total">
              <span className="repair-panel__total-label">{"Total"}</span>
              <span className="repair-panel__total-value">{String(repair.totalCost)}{" Silver"}</span>
            </div>
            <button
              className="repair-panel__btn"
              disabled={wallet.silver < repair.totalCost || repair.totalCost === 0}
              type="button"
            >
              {"Tout reparer"}
            </button>
          </>
        )}
      </div>
    </PanelContainer>
  );
}
