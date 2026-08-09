import type { MasteryFamilyModel, MasteryProgressModel } from "../masteryModels";
import { MasteryProgressBar } from "./MasteryProgressBar";

function BonusList({ bonuses }: { readonly bonuses: readonly string[] }): JSX.Element {
  return <ul className="ui-mastery-bonuses">{bonuses.map((bonus) => <li key={bonus}>{bonus}</li>)}</ul>;
}

function SpecializationCard({ mastery }: { readonly mastery: MasteryProgressModel }): JSX.Element {
  return (
    <article className={`ui-mastery-specialization${mastery.isUnlocked ? "" : " is-locked"}`}>
      <div className="ui-mastery-specialization__heading">
        <div><h4>{mastery.name}</h4>{mastery.subtitle !== undefined && <small>{mastery.subtitle}</small>}</div>
        <strong>Niv. {String(mastery.level)}</strong>
      </div>
      <MasteryProgressBar mastery={mastery} />
      <BonusList bonuses={mastery.bonuses} />
    </article>
  );
}

export function MasteryDetails({ family }: { readonly family: MasteryFamilyModel }): JSX.Element {
  return (
    <section className="ui-mastery-details">
      <header className="ui-mastery-details__header">
        <span className="ui-mastery-details__icon" aria-hidden="true">{family.icon}</span>
        <div className="ui-mastery-details__title">
          <small>{family.subtitle}</small>
          <div><h3>{family.name}</h3><strong>Niv. {String(family.level)}</strong></div>
        </div>
      </header>
      <MasteryProgressBar mastery={family} />
      <BonusList bonuses={family.bonuses} />

      <div className="ui-mastery-details__section-title">
        {family.specializations.length > 0 ? "Spécialisations" : "Spécialisations indisponibles"}
      </div>
      <div className="ui-mastery-specializations">
        {family.specializations.map((specialization) => (
          <SpecializationCard key={specialization.id} mastery={specialization} />
        ))}
      </div>
    </section>
  );
}
