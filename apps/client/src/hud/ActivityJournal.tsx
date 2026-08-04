import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGameBridge } from "../state/GameContext";
import { classifyNotification } from "../state/notificationPreferences";

type JournalCategory = "combat" | "loot" | "general";
type JournalTab = "general" | "combat" | "loot";

interface JournalEntry {
  readonly id: string;
  readonly category: JournalCategory;
  readonly message: string;
  readonly timestamp: number;
  readonly tone: "neutral" | "positive" | "negative";
}

const MAX_HISTORY = 120;
const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function ActivityJournal(): JSX.Element {
  const state = useGameBridge();
  const [activeTab, setActiveTab] = useState<JournalTab>("general");
  const [entries, setEntries] = useState<readonly JournalEntry[]>([]);
  const seenDamageIds = useRef(new Set<number>());
  const seenNotificationIds = useRef(new Set<string>());
  const previousKills = useRef(state.enemiesKilled);
  const previousCombatState = useRef(state.combatState);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const additions: JournalEntry[] = [];

    for (const event of state.damageNumbers) {
      if (seenDamageIds.current.has(event.id)) continue;
      seenDamageIds.current.add(event.id);
      const amount = Math.max(0, Math.round(event.amount * 10) / 10);
      additions.push({
        id: `damage-${String(event.id)}`,
        category: "combat",
        message: event.target === "enemy"
          ? `Vous infligez ${String(amount)} degats a ${state.enemyName}.`
          : `${state.enemyName} vous inflige ${String(amount)} degats.`,
        timestamp: event.timestamp,
        tone: event.target === "enemy" ? "positive" : "negative",
      });
    }

    for (const notification of [...state.economyNotifications].reverse()) {
      if (seenNotificationIds.current.has(notification.id)) continue;
      seenNotificationIds.current.add(notification.id);
      const notificationCategory = classifyNotification(notification.message);
      additions.push({
        id: `notification-${notification.id}`,
        category: notificationCategory === "other" ? "general" : "loot",
        message: notification.message,
        timestamp: notification.timestamp,
        tone: notification.type === "error" ? "negative" : "positive",
      });
    }

    if (state.enemiesKilled > previousKills.current) {
      additions.push({
        id: `kill-${String(state.enemiesKilled)}-${String(Date.now())}`,
        category: "combat",
        message: "Ennemi vaincu.",
        timestamp: Date.now(),
        tone: "positive",
      });
    }
    previousKills.current = state.enemiesKilled;

    if (state.combatState !== previousCombatState.current) {
      if (state.combatState === "defeat") {
        additions.push({
          id: `defeat-${String(Date.now())}`,
          category: "combat",
          message: "Votre heros a ete vaincu.",
          timestamp: Date.now(),
          tone: "negative",
        });
      } else if (state.combatState === "victory") {
        additions.push({
          id: `victory-${String(Date.now())}`,
          category: "combat",
          message: "Combat remporte.",
          timestamp: Date.now(),
          tone: "positive",
        });
      }
      previousCombatState.current = state.combatState;
    }

    if (additions.length > 0) {
      additions.sort((left, right) => left.timestamp - right.timestamp);
      setEntries((current) => [...current, ...additions].slice(-MAX_HISTORY));
    }
  }, [
    state.combatState,
    state.damageNumbers,
    state.economyNotifications,
    state.enemiesKilled,
    state.enemyName,
  ]);

  const visibleEntries = useMemo(
    () => activeTab === "general"
      ? entries
      : entries.filter((entry) => entry.category === activeTab),
    [activeTab, entries],
  );
  const latestVisibleEntryId = visibleEntries.at(-1)?.id;

  useLayoutEffect(() => {
    const history = historyRef.current;
    if (history !== null) {
      history.scrollTop = history.scrollHeight;
    }
    historyEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeTab, latestVisibleEntryId, visibleEntries.length]);

  return (
    <section className="activity-journal" aria-label="Journal d'activite">
      <div className="activity-journal__tabs" role="tablist">
        {(["general", "combat", "loot"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? "is-active" : ""}
            onClick={() => { setActiveTab(tab); }}
          >
            {tab === "general" ? "General" : tab === "combat" ? "Combat" : "Butin"}
          </button>
        ))}
      </div>
      <div ref={historyRef} className="activity-journal__history" role="log" aria-live="polite">
        {visibleEntries.length === 0 ? (
          <div className="activity-journal__empty">Aucune activite enregistree.</div>
        ) : visibleEntries.map((entry) => (
          <div
            key={entry.id}
            className={`activity-journal__entry activity-journal__entry--${entry.tone}`}
          >
            <time>[{TIME_FORMATTER.format(entry.timestamp)}]</time>
            <span>{entry.message}</span>
          </div>
        ))}
        <div ref={historyEndRef} className="activity-journal__end" aria-hidden="true" />
      </div>
    </section>
  );
}
