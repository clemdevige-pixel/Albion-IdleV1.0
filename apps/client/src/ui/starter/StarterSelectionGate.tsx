import { useEffect, useState, type ReactNode } from "react";
import { getStarterWeaponOptions } from "../../data/starterLoadoutCatalog.js";
import { combatStopController } from "../../runtime/CombatStopController.js";
import { useGameServices } from "../../state/GameServicesContext.js";
import "./starterSelection.css";

export function StarterSelectionGate({ children }: { readonly children: ReactNode }): JSX.Element {
  const services = useGameServices();
  const [pending, setPending] = useState(() => services.needsStarterSelection());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pending) combatStopController.reset();
  }, [pending]);

  if (!pending) return <>{children}</>;

  const options = getStarterWeaponOptions();

  return (
    <main className="ui-starter" aria-label="Choix de l'arme de départ">
      <section className="ui-starter__panel">
        <header className="ui-starter__header">
          <span>NOUVEL AVENTURIER</span>
          <h1>Choisissez votre arme starter</h1>
          <p>Vous commencez uniquement avec l'arme T3 choisie. Les autres équipements devront être obtenus au cours de votre progression.</p>
        </header>

        <div className="ui-starter__weapons">
          {options.map((option) => (
            <button
              key={option.itemId}
              type="button"
              className="ui-starter__weapon"
              onClick={() => {
                setError(null);
                if (services.selectStarterWeapon(option.itemId)) {
                  setPending(false);
                } else {
                  setError("Impossible d'attribuer cette arme de départ.");
                }
              }}
            >
              <span className="ui-starter__weapon-icon">
                {option.itemIcon === undefined
                  ? <span aria-hidden="true">◆</span>
                  : <img src={`/assets/items/${option.itemIcon}`} alt="" />}
              </span>
              <strong>{option.label}</strong>
              <small>T3 · {option.handling === "one_handed" ? "1 main" : "2 mains"}</small>
            </button>
          ))}
        </div>

        <footer className="ui-starter__footer">
          <span>Seule l'arme sélectionnée est offerte au départ.</span>
          {error !== null && <strong role="alert">{error}</strong>}
        </footer>
      </section>
    </main>
  );
}
