import { useSyncExternalStore } from "react";

export type NotificationCategory = "loot" | "silver" | "fame" | "other";

export interface NotificationPreferences {
  readonly enabled: boolean;
  readonly loot: boolean;
  readonly silver: boolean;
  readonly fame: boolean;
  readonly other: boolean;
}

const STORAGE_KEY = "albion-idle.notification-preferences.v1";
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  loot: true,
  silver: true,
  fame: true,
  other: true,
};

const listeners = new Set<() => void>();

function loadPreferences(): NotificationPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_PREFERENCES;
    }
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) as Partial<NotificationPreferences> };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

let preferences = loadPreferences();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): NotificationPreferences {
  return preferences;
}

export function useNotificationPreferences(): NotificationPreferences {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): void {
  preferences = { ...preferences, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences remain active for the current session.
  }
  for (const listener of listeners) {
    listener();
  }
}

export function classifyNotification(message: string): NotificationCategory {
  const normalized = message.toLocaleLowerCase();
  if (normalized.includes("fame")) {
    return "fame";
  }
  if (normalized.includes("silver") || normalized.includes("argent")) {
    return "silver";
  }
  if (
    normalized.includes("loot")
    || normalized.includes("potion")
    || normalized.includes("item")
    || normalized.includes("objet")
  ) {
    return "loot";
  }
  return "other";
}
