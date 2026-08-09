import type { RefiningFamilyModel } from "./refiningModels";

export function RefiningJobs({ jobs }: { readonly jobs: readonly RefiningFamilyModel[] }): JSX.Element {
  return (
    <section className="ui-refining-jobs" aria-label="Raffinages actifs">
      <h3>Productions actives</h3>
      {jobs.length === 0 ? (
        <p>Aucun raffinage en cours.</p>
      ) : jobs.map((job) => (
        <div key={job.id} className="ui-refining-jobs__entry">
          <img src={`/assets/resources/${job.refinedIcon}`} alt="" />
          <span><strong>{job.activity.recipeName}</strong><small>{String(job.activity.reservedInputQuantity)} entrée(s) réservée(s)</small></span>
          <b>{String(Math.round(job.activity.progress))}%</b>
        </div>
      ))}
    </section>
  );
}
