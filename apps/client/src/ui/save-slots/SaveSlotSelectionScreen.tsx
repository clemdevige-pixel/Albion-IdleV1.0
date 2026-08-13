import { useEffect, useMemo, useState } from "react";
import { LocalSaveSlotCatalog } from "../../runtime/LocalSaveSlotCatalog";
import type { PlayerSaveSlotId } from "../../runtime/saveSlots";
import "./saveSlotSelection.css";

export function SaveSlotSelectionScreen({ onSelectSlot }: {
  readonly onSelectSlot: (slotId: PlayerSaveSlotId) => void;
}): JSX.Element {
  const catalog = useMemo(() => new LocalSaveSlotCatalog(), []);
  const [migrationError, setMigrationError] = useState<string | undefined>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    try {
      if (catalog.migrateLegacySaveToFirstSlot()) setRevision((value) => value + 1);
    } catch (error) {
      console.error("[Persistence] Legacy save migration failed:", error);
      setMigrationError("L'ancienne sauvegarde n'a pas pu être copiée. Elle a été conservée.");
    }
  }, [catalog]);

  const slots = useMemo(() => catalog.listSlots(), [catalog, revision]);
  const deleteSlot = (slotId: PlayerSaveSlotId, label: string): void => {
    if (!window.confirm(`Supprimer ${label} sur cet appareil ?`)) return;
    catalog.deleteSlot(slotId);
    setRevision((value) => value + 1);
  };

  return (
    <main className="save-slot-screen">
      <section className="save-slot-screen__panel" aria-labelledby="save-slot-title">
        <header className="save-slot-screen__header">
          <span className="save-slot-screen__crest" aria-hidden="true">AI</span>
          <div><p>Albion Idle</p><h1 id="save-slot-title">Choisir une partie</h1></div>
        </header>
        <div className="save-slot-screen__list">
          {slots.map((slot) => (
            <article key={slot.id} className={`save-slot-card${slot.hasSave ? " is-occupied" : ""}`}>
              <button type="button" className="save-slot-card__select" onClick={() => { onSelectSlot(slot.id); }}>
                <span className="save-slot-card__number">{String(slot.number)}</span>
                <span className="save-slot-card__copy">
                  <strong>{slot.label}</strong>
                  <small>{slot.hasSave ? "Continuer l'aventure" : "Commencer une nouvelle aventure"}</small>
                </span>
                <span className="save-slot-card__action">{slot.hasSave ? "Jouer" : "Créer"}</span>
              </button>
              {slot.hasSave ? (
                <button type="button" className="save-slot-card__delete" aria-label={`Supprimer ${slot.label}`} onClick={() => { deleteSlot(slot.id, slot.label); }}>
                  Supprimer
                </button>
              ) : null}
            </article>
          ))}
        </div>
        <footer className="save-slot-screen__footer">
          <p>Les parties sont sauvegardées localement dans ce navigateur.</p>
          {migrationError === undefined ? null : <p role="alert">{migrationError}</p>}
        </footer>
      </section>
    </main>
  );
}
