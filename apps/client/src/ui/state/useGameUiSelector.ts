import { useCallback, useRef, useSyncExternalStore } from "react";
import type { GameBridgeState } from "../../game/GameBridge";
import { useGameServices } from "../../state/GameContext";

export type UiSelector<T> = (state: GameBridgeState) => T;
export type UiEqualityFn<T> = (previous: T, next: T) => boolean;

interface SelectionCache<T> {
  readonly snapshot: GameBridgeState;
  readonly selection: T;
}

/**
 * Subscribes a UI component to one projection of the bridge state.
 * Gameplay remains authoritative; this hook only adapts read access for React.
 */
export function useGameUiSelector<T>(
  selector: UiSelector<T>,
  isEqual: UiEqualityFn<T> = Object.is,
): T {
  const { bridge } = useGameServices();
  const cache = useRef<SelectionCache<T> | undefined>(undefined);

  const getSelectedSnapshot = useCallback((): T => {
    const snapshot = bridge.getSnapshot();
    const previous = cache.current;

    if (previous?.snapshot === snapshot) {
      return previous.selection;
    }

    const nextSelection = selector(snapshot);
    const stableSelection =
      previous !== undefined && isEqual(previous.selection, nextSelection)
        ? previous.selection
        : nextSelection;

    cache.current = { snapshot, selection: stableSelection };
    return stableSelection;
  }, [bridge, isEqual, selector]);

  return useSyncExternalStore(bridge.subscribe, getSelectedSnapshot, getSelectedSnapshot);
}

export function shallowEqual<T>(previous: T, next: T): boolean {
  if (Object.is(previous, next)) return true;

  if (
    previous === null
    || next === null
    || typeof previous !== "object"
    || typeof next !== "object"
  ) {
    return false;
  }

  const previousRecord = previous as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const previousKeys = Object.keys(previousRecord);
  const nextKeys = Object.keys(nextRecord);
  if (previousKeys.length !== nextKeys.length) return false;

  return previousKeys.every((key) => Object.is(previousRecord[key], nextRecord[key]));
}
