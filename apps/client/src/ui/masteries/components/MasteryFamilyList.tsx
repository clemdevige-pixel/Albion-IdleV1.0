import type { MasteryCategoryId, MasteryFamilyModel, MasteryProgressModel } from "../masteryModels";
import { MasteryFamilyIcon } from "./MasteryFamilyIcon";
import { MasteryProgressBar } from "./MasteryProgressBar";

interface MasteryFamilyListProps {
  readonly category: MasteryCategoryId;
  readonly families: readonly MasteryFamilyModel[];
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
}

function BonusList({ bonuses }: { readonly bonuses: readonly string[] }): JSX.Element {
  return <ul className="ui-mastery-bonuses">{bonuses.map((bonus) => <li key={bonus}>{bonus}</li>)}</ul>;
}

function iconSource(iconAsset: string): string {
  return iconAsset.startsWith("/") ? iconAsset : `/assets/items/${iconAsset}`;
}

function ChildMasteryRow({
  mastery,
  fallbackIconAsset,
}: {
  readonly mastery: MasteryProgressModel;
  readonly fallbackIconAsset?: string;
}): JSX.Element {
  const iconAsset = mastery.iconAsset ?? fallbackIconAsset;

  return (
    <article className={`ui-mastery-specialization${mastery.isUnlocked ? "" : " is-locked"}`}>
      <div className="ui-mastery-specialization__heading">
        <div className="ui-mastery-specialization__identity">
          {iconAsset !== undefined && (
            <img
              className="ui-mastery-specialization__icon"
              src={iconSource(iconAsset)}
              alt=""
              aria-hidden="true"
            />
          )}
          <div className="ui-mastery-specialization__copy">
            <h4>{mastery.name}</h4>
            {mastery.subtitle !== undefined && <small>{mastery.subtitle}</small>}
          </div>
        </div>
        <strong>Niv. {String(mastery.level)}</strong>
      </div>
      <MasteryProgressBar mastery={mastery} />
      <BonusList bonuses={mastery.bonuses} />
    </article>
  );
}

export function MasteryFamilyList({ category, families, selectedId, onSelect }: MasteryFamilyListProps): JSX.Element {
  const childLabel = category === "gathering" ? "Travailleurs" : "Spécialisations";
  const emptyChildLabel = category === "gathering"
    ? "Aucun travailleur disponible"
    : "Aucune spécialisation disponible";

  return (
    <div className="ui-mastery-families" role="list" aria-label="Familles de maîtrises">
      {families.map((family) => {
        const expanded = family.id === selectedId;
        const detailsId = `mastery-family-${family.id}`;
        return (
          <section key={family.id} className={`ui-mastery-family-group${expanded ? " is-expanded" : ""}${family.isUnlocked ? "" : " is-locked"}`} role="listitem">
            <button
              type="button"
              className="ui-mastery-family"
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={() => { onSelect(family.id); }}
            >
              <MasteryFamilyIcon family={family} className="ui-mastery-family__icon" />
              <span className="ui-mastery-family__body">
                <span className="ui-mastery-family__heading">
                  <strong>{family.name}</strong>
                  <b>Niv. {String(family.level)}</b>
                </span>
                <span className="ui-mastery-family__track">
                  <span style={{ width: `${String(family.progressPercent)}%` }} />
                </span>
                <span className="ui-mastery-family__meta">
                  <span>{String(family.currentXp)} / {String(family.xpToNextLevel)} XP</span>
                  <span>{family.bonuses[0] ?? ""}</span>
                </span>
              </span>
              <span className="ui-mastery-family__chevron" aria-hidden="true">›</span>
            </button>

            {expanded && (
              <div id={detailsId} className="ui-mastery-family__expanded">
                <div className="ui-mastery-family__bonus-row">
                  <BonusList bonuses={family.bonuses} />
                </div>
                {category !== "faction" && (
                  <>
                    <div className="ui-mastery-family__section-title">
                      {family.specializations.length > 0 ? childLabel : emptyChildLabel}
                    </div>
                    {family.specializations.length > 0 && (
                      <div className="ui-mastery-specializations" aria-label={childLabel}>
                        {family.specializations.map((entry) => (
                          <ChildMasteryRow
                            key={entry.id}
                            mastery={entry}
                            fallbackIconAsset={category === "combat" ? family.iconAsset : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
