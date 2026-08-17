import { CurrencyDisplay } from "../../panels/CurrencyDisplay";
import { UI_MODULE_IDS, useNavigation } from "../navigation";
import { useActiveMasteryUiModel, useHeaderUiModel } from "../state";
import { NotificationPreferencesMenu } from "./NotificationPreferencesMenu";
import { SaveManagementMenu } from "./SaveManagementMenu";
import "./permanentShell.css";

function formatCompact(value: number): string {
  return Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function HeaderBar(): JSX.Element {
  const header = useHeaderUiModel();
  const activeMastery = useActiveMasteryUiModel();
  const navigation = useNavigation();

  return (
    <div className="permanent-header">
      <button
        type="button"
        className="permanent-header__brand"
        onClick={navigation.returnToDashboard}
        aria-label="Retourner au tableau de bord"
      >
        <span className="permanent-header__crest" aria-hidden="true">AI</span>
        <span>Albion <strong>Idle</strong></span>
      </button>

      <button
        type="button"
        className="permanent-header__player"
        onClick={() => { navigation.openModule(UI_MODULE_IDS.character); }}
        aria-label="Ouvrir le personnage"
      >
        <span className="permanent-header__portrait">
          <img src="/assets/ui/nav-character.png" alt="" draggable={false} />
        </span>
        <span className="permanent-header__player-copy">
          <strong>Adventurer</strong>
          <small><span aria-hidden="true">⚔</span> {String(header.itemPower)} IP</small>
        </span>
      </button>

      <button
        type="button"
        className="permanent-header__location"
        onClick={() => { navigation.openModule(UI_MODULE_IDS.masteries); }}
        aria-label="Ouvrir les maîtrises"
      >
        <span className="permanent-header__eyebrow">Maîtrise active</span>
        {activeMastery === null ? (
          <strong>Aucune maîtrise active</strong>
        ) : (
          <>
            <strong title={activeMastery.name}>
              <span aria-hidden="true">{activeMastery.icon}</span>{" "}
              {activeMastery.name} · Niv. {String(activeMastery.level)}
            </strong>
            <span className="permanent-header__segment-row">
              <span>{formatCompact(activeMastery.currentXp)} / {formatCompact(activeMastery.xpToNextLevel)} XP</span>
              <span>{Math.round(activeMastery.progressPercent)}%</span>
            </span>
            <span
              className="permanent-header__progress"
              role="progressbar"
              aria-label={`Progression ${activeMastery.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(activeMastery.progressPercent)}
            >
              <span style={{ width: `${String(activeMastery.progressPercent)}%` }} />
            </span>
          </>
        )}
      </button>

      <div className="permanent-header__economy" aria-label="Économie et progression">
        <div className="permanent-header__resource">
          <span className="permanent-header__resource-icon" aria-hidden="true">S</span>
          <span><small>Silver</small><CurrencyDisplay amount={header.silver} incomeRate={header.incomeRate} /></span>
        </div>
        <div className="permanent-header__resource permanent-header__resource--fame">
          <span className="permanent-header__resource-icon" aria-hidden="true">★</span>
          <span><small>Fame</small><strong>{formatCompact(header.totalFame)}</strong></span>
        </div>
      </div>

      <div className="permanent-header__actions">
        <NotificationPreferencesMenu />
        <SaveManagementMenu />
      </div>
    </div>
  );
}
