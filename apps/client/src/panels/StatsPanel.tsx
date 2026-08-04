import { PanelContainer } from "./PanelContainer";
import { useGameBridge } from "../state/GameContext";
import { usePanelManager } from "./usePanelManager";

const STAT_LABELS: Readonly<Record<string, string>> = {
  stat_max_health: "PV Max",
  stat_max_energy: "Energie Max",
  stat_physical_damage: "Degats Physiques",
  stat_magical_damage: "Degats Magiques",
  stat_armor: "Armure",
  stat_magic_resistance: "Resistance Magique",
  stat_attack_speed: "Vitesse d'Attaque",
  stat_move_speed: "Vitesse de Deplacement",
};

/**
 * Detailed stats panel — shows base vs computed values for all stats.
 * Activated via the "character" tab (shares with CharacterPanel via sub-tabs
 * in a future phase; for now this is a standalone panel id "stats").
 */
export function StatsPanel(): JSX.Element | null {
  const { activePanel, closePanel } = usePanelManager();
  const state = useGameBridge();

  // This panel is not directly mapped to a BottomNav tab yet; it could be
  // opened programmatically or via a sub-tab. For now it renders for the
  // "character" tab alongside CharacterPanel. We keep it as a separate
  // exportable component.
  if (activePanel !== "stats") {
    return null;
  }

  return (
    <PanelContainer title="Statistiques Detaillees" onClose={closePanel}>
      <div className="stats-panel">
        <table className="stats-panel__table">
          <thead>
            <tr>
              <th className="stats-panel__th">Stat</th>
              <th className="stats-panel__th">Base</th>
              <th className="stats-panel__th">Total</th>
              <th className="stats-panel__th">Bonus</th>
            </tr>
          </thead>
          <tbody>
            {state.stats.stats.map((s) => {
              const bonus = Math.round((s.computed - s.base) * 100) / 100;
              return (
                <tr key={s.id} className="stats-panel__row">
                  <td className="stats-panel__td stats-panel__td--label">{STAT_LABELS[s.id] ?? s.id}</td>
                  <td className="stats-panel__td">{String(Math.round(s.base * 100) / 100)}</td>
                  <td className="stats-panel__td stats-panel__td--computed">{String(Math.round(s.computed * 100) / 100)}</td>
                  <td className={`stats-panel__td${bonus > 0 ? " stats-panel__td--positive" : ""}${bonus < 0 ? " stats-panel__td--negative" : ""}`}>
                    {bonus > 0 ? `+${String(bonus)}` : String(bonus)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PanelContainer>
  );
}
