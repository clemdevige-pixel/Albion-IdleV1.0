import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { createGame } from "./createGame";
import { useGameServices } from "../state/GameContext";
import { useAuthSession } from "../auth/AuthSessionContext";

/**
 * React <-> Phaser bridge.
 *
 * React owns the DOM container; Phaser owns everything inside the canvas. The
 * component creates the game on mount and destroys it on unmount, so no Phaser
 * instance leaks across React re-renders. React never reaches into the scene.
 */
export function PhaserGame(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const { bridge } = useGameServices();
  const { account } = useAuthSession();

  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }

    const container = containerRef.current;
    const game = createGame(container, bridge, account.displayName);
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      container.replaceChildren();
    };
  }, [bridge, account.displayName]);

  return <div className="phaser-container" ref={containerRef} />;
}
