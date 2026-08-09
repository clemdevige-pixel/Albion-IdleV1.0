import { DashboardCard } from "./DashboardCard";
import type { DashboardPlayerModel } from "../dashboardModels";

interface DashboardPlayerCardProps {
  readonly player: DashboardPlayerModel;
}

export function DashboardPlayerCard({ player }: DashboardPlayerCardProps): JSX.Element {
  const healthPercent = player.maxHealth <= 0
    ? 0
    : Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));

  return (
    <DashboardCard
      title="Personnage"
      iconSrc="/assets/ui/nav-character.png"
      className="dashboard-card--player"
      meta={<span className="dashboard-status-badge">Actif</span>}
    >
      <div className="dashboard-player">
        <div className="dashboard-player__identity">
          <span className="dashboard-player__portrait" aria-hidden="true">
            <img src="/assets/ui/nav-character.png" alt="" draggable={false} />
          </span>
          <span>
            <small>Aventurier</small>
            <strong>Héros</strong>
          </span>
        </div>
        <div className="dashboard-player__ip">
          <span>Item Power</span>
          <strong>{String(player.itemPower)}</strong>
          <small>IP équipé</small>
        </div>
        <div className="dashboard-player__details">
          <div className="dashboard-player__health">
            <span>Points de vie</span>
            <strong>{String(Math.ceil(player.health))} / {String(Math.ceil(player.maxHealth))}</strong>
          </div>
          <div className="dashboard-progress" aria-label="Points de vie">
            <span style={{ width: `${String(healthPercent)}%` }} />
          </div>
          <dl className="dashboard-stat-grid">
            <div>
              <dt><span aria-hidden="true">⚔</span> Dégâts</dt>
              <dd>{String(Math.round(player.physicalDamage))} / {String(Math.round(player.magicalDamage))}</dd>
              <small>physique / magie</small>
            </div>
            <div>
              <dt><span aria-hidden="true">⬟</span> Défense</dt>
              <dd>{String(Math.round(player.armor))} / {String(Math.round(player.magicResistance))}</dd>
              <small>armure / magie</small>
            </div>
          </dl>
        </div>
      </div>
    </DashboardCard>
  );
}
