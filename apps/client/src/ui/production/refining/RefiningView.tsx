import { useState } from "react";
import { RefiningJobs } from "./RefiningJobs";
import { RefiningRecipeCard } from "./RefiningRecipeCard";
import type { RefiningFamilyId } from "./refiningModels";
import { useRefiningActions } from "./useRefiningActions";
import { useRefiningData } from "./useRefiningData";

export function RefiningView(): JSX.Element {
  const model = useRefiningData();
  const actions = useRefiningActions();
  const [selectedFamily, setSelectedFamily] = useState<RefiningFamilyId>("wood");
  const family = model.families.find((entry) => entry.id === selectedFamily) ?? model.families[0];

  return (
    <div className="ui-refining">
      <div className="ui-refining__toolbar">
        <div className="ui-refining__tiers" role="group" aria-label="Palier de raffinage">
          {([3, 4] as const).map((tier) => (
            <button key={tier} type="button" className={model.tier === tier ? "is-active" : ""} aria-pressed={model.tier === tier} onClick={() => { actions.setTier(tier); }}>T{String(tier)}</button>
          ))}
        </div>
        <button className="ui-refining__all" type="button" onClick={() => { actions.refineAll(); }}>Tout raffiner</button>
      </div>

      <nav className="ui-refining__families" aria-label="Familles de raffinage">
        {model.families.map((entry) => (
          <button key={entry.id} type="button" className={entry.id === family?.id ? "is-active" : ""} onClick={() => { setSelectedFamily(entry.id); }}>
            <img src={`/assets/resources/${entry.refinedIcon}`} alt="" />
            <span>{entry.label}</span>
            {entry.activity.status === "refining" && <i aria-label="En cours" />}
          </button>
        ))}
      </nav>

      {family !== undefined && <RefiningRecipeCard family={family} tier={model.tier} actions={actions} />}
      <RefiningJobs jobs={model.activeJobs} />
    </div>
  );
}
