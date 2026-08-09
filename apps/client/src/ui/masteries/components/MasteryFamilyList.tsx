import type { MasteryFamilyModel } from "../masteryModels";

interface MasteryFamilyListProps {
  readonly families: readonly MasteryFamilyModel[];
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
}

export function MasteryFamilyList({ families, selectedId, onSelect }: MasteryFamilyListProps): JSX.Element {
  return (
    <nav className="ui-mastery-families" aria-label="Familles de maîtrises">
      {families.map((family) => (
        <button
          key={family.id}
          type="button"
          className={`ui-mastery-family${family.id === selectedId ? " is-selected" : ""}${family.isUnlocked ? "" : " is-locked"}`}
          onClick={() => { onSelect(family.id); }}
        >
          <span className="ui-mastery-family__icon" aria-hidden="true">{family.icon}</span>
          <span className="ui-mastery-family__body">
            <span className="ui-mastery-family__heading">
              <strong>{family.name}</strong>
              <b>Niv. {String(family.level)}</b>
            </span>
            <span className="ui-mastery-family__track">
              <span style={{ width: `${String(family.progressPercent)}%` }} />
            </span>
          </span>
        </button>
      ))}
    </nav>
  );
}
