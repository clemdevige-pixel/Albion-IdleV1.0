import type { CSSProperties } from "react";
import { useAuthSession } from "../../auth/AuthSessionContext";
import { resolveWeaponPresentation } from "../../data/weaponContentCatalog";
import { renderManifestRegistry } from "../../game/render/defaultRenderManifestRegistry";
import { UI_MODULE_IDS, useNavigation } from "../navigation";
import { useActiveMasteryUiModel, useHeaderUiModel } from "../state";
import { NotificationPreferencesMenu } from "./NotificationPreferencesMenu";
import { SaveManagementMenu } from "./SaveManagementMenu";
import "./permanentShell.css";
import "./HeaderBar.css";

function formatCompact(value: number): string {
  return Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function resolveHeroPortraitStyle(weaponItemId: string | null): CSSProperties {
  const actorManifestId = weaponItemId === null
    ? undefined
    : resolveWeaponPresentation(weaponItemId)?.actorManifestId;
  const actor = actorManifestId === undefined
    ? renderManifestRegistry.requireDefaultActor()
    : renderManifestRegistry.getActor(actorManifestId) ?? renderManifestRegistry.requireDefaultActor();
  const idle = actor.animations.idle;
  const frameCount = idle.endFrame - idle.startFrame + 1;
  const displayedFrameWidth = 122;
  const portraitSize = 50;
  const scale = displayedFrameWidth / idle.frameWidth;
  const displayedFrameHeight = idle.frameHeight * scale;
  const x = -((idle.startFrame * displayedFrameWidth) + ((displayedFrameWidth - portraitSize) / 2));
  const y = -(displayedFrameHeight * 0.07);

  return {
    backgroundImage: `url("${idle.assetPath}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${displayedFrameWidth * frameCount}px ${displayedFrameHeight}px`,
    backgroundPosition: `${x}px ${y}px`,
  };
}

export function HeaderBar(): JSX.Element {
  const { account } = useAuthSession();
  const header = useHeaderUiModel();
  const activeMastery = useActiveMasteryUiModel();
  const navigation = useNavigation();
  const portraitStyle = resolveHeroPortraitStyle(header.weaponItemId);

  return (
    <div className="permanent-header">
      <button
        type="button"
        className="permanent-header__brand"
        onClick={navigation.returnToDashboard}
        aria-label="Retourner au tableau de bord"
      >
        <img
          className="permanent-header__brand-logo"
          src="/assets/ui/albion_idle.png"
          alt="Albion Idle"
          draggable={false}
        />
      </button>

      <button
        type="button"
        className="permanent-header__player"
        onClick={() => { navigation.openModule(UI_MODULE_IDS.character); }}
        aria-label="Ouvrir le personnage"
      >
        <span className="permanent-header__portrait" aria-hidden="true">
          <span className="permanent-header__portrait-sprite" style={portraitStyle} />
        </span>
        <span className="permanent-header__player-copy">
          <strong>{account.displayName}</strong>
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
          <span className="permanent-header__resource-icon" aria-hidden="true">
            <img src="/assets/ui/ui-silver.png" alt="" draggable={false} />
          </span>
          <span className="permanent-header__resource-copy">
            <small>Silver</small>
            <strong>{formatCompact(header.silver)}</strong>
          </span>
        </div>
        <div className="permanent-header__resource permanent-header__resource--fame">
          <span className="permanent-header__resource-icon" aria-hidden="true">
            <img src="/assets/ui/ui-fame.png" alt="" draggable={false} />
          </span>
          <span className="permanent-header__resource-copy">
            <small>Fame</small>
            <strong>{formatCompact(header.totalFame)}</strong>
          </span>
        </div>
      </div>

      <div className="permanent-header__actions">
        <NotificationPreferencesMenu />
        <SaveManagementMenu />
      </div>
    </div>
  );
}
