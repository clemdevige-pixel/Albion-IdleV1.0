import { useState } from "react";
import { GatheringView } from "./gathering/GatheringView";
import { RefiningView } from "./refining/RefiningView";
import { CraftingView } from "./crafting/CraftingView";
import "./production.css";

type ProductionSection = "gathering" | "refining" | "crafting";

export function ProductionModule(): JSX.Element {
  const [section, setSection] = useState<ProductionSection>("gathering");

  return (
    <div className="ui-production">
      <nav className="ui-production__tabs" aria-label="Sections de production">
        <button type="button" className={section === "gathering" ? "is-active" : ""} aria-current={section === "gathering" ? "page" : undefined} onClick={() => { setSection("gathering"); }}>Récolte</button>
        <button type="button" className={section === "refining" ? "is-active" : ""} aria-current={section === "refining" ? "page" : undefined} onClick={() => { setSection("refining"); }}>Raffinage</button>
        <button type="button" className={section === "crafting" ? "is-active" : ""} aria-current={section === "crafting" ? "page" : undefined} onClick={() => { setSection("crafting"); }}>Craft</button>
      </nav>
      {section === "gathering" && <GatheringView />}
      {section === "refining" && <RefiningView />}
      {section === "crafting" && <CraftingView />}
    </div>
  );
}
