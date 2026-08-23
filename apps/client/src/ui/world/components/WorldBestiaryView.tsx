import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { GameBridgeState } from "../../../game/GameBridge.js";
import { useGameServices } from "../../../state/GameContext.js";
import { useGameUiSelector } from "../../state/useGameUiSelector.js";
import { ItemVisual, getItemDisplayName } from "../../../panels/ItemVisual";
import {
  BESTIARY_FACTIONS,
  WORLD_BANDS,
  WORLD_BESTIARY,
  getBestiaryContextIds,
  getBestiaryLoot,
  type BestiaryAbilityModel,
  type WorldBandId,
} from "../worldModels";
import "./WorldBestiaryView.css";

const CATEGORY_LABELS = {
  normal: "Normal",
  veteran: "Vétéran",
  elite: "Élite",
  boss: "Boss",
} as const;

interface TooltipState {
  readonly title: string;
  readonly lines: readonly string[];
  readonly left: number;
  readonly top: number;
}

function selectBestiaryRevision(state: GameBridgeState): number {
  return state.enemiesKilled;
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

function formatDamageType(damageType: string): string {
  if (damageType === "magical") return "Magiques";
  if (damageType === "true") return "Bruts";
  return "Physiques";
}

function getAbilityTooltipLines(ability: BestiaryAbilityModel): readonly string[] {
  return [
    `Dégâts : ${formatDamageType(ability.damageType)}`,
    `Puissance : ${String(Math.round(ability.damageMultiplier * 100))} %`,
    `Recharge : ${ability.cooldown.toLocaleString("fr-FR")} s`,
    `Interruptible : ${ability.interruptible ? "Oui" : "Non"}`,
  ];
}

export function WorldBestiaryView(): JSX.Element {
  const { getBestiaryKnowledge } = useGameServices();
  useGameUiSelector(selectBestiaryRevision);
  const [faction, setFaction] = useState("Toutes");
  const [bandId, setBandId] = useState<WorldBandId | "all">("all");
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | undefined>();
  const [tooltip, setTooltip] = useState<TooltipState | undefined>();

  const entries = useMemo(
    () => WORLD_BESTIARY.filter((entry) => {
      const matchesFaction = faction === "Toutes" || entry.faction === faction;
      const matchesBand = bandId === "all" || entry.bandIds.includes(bandId);
      return matchesFaction && matchesBand;
    }),
    [bandId, faction],
  );
  const bestiaryContextIds = getBestiaryContextIds(bandId);

  const showTooltip = (
    element: HTMLElement,
    title: string,
    lines: readonly string[],
  ): void => {
    const rect = element.getBoundingClientRect();
    setTooltip({
      title,
      lines,
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
          const knowledge = getBestiaryKnowledge(entry.id, bestiaryContextIds);
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
                  setTooltip(undefined);
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
                <dl className="world-creature__victories">
                  <div>
                    <dt>Victoires</dt>
                    <dd>{knowledge.killCount}</dd>
                  </div>
                </dl>
              </button>

              {isSelected && (
                <>
                  {knowledge.discovered && (
                    <section className="world-creature__combat" aria-label={`Combat contre ${entry.name}`}>
                      <header><small>Combat</small></header>
                      <div className="world-creature__combat-content">
                        <div className="world-creature__combat-stat">
                          <span>Type de dégâts</span>
                          <strong>{formatDamageType(entry.damageType)}</strong>
                        </div>
                        <div className="world-creature__abilities">
                          <span>Compétences</span>
                          {entry.abilities.length === 0
                            ? <strong>Aucune</strong>
                            : (
                              <div className="world-creature__ability-list">
                                {entry.abilities.map((ability) => (
                                  <button
                                    key={ability.id}
                                    type="button"
                                    className="world-creature__ability"
                                    onMouseEnter={(event) => {
                                      showTooltip(
                                        event.currentTarget,
                                        ability.name,
                                        getAbilityTooltipLines(ability),
                                      );
                                    }}
                                    onMouseLeave={() => { setTooltip(undefined); }}
                                    onFocus={(event) => {
                                      showTooltip(
                                        event.currentTarget,
                                        ability.name,
                                        getAbilityTooltipLines(ability),
                                      );
                                    }}
                                    onBlur={() => { setTooltip(undefined); }}
                                  >
                                    {ability.name} ⓘ
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    </section>
                  )}

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
                                  showTooltip(event.currentTarget, itemName, [`Taux : ${rate}`]);
                                }}
                                onMouseLeave={() => { setTooltip(undefined); }}
                                onFocus={(event) => {
                                  showTooltip(event.currentTarget, itemName, [`Taux : ${rate}`]);
                                }}
                                onBlur={() => { setTooltip(undefined); }}
                              >
                                <ItemVisual itemId={drop.itemId} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </section>
                </>
              )}
            </article>
          );
        })}
      </div>

      {tooltip !== undefined && createPortal(
        <div
          className="world-creature__tooltip--portal"
          role="tooltip"
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          <strong>{tooltip.title}</strong>
          {tooltip.lines.map((line) => <span key={line}>{line}</span>)}
        </div>,
        document.body,
      )}
    </div>
  );
}
