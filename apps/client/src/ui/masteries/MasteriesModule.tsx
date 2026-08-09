import { useEffect, useState } from "react";
import { formatCompactNumber } from "../shared/formatters";
import type { MasteryCategoryId } from "./masteryModels";
import { useMasteriesData } from "./useMasteriesData";
import { MasteryDetails } from "./components/MasteryDetails";
import { MasteryFamilyList } from "./components/MasteryFamilyList";
import { MasteryTreeEntry } from "./components/MasteryTreeEntry";
import "./masteries.css";

const CATEGORY_LABELS: Readonly<Record<MasteryCategoryId, string>> = {
  combat: "Combat",
  gathering: "Récolte",
};

export function MasteriesModule(): JSX.Element {
  const model = useMasteriesData();
  const [category, setCategory] = useState<MasteryCategoryId>("combat");
  const [selections, setSelections] = useState<Readonly<Record<MasteryCategoryId, string | undefined>>>({
    combat: model.categories.combat[0]?.id,
    gathering: model.categories.gathering[0]?.id,
  });
  const families = model.categories[category];
  const selectedFamily = families.find((family) => family.id === selections[category]) ?? families[0];

  useEffect(() => {
    if (selectedFamily === undefined) return;
    if (selections[category] === selectedFamily.id) return;
    setSelections((current) => ({ ...current, [category]: selectedFamily.id }));
  }, [category, selectedFamily, selections]);

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

      <div className="ui-masteries__workspace">
        <MasteryFamilyList
          families={families}
          selectedId={selectedFamily?.id}
          onSelect={(id) => { setSelections((current) => ({ ...current, [category]: id })); }}
        />
        {selectedFamily === undefined ? (
          <p className="ui-masteries__empty">Aucune maîtrise disponible dans cette catégorie.</p>
        ) : (
          <MasteryDetails family={selectedFamily} />
        )}
      </div>

      <MasteryTreeEntry />
    </div>
  );
}
