import { useEffect, useState, useCallback } from "react";
import { useGameServices } from "./GameContext";

/**
 * Hook pattern for subscribing to game state changes via EventBus.
 * Subscribes on mount, unsubscribes on unmount, triggers React re-renders.
 *
 * @param eventName - The event to listen for
 * @param initialValue - Initial state value before any event fires
 * @param transform - Extracts state from the event payload
 */
export function useGameState<T>(
  eventName: string,
  initialValue: T,
  transform: (payload: unknown) => T,
): T {
  const { eventBus } = useGameServices();
  const [state, setState] = useState<T>(initialValue);

  const handler = useCallback(
    (payload: unknown) => {
      setState(transform(payload));
    },
    [transform],
  );

  useEffect(() => {
    const unsub = eventBus.subscribe(eventName, handler);
    return unsub;
  }, [eventBus, eventName, handler]);

  return state;
}
