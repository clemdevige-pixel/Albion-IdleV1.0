import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ItemVisual, getItemDisplayName } from "../../../panels/ItemVisual";
import {
  BESTIARY_FACTIONS,
  WORLD_BANDS,
  WORLD_BESTIARY,
  getBestiaryLoot,
  type WorldBandId,
} from "../worldModels";
import "./WorldBestiaryView.css";

const CATEGORY_LABELS = {
  normal: "Normal",
  veteran: "Vétéran",
  elite: "Élite",
  boss: "Boss",
} as const;

interface LootTooltipState {
  readonly itemName: string;
  readonly rate: string;
  readonly left: number;
  readonly top: number;
}

function formatDropPercent(value: number): string {
  const percent = value * 100;
  return `${percent.toLocaleString("fr-FR", {
    minimumFractionDigits: percent < 1 ? 2 : percent < 10 ? 1 : 0,
    maximumFractionDigits: 2,
  })} %`;
}

function formatDropRange(minimum: number, maximum: number): string {
  if (Math.abs(maximum - minimum) < 0.000001) return formatDropPercent(minimum);
  return `${formatDropPercent(minimum)} – ${formatDropPercent(maximum)}`;
}

export function WorldBestiaryView(): JSX.Element {
  const [faction, setFaction] = useState("Toutes");
  const [bandId, setBandId] = useState<WorldBandId | "all">("all");
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | undefined>();
  const [lootTooltip, setLootTooltip] = useState<LootTooltipState | undefined>();

  const entries = useMemo(
    () => WORLD_BESTIARY.filter((entry) => {
      const matchesFaction = faction === "Toutes" || entry.faction === faction;
      const matchesBand = bandId === "all" || entry.bandIds.includes(bandId);
      return matchesFaction && matchesBand;
    }),
    [bandId, faction],
  );

  const showLootTooltip = (
    element: HTMLElement,
    itemName: string,
    rate: string,
  ): void => {
    const rect = element.getBoundingClientRect();
    setLootTooltip({
      itemName,
      rate,
      left: rect.left + rect.width / 2,
      top: rect.top - 7,
    });
  };

  return (
    <div className="world-bestiary">
      <div className="world-bestiary__filter-group">
        <small>Faction</small>
        <div className="world-bestiary__filters" aria-label="Filtrer le bestiaire par faction">
          {BESTIARY_FACTIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={value === faction ? "is-active" : ""}
              onClick={() => { setFaction(value); }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="world-bestiary__filter-group">
        <small>Zone</small>
        <div className="world-bestiary__filters" aria-label="Filtrer le bestiaire par zone">
          <button
            type="button"
            className={bandId === "all" ? "is-active" : ""}
            onClick={() => { setBandId("all"); }}
          >
            Toutes
          </button>
          {WORLD_BANDS.map((band) => (
            <button
              key={band.id}
              type="button"
              className={bandId === band.id ? "is-active" : ""}
              onClick={() => { setBandId(band.id); }}
            >
              {band.label}
            </button>
          ))}
        </div>
      </div>

      <p className="world-bestiary__count">{entries.length} créatures référencées</p>
      <div className="world-bestiary__grid">
        {entries.map((entry) => {
          const isSelected = selectedMonsterId === entry.id;
          const loot = getBestiaryLoot(entry, bandId);
          return (
            <article
              key={entry.id}
              className={`world-creature world-creature--${entry.category}${isSelected ? " is-selected" : ""}`}
            >
              <button
                type="button"
                className="world-creature__summary"
                aria-expanded={isSelected}
                onClick={() => {
                  setSelectedMonsterId(isSelected ? undefined : entry.id);
                  setLootTooltip(undefined);
                }}
              >
                <div className="world-creature__portrait">
                  {entry.imageSrc !== undefined
                    ? <img src={entry.imageSrc} alt="" draggable={false} />
                    : <span>?</span>}
                </div>
                <div className="world-creature__identity">
                  <small>{entry.faction}</small>
                  <strong>{entry.name}</strong>
                  <span>T{entry.tier} · {CATEGORY_LABELS[entry.category]}</span>
                </div>
                <dl>
                  <div>
                    <dt>Dégâts</dt>
                    <dd>{entry.damageType === "magical" ? "Magiques" : "Physiques"}</dd>
                  </div>
                  <div>
                    <dt>Compétences</dt>
                    <dd>{entry.abilityCount}</dd>
                  </div>
                </dl>
              </button>

              {isSelected && (
                <section className="world-creature__loot" aria-label={`Table de loot de ${entry.name}`}>
                  <header>
                    <small>Table de loot</small>
                    <span>{bandId === "all" ? "Toutes zones" : WORLD_BANDS.find((band) => band.id === bandId)?.label}</span>
                  </header>
                  {loot.length === 0
                    ? <p>Aucun drop référencé dans cette zone.</p>
                    : (
                      <div className="world-creature__loot-grid">
                        {loot.map((drop) => {
                          const itemName = getItemDisplayName(drop.itemId);
                          const rate = formatDropRange(
                            drop.minimumExpectedQuantity,
                            drop.maximumExpectedQuantity,
                          );
                          return (
                            <div
                              key={`${drop.kind}:${drop.itemId}`}
                              className="world-creature__loot-item"
                              tabIndex={0}
                              aria-label={`${itemName} · ${rate}`}
                              onMouseEnter={(event) => {
                                showLootTooltip(event.currentTarget, itemName, rate);
                              }}
                              onMouseLeave={() => { setLootTooltip(undefined); }}
                              onFocus={(event) => {
                                showLootTooltip(event.currentTarget, itemName, rate);
                              }}
                              onBlur={() => { setLootTooltip(undefined); }}
                            >
                              <ItemVisual itemId={drop.itemId} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                </section>
              )}
            </article>
          );
        })}
      </div>

      {lootTooltip !== undefined && createPortal(
        <div
          className="world-creature__loot-tooltip world-creature__loot-tooltip--portal"
          role="tooltip"
          style={{ left: lootTooltip.left, top: lootTooltip.top }}
        >
          <strong>{lootTooltip.itemName}</strong>
          <span>Taux : {lootTooltip.rate}</span>
        </div>,
        document.body,
      )}
    </div>
  );
}
