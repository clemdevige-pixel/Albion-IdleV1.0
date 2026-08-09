import type { MasteryProgressModel } from "../masteryModels";

export function MasteryProgressBar({ mastery }: { readonly mastery: MasteryProgressModel }): JSX.Element {
  return (
    <div className="ui-mastery-progress">
      <div className="ui-mastery-progress__track" aria-hidden="true">
        <span style={{ width: `${String(mastery.progressPercent)}%` }} />
      </div>
      <div className="ui-mastery-progress__meta">
        <span>{String(mastery.currentXp)} / {String(mastery.xpToNextLevel)} XP</span>
        <span>{String(Math.round(mastery.progressPercent))}%</span>
      </div>
    </div>
  );
}
