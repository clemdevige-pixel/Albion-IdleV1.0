import { useEffect, useMemo, useState } from "react";
import { CloudSaveClient } from "../../runtime/CloudSaveClient";
import { CloudSaveSynchronizer } from "../../runtime/CloudSaveSynchronizer";
import { LocalSaveSlotCatalog } from "../../runtime/LocalSaveSlotCatalog";
import type { PlayerSaveSlotId } from "../../runtime/saveSlots";
import "./saveSlotSelection.css";

export function SaveSlotSelectionScreen({
  accountId,
  accountName,
  authToken,
  onLogout,
  onSelectSlot,
}: {
  readonly accountId: string;
  readonly accountName: string;
  readonly authToken: string;
  readonly onLogout: () => void;
  readonly onSelectSlot: (slotId: PlayerSaveSlotId) => void;
}): JSX.Element {
  const catalog = useMemo(() => new LocalSaveSlotCatalog(accountId), [accountId]);
  const cloudClient = useMemo(() => new CloudSaveClient(authToken), [authToken]);
  const synchronizer = useMemo(
    () => new CloudSaveSynchronizer(accountId, cloudClient),
    [accountId, cloudClient],
  );
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | undefined>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const initialize = async (): Promise<void> => {
      try {
        catalog.migrateLocalSavesToAccount();
        await synchronizer.synchronizeAll();
      } catch (error) {
        console.error("[Persistence] Save synchronization failed:", error);
        if (!cancelled) {
          setSyncError("Le cloud est momentanément indisponible. Vos sauvegardes locales sont conservées.");
        }
      } finally {
        if (!cancelled) {
          setRevision((value) => value + 1);
          setSyncing(false);
        }
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [catalog, synchronizer]);

  const slots = useMemo(() => catalog.listSlots(), [catalog, revision]);
  const deleteSlot = async (slotId: PlayerSaveSlotId, label: string): Promise<void> => {
    if (!window.confirm(`Supprimer définitivement ${label}, localement et dans le cloud ?`)) return;
    try {
      await cloudClient.delete(slotId);
      catalog.deleteSlot(slotId);
      setRevision((value) => value + 1);
    } catch (error) {
      console.error("[Persistence] Cloud save deletion failed:", error);
      setSyncError("La suppression cloud a échoué. La partie a été conservée.");
    }
  };

  return (
    <main className="save-slot-screen">
      <section className="save-slot-screen__panel" aria-labelledby="save-slot-title">
        <header className="save-slot-screen__header">
          <span className="save-slot-screen__crest" aria-hidden="true">AI</span>
          <div><p>{accountName}</p><h1 id="save-slot-title">Choisir une partie</h1></div>
          <button type="button" className="save-slot-screen__logout" onClick={onLogout}>Déconnexion</button>
        </header>
        <div className="save-slot-screen__list" aria-busy={syncing}>
          {slots.map((slot) => (
            <article key={slot.id} className={`save-slot-card${slot.hasSave ? " is-occupied" : ""}`}>
              <button type="button" disabled={syncing} className="save-slot-card__select" onClick={() => { onSelectSlot(slot.id); }}>
                <span className="save-slot-card__number">{String(slot.number)}</span>
                <span className="save-slot-card__copy">
                  <strong>{slot.label}</strong>
                  <small>{syncing ? "Synchronisation…" : slot.hasSave ? "Continuer l'aventure" : "Commencer une nouvelle aventure"}</small>
                </span>
                <span className="save-slot-card__action">{slot.hasSave ? "Jouer" : "Créer"}</span>
              </button>
              {slot.hasSave && !syncing ? (
                <button type="button" className="save-slot-card__delete" aria-label={`Supprimer ${slot.label}`} onClick={() => { void deleteSlot(slot.id, slot.label); }}>
                  Supprimer
                </button>
              ) : null}
            </article>
          ))}
        </div>
        <footer className="save-slot-screen__footer">
          <p>{syncing
            ? "Synchronisation des parties…"
            : syncError === undefined
              ? "Sauvegardes protégées localement et synchronisées avec votre compte."
              : "Mode local actif · la synchronisation cloud sera retentée à la prochaine ouverture."}</p>
          {syncError === undefined ? null : <p role="alert">{syncError}</p>}
        </footer>
      </section>
    </main>
  );
}
