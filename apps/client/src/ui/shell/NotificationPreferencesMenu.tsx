import { useState } from "react";
import {
  updateNotificationPreferences,
  useNotificationPreferences,
} from "../../state/notificationPreferences";

const OPTIONS = [
  ["loot", "Butin et objets"],
  ["silver", "Argent"],
  ["fame", "Fame et maîtrises"],
  ["other", "Messages système"],
] as const;

export function NotificationPreferencesMenu(): JSX.Element {
  const preferences = useNotificationPreferences();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="permanent-header__notification-settings">
      <button
        type="button"
        className={`permanent-header__action${preferences.enabled ? "" : " is-muted"}`}
        aria-label="Gérer les notifications"
        aria-expanded={isOpen}
        onClick={() => { setIsOpen((open) => !open); }}
      >
        <span aria-hidden="true">🔔</span>
      </button>
      {isOpen ? (
        <div className="permanent-header__notification-menu">
          <div className="permanent-header__notification-title">
            <strong>Notifications</strong>
            <button
              type="button"
              onClick={() => { updateNotificationPreferences({ enabled: !preferences.enabled }); }}
            >
              {preferences.enabled ? "Tout couper" : "Tout activer"}
            </button>
          </div>
          {OPTIONS.map(([key, label]) => (
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
          <small>Préférences conservées sur cet appareil.</small>
        </div>
      ) : null}
    </div>
  );
}
