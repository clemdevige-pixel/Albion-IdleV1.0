import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { resolveAbilityIconPath } from "../../../data/abilityIconPresentation";
import type { WeaponAbilityUnlock } from "../../../data/weaponContentCatalog";
import type { MasteryCategoryId, MasteryFamilyModel, MasteryProgressModel } from "../masteryModels";
import { getWeaponAbilityUnlocksForMastery } from "../weaponAbilityModels";
import { MasteryFamilyIcon } from "./MasteryFamilyIcon";
import { MasteryProgressBar } from "./MasteryProgressBar";

interface MasteryFamilyListProps {
  readonly category: MasteryCategoryId;
  readonly families: readonly MasteryFamilyModel[];
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
}

interface AbilityTooltipPosition {
  readonly left: number;
  readonly top: number;
}

function BonusList({ bonuses }: { readonly bonuses: readonly string[] }): JSX.Element {
  return <ul className="ui-mastery-bonuses">{bonuses.map((bonus) => <li key={bonus}>{bonus}</li>)}</ul>;
}

function iconSource(iconAsset: string): string {
  return iconAsset.startsWith("/") ? iconAsset : `/assets/items/${iconAsset}`;
}

function AbilityIcon({
  unlock,
  masteryLevel,
}: {
  readonly unlock: WeaponAbilityUnlock;
  readonly masteryLevel: number;
}): JSX.Element {
  const locked = masteryLevel < unlock.unlockMasteryLevel;
  const sourceLabel = unlock.source === "specialization" ? "Spécialisation" : "Famille";
  const anchorRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<AbilityTooltipPosition | null>(null);

  const showTooltip = (): void => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect === undefined) return;
    const halfTooltipWidth = 120;
    const viewportPadding = 8;
    const left = Math.max(
      halfTooltipWidth + viewportPadding,
      Math.min(window.innerWidth - halfTooltipWidth - viewportPadding, rect.left + rect.width / 2),
    );
    setTooltipPosition({ left, top: rect.top - 8 });
  };

  const hideTooltip = (): void => {
    setTooltipPosition(null);
  };

  return (
    <>
      <div
        ref={anchorRef}
        className={`ui-mastery-ability${locked ? " is-locked" : ""}`}
        tabIndex={0}
        aria-label={`${unlock.ability.name}, niveau ${String(unlock.unlockMasteryLevel)}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        <img src={resolveAbilityIconPath(unlock.ability.id)} alt="" />
        <span className="ui-mastery-ability__level">{String(unlock.unlockMasteryLevel)}</span>
      </div>
      {tooltipPosition !== null && createPortal(
        <div
          className="ui-mastery-ability__tooltip"
          role="tooltip"
          style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
        >
          <strong>{unlock.ability.name}</strong>
          <small>{sourceLabel} · Niv. {String(unlock.unlockMasteryLevel)}</small>
          <p>{unlock.ability.description}</p>
          <span>Recharge : {String(unlock.ability.cooldown)} s</span>
        </div>,
        document.body,
      )}
    </>
  );
}

function WeaponAbilityMenu({ mastery }: { readonly mastery: MasteryProgressModel }): JSX.Element | null {
  const unlocks = getWeaponAbilityUnlocksForMastery(mastery.id);
  if (unlocks.length === 0) return null;

  return (
    <div className="ui-mastery-ability-menu">
      <div className="ui-mastery-ability-menu__title">
        <span>Compétences</span>
        <small>Survoler pour les détails</small>
      </div>
      <div className="ui-mastery-ability-menu__icons">
        {unlocks.map((unlock) => (
          <AbilityIcon key={unlock.ability.id} unlock={unlock} masteryLevel={mastery.level} />
        ))}
      </div>
    </div>
  );
}

function ChildMasteryRow({
  mastery,
  fallbackIconAsset,
  showAbilityInfo,
}: {
  readonly mastery: MasteryProgressModel;
  readonly fallbackIconAsset: string | undefined;
  readonly showAbilityInfo: boolean;
}): JSX.Element {
  const iconAsset = mastery.iconAsset ?? fallbackIconAsset;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const abilityUnlocks = showAbilityInfo ? getWeaponAbilityUnlocksForMastery(mastery.id) : [];
  const canShowDetails = mastery.bonuses.length > 0 || abilityUnlocks.length > 0;

  return (
    <article className={`ui-mastery-specialization${mastery.isUnlocked ? "" : " is-locked"}`}>
      <div className="ui-mastery-specialization__visual" aria-hidden="true">
        {iconAsset !== undefined && (
          <img
            className="ui-mastery-specialization__icon"
            src={iconSource(iconAsset)}
            alt=""
          />
        )}
      </div>
      <div className="ui-mastery-specialization__content">
        <div className="ui-mastery-specialization__heading">
          <div className="ui-mastery-specialization__copy">
            <h4>{mastery.name}</h4>
            {mastery.subtitle !== undefined && <small>{mastery.subtitle}</small>}
          </div>
          <div className="ui-mastery-specialization__actions">
            {canShowDetails && (
              <button
                type="button"
                className={`ui-mastery-specialization__info${detailsOpen ? " is-active" : ""}`}
                aria-label={`Voir les détails de ${mastery.name}`}
                aria-expanded={detailsOpen}
                onClick={() => { setDetailsOpen((current) => !current); }}
              >
                i
              </button>
            )}
            <strong>Niv. {String(mastery.level)}</strong>
          </div>
        </div>
        <MasteryProgressBar mastery={mastery} />
        {detailsOpen && mastery.bonuses.length > 0 && <BonusList bonuses={mastery.bonuses} />}
        {detailsOpen && showAbilityInfo && <WeaponAbilityMenu mastery={mastery} />}
      </div>
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
                            showAbilityInfo={category === "combat"}
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
