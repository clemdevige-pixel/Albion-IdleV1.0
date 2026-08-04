import { useState } from "react";
import { CurrencyDisplay } from "../panels/CurrencyDisplay";
import { useGameBridge } from "../state/GameContext";
import {
  updateNotificationPreferences,
  useNotificationPreferences,
} from "../state/notificationPreferences";

export function TopBar(): JSX.Element {
  const state = useGameBridge();
  const preferences = useNotificationPreferences();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const options = [
    ["loot", "Butin et objets"],
    ["silver", "Argent"],
    ["fame", "Fame et maîtrises"],
    ["other", "Messages système"],
  ] as const;

  return (
    <header className="topbar">
      <div className="topbar__logo">Albion IDLE</div>

      <div className="topbar__player">
        <div className="topbar__avatar" />
        <div className="topbar__player-info">
          <span className="topbar__player-name">Adventurer</span>
          <span className="topbar__player-level">
            {state.world.biomeName !== "" ? state.world.biomeName : "—"}
          </span>
          <div className="topbar__xp-bar">
            <div
              className="topbar__xp-fill"
              style={{ width: `${String(state.world.zoneProgress)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="topbar__currency">
        <CurrencyDisplay
          amount={state.wallet.silver}
          incomeRate={state.wallet.incomeRate}
        />
      </div>

      <div className="topbar__actions">
        <div className="notification-settings">
          <button
            className={`topbar__icon-btn${preferences.enabled ? "" : " is-muted"}`}
            aria-label="Gérer les notifications"
            aria-expanded={notificationsOpen}
            type="button"
            onClick={() => { setNotificationsOpen((open) => !open); }}
          >
            🔔
          </button>

          {notificationsOpen ? (
            <div className="notification-settings__menu">
              <div className="notification-settings__header">
                <strong>Notifications</strong>
                <button
                  type="button"
                  onClick={() => {
                    updateNotificationPreferences({ enabled: !preferences.enabled });
                  }}
                >
                  {preferences.enabled ? "Tout couper" : "Tout activer"}
                </button>
              </div>

              {options.map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    disabled={!preferences.enabled}
                    onChange={(event) => {
                      updateNotificationPreferences({ [key]: event.target.checked });
                    }}
                  />
                </label>
              ))}
              <small>Les choix sont conservés sur cet appareil.</small>
            </div>
          ) : null}
        </div>

        <button className="topbar__icon-btn" aria-label="Paramètres" type="button">
          ⚙️
        </button>
      </div>
    </header>
  );
}
