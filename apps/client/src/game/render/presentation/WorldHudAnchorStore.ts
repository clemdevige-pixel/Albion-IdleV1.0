export type WorldHudActorId = "player" | "enemy";

export interface WorldHudAnchor {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
}

export interface WorldHudAnchorSnapshot {
  readonly player: WorldHudAnchor;
  readonly enemy: WorldHudAnchor;
}

type Listener = () => void;

const HIDDEN_ANCHOR: WorldHudAnchor = Object.freeze({ x: 0, y: 0, visible: false });

let snapshot: WorldHudAnchorSnapshot = Object.freeze({
  player: HIDDEN_ANCHOR,
  enemy: HIDDEN_ANCHOR,
});

const listeners = new Set<Listener>();

function publish(next: WorldHudAnchorSnapshot): void {
  snapshot = Object.freeze(next);
  for (const listener of listeners) listener();
}

export const worldHudAnchorStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },

  getSnapshot(): WorldHudAnchorSnapshot {
    return snapshot;
  },

  setAnchor(actorId: WorldHudActorId, anchor: WorldHudAnchor): void {
    const current = snapshot[actorId];
    if (
      current.x === anchor.x
      && current.y === anchor.y
      && current.visible === anchor.visible
    ) return;

    publish({
      ...snapshot,
      [actorId]: Object.freeze({ ...anchor }),
    });
  },

  setVisible(actorId: WorldHudActorId, visible: boolean): void {
    const current = snapshot[actorId];
    if (current.visible === visible) return;
    this.setAnchor(actorId, { ...current, visible });
  },

  reset(): void {
    publish({ player: HIDDEN_ANCHOR, enemy: HIDDEN_ANCHOR });
  },
} as const;
