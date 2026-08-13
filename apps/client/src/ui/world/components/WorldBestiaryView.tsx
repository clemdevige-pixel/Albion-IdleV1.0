import { useMemo, useState } from "react";
import { WORLD_BESTIARY } from "../worldModels";

const FACTIONS = ["Toutes", "Keeper", "Morgana", "Heretic", "Undead"] as const;
const CATEGORY_LABELS = { normal: "Normal", veteran: "Vétéran", elite: "Élite", boss: "Boss" } as const;

export function WorldBestiaryView(): JSX.Element {
  const [faction, setFaction] = useState<(typeof FACTIONS)[number]>("Toutes");
  const entries = useMemo(() => faction === "Toutes" ? WORLD_BESTIARY : WORLD_BESTIARY.filter((entry) => entry.faction === faction), [faction]);

  return (
    <div className="world-bestiary">
      <div className="world-bestiary__filters" aria-label="Filtrer le bestiaire par faction">
        {FACTIONS.map((value) => <button key={value} type="button" className={value === faction ? "is-active" : ""} onClick={() => { setFaction(value); }}>{value}</button>)}
      </div>
      <p className="world-bestiary__count">{entries.length} créatures référencées</p>
      <div className="world-bestiary__grid">
        {entries.map((entry) => (
          <article key={entry.id} className={`world-creature world-creature--${entry.category}`}>
            <div className="world-creature__portrait">{entry.imageSrc !== undefined ? <img src={entry.imageSrc} alt="" draggable={false} /> : <span>?</span>}</div>
            <div className="world-creature__identity"><small>{entry.faction}</small><strong>{entry.name}</strong><span>T{entry.tier} · {CATEGORY_LABELS[entry.category]}</span></div>
            <dl><div><dt>Dégâts</dt><dd>{entry.damageType === "magical" ? "Magiques" : "Physiques"}</dd></div><div><dt>Compétences</dt><dd>{entry.abilityCount}</dd></div></dl>
          </article>
        ))}
      </div>
    </div>
  );
}
