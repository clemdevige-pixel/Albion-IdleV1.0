import { useState } from "react";
import { formatCompactNumber } from "../shared/formatters";
import type { MasteryCategoryId } from "./masteryModels";
import { useMasteriesData } from "./useMasteriesData";
import { MasteryFamilyList } from "./components/MasteryFamilyList";
import { MasteryTreeEntry } from "./components/MasteryTreeEntry";
import "./masteries.css";

const CATEGORY_LABELS: Readonly<Record<MasteryCategoryId, string>> = {
  combat: "Combat",
  gathering: "Récolte",
  faction: "Factions",
};

export function MasteriesModule(): JSX.Element {
  const model = useMasteriesData();
  const [category, setCategory] = useState<MasteryCategoryId>("combat");
  const [expandedFamilies, setExpandedFamilies] = useState<Readonly<Record<MasteryCategoryId, string | undefined>>>({
    combat: undefined,
    gathering: undefined,
    faction: undefined,
  });
  const families = model.categories[category];
  const expandedId = expandedFamilies[category];

  return (
    <div className="ui-masteries">
      <section className="ui-masteries__summary" aria-label="Résumé des maîtrises">
        <div><small>Fame globale</small><strong>{formatCompactNumber(model.totalFame, "0")}</strong></div>
        <div><small>Débordement</small><strong>{formatCompactNumber(model.overflowPool, "0")} XP</strong></div>
      </section>

      <div className="ui-masteries__tabs" role="tablist" aria-label="Catégories de maîtrises">
        {(Object.keys(CATEGORY_LABELS) as MasteryCategoryId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={category === id}
            className={category === id ? "is-active" : ""}
            onClick={() => { setCategory(id); }}
          >
            {CATEGORY_LABELS[id]}
          </button>
        ))}
      </div>

      {families.length === 0 ? (
        <p className="ui-masteries__empty">Aucune maîtrise disponible dans cette catégorie.</p>
      ) : (
        <MasteryFamilyList
          category={category}
          families={families}
          selectedId={expandedId}
          onSelect={(id) => {
            setExpandedFamilies((current) => ({
              ...current,
              [category]: current[category] === id ? undefined : id,
            }));
          }}
        />
      )}

      <MasteryTreeEntry />
    </div>
  );
}
