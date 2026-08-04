import { useCallback, useEffect, useRef } from "react";
import { useGameBridge, useGameServices } from "../state/GameContext";
import {
  classifyNotification,
  useNotificationPreferences,
} from "../state/notificationPreferences";

const MAX_VISIBLE_NOTIFICATIONS = 2;
const NOTIFICATION_DURATION_MS = 1800;

/**
 * Short-lived notifications. The persistent history is handled separately by
 * ActivityJournal and never depends on these entries remaining visible.
 */
export function EconomyNotifications(): JSX.Element | null {
  const state = useGameBridge();
  const { bridge } = useGameServices();
  const preferences = useNotificationPreferences();

  const dismissTimers = useRef(new Map<string, number>());

  const dismiss = useCallback(
    (id: string) => {
      bridge.dismissEconomyNotification(id);

      const timer = dismissTimers.current.get(id);

      if (timer !== undefined) {
        clearTimeout(timer);
        dismissTimers.current.delete(id);
      }
    },
    [bridge],
  );

  useEffect(() => {
    const currentTimers = dismissTimers.current;
    const activeIds = new Set(
      state.economyNotifications.map((notification) => notification.id),
    );

    for (const notification of state.economyNotifications) {
      if (currentTimers.has(notification.id)) {
        continue;
      }

      const timer = window.setTimeout(() => {
        dismiss(notification.id);
      }, NOTIFICATION_DURATION_MS);

      currentTimers.set(notification.id, timer);
    }

    for (const [id, timer] of currentTimers) {
      if (activeIds.has(id)) {
        continue;
      }

      clearTimeout(timer);
      currentTimers.delete(id);
    }
  }, [state.economyNotifications, dismiss]);

  useEffect(() => {
    const currentTimers = dismissTimers.current;

    return () => {
      for (const timer of currentTimers.values()) {
        clearTimeout(timer);
      }

      currentTimers.clear();
    };
  }, []);

  if (state.economyNotifications.length === 0) {
    return null;
  }

  const visibleNotifications = state.economyNotifications
    .filter((notification) => {
      if (!preferences.enabled) {
        return false;
      }
      return preferences[classifyNotification(notification.message)];
    })
    .slice(-MAX_VISIBLE_NOTIFICATIONS);

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-toasts">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-toast notification-toast--${notification.type}`}
          onClick={() => {
            dismiss(notification.id);
          }}
          role="status"
        >
          <span className="notification-toast__icon">
            {notification.type === "success" ? "✔" : "✖"}
          </span>

          <span className="notification-toast__message">
            {notification.message}
          </span>
        </div>
      ))}
    </div>
  );
}
