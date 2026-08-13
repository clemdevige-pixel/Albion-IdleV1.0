import { useRef, useState, type ChangeEvent } from "react";
import { useGameServices } from "../../state/GameContext";
import { useSaveSlotSession } from "../../state/SaveSlotSessionContext";
import { getSaveSlotNumber } from "../../runtime/saveSlots";

function downloadSave(raw: string): void {
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `albion-idle-save-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SaveManagementMenu(): JSX.Element {
  const { exportSave, importSave, saveGame } = useGameServices();
  const { activeSlotId, returnToSlotSelection } = useSaveSlotSession();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExport = (): void => {
    try {
      downloadSave(exportSave());
      setStatus("Sauvegarde exportée.");
    } catch (error) {
      console.error("[Persistence] Save export failed:", error);
      setStatus("Export impossible.");
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) return;
    if (!window.confirm("Remplacer la sauvegarde actuelle par ce fichier ?")) return;

    try {
      const imported = importSave(await file.text());
      setStatus(imported
        ? "Sauvegarde importée."
        : "Fichier invalide. Sauvegarde actuelle conservée.");
    } catch (error) {
      console.error("[Persistence] Save file could not be read:", error);
      setStatus("Lecture du fichier impossible.");
    }
  };

  const handleChangeSlot = (): void => {
    if (!window.confirm("Sauvegarder et retourner au choix de partie ?")) return;
    try {
      saveGame();
      returnToSlotSelection();
    } catch (error) {
      console.error("[Persistence] Could not save before leaving slot:", error);
      setStatus("Sauvegarde impossible. Changement de partie annulé.");
    }
  };

  return (
    <div className="permanent-header__save-settings">
      <button
        type="button"
        className="permanent-header__action"
        aria-label="Gérer la sauvegarde"
        aria-expanded={isOpen}
        onClick={() => { setIsOpen((open) => !open); }}
      >
        <span aria-hidden="true">⚙</span>
      </button>
      {isOpen ? (
        <div className="permanent-header__save-menu">
          <strong>Sauvegarde · Partie {String(getSaveSlotNumber(activeSlotId))}</strong>
          <p>Conservez une copie locale, restaurez-la ou changez de partie.</p>
          <button type="button" onClick={handleExport}>Exporter</button>
          <button type="button" onClick={() => { inputRef.current?.click(); }}>
            Importer
          </button>
          <button type="button" onClick={handleChangeSlot}>Changer de partie</button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => { void handleImport(event); }}
          />
          {status === undefined ? null : <small role="status">{status}</small>}
        </div>
      ) : null}
    </div>
  );
}
