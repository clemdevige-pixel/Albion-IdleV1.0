import { useState } from "react";
import type { MasteryVM } from "../game/GameBridge";
import { useGameBridge } from "../state/GameContext";
import { PanelContainer } from "./PanelContainer";
import { usePanelManager } from "./usePanelManager";

const GROUPS = [
  { familyId: "mastery_sword", weaponIds: ["mastery_broadsword"], icon: "⚔" },
  { familyId: "mastery_bow", weaponIds: ["mastery_longbow", "mastery_badon"], icon: "🏹" },
  { familyId: "mastery_fire_staff", weaponIds: ["mastery_t4_fire_staff"], icon: "🔥" },
  { familyId: "mastery_gloves", weaponIds: ["mastery_spiked_gauntlets"], icon: "🥊" },
] as const;

function progressPercent(mastery: MasteryVM): number {
  if (mastery.xpToNextLevel <= 0) return 100;
  return Math.max(0, Math.min(100, (mastery.currentXp / mastery.xpToNextLevel) * 100));
}

function MasteryProgress({ mastery }: { readonly mastery: MasteryVM }): JSX.Element {
  const percent = progressPercent(mastery);
  return (
    <>
      <div className="mastery-card__progress">
        <div className="mastery-card__progress-fill" style={{ width: `${String(percent)}%` }} />
      </div>
      <div className="mastery-card__xp">
        <span>{String(mastery.currentXp)} / {String(mastery.xpToNextLevel)} XP</span>
        <span>{String(Math.round(percent))}%</span>
      </div>
    </>
  );
}

const GATHERING_GROUPS = [
  {
    masteryId: "mastery_gathering_wood",
    profession: "woodcutter",
    label: "Bûcheron",
    icon: "🌲",
  },
  {
    masteryId: "mastery_gathering_ore",
    profession: "miner",
    label: "Mineur",
    icon: "⛏️",
  },
  {
    masteryId: "mastery_gathering_hide",
    profession: "skinner",
    label: "Dépeceur",
    icon: "🦬",
  },
  {
    masteryId: "mastery_gathering_fiber",
    profession: "fiber_harvester",
    label: "Herboriste",
    icon: "🌿",
  },
] as const;

function WorkerMasteryProgress({
  current,
  required,
}: {
  readonly current: number;
  readonly required: number;
}): JSX.Element {
  const percent = required <= 0 ? 100 : Math.min(100, (current / required) * 100);
  return (
    <>
      <div className="mastery-card__progress">
        <div className="mastery-card__progress-fill" style={{ width: `${String(percent)}%` }} />
      </div>
      <div className="mastery-card__xp">
        <span>{String(current)} / {String(required)} XP</span>
        <span>{String(Math.round(percent))}%</span>
      </div>
    </>
  );
}

function GatheringMasteries({
  masteries,
  workers,
  selectedMasteryId,
  onSelectMastery,
}: {
  readonly masteries: readonly MasteryVM[];
  readonly workers: ReturnType<typeof useGameBridge>["workers"];
  readonly selectedMasteryId: string;
  readonly onSelectMastery: (masteryId: string) => void;
}): JSX.Element | null {
  const byId = new Map(masteries.map((mastery) => [mastery.id, mastery]));
  const selectedGroup = GATHERING_GROUPS.find(
    (group) => group.masteryId === selectedMasteryId,
  ) ?? GATHERING_GROUPS[0];
  const heroMastery = byId.get(selectedGroup.masteryId);
  if (heroMastery === undefined) return null;

  const professionWorkers = workers.workers.filter(
    (worker) => worker.profession === selectedGroup.profession,
  );
  const heroSpeedBonus = Math.min(50, heroMastery.level * 0.5);

  return (
    <div className="mastery-screen__columns">
      <nav className="mastery-nav" aria-label="Métiers de récolte">
        <span className="mastery-screen__section-label">Métiers</span>
        {GATHERING_GROUPS.map((group) => {
          const mastery = byId.get(group.masteryId);
          if (mastery === undefined) return null;
          return (
            <button
              key={group.masteryId}
              type="button"
              className={`mastery-nav__item${group.masteryId === selectedMasteryId ? " is-selected" : ""}`}
              onClick={() => { onSelectMastery(group.masteryId); }}
            >
              <span className="mastery-nav__icon">{group.icon}</span>
              <span className="mastery-nav__details">
                <strong>{group.label}</strong>
                <small>Niveau héros {String(mastery.level)}</small>
                <span className="mastery-nav__bar">
                  <span style={{ width: `${String(progressPercent(mastery))}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <main className="mastery-detail">
        <section className="mastery-detail__family gathering-mastery__hero">
          <div className="mastery-detail__family-icon">{selectedGroup.icon}</div>
          <div>
            <span className="mastery-screen__section-label">Maîtrise du héros</span>
            <div className="mastery-detail__title">
              <h3>{heroMastery.displayName}</h3>
              <strong>Niv. {String(heroMastery.level)}</strong>
            </div>
            <MasteryProgress mastery={heroMastery} />
            <div className="gathering-mastery__bonuses">
              <span>Vitesse de récolte <strong>+{String(heroSpeedBonus)}%</strong></span>
              <span>Rendement <strong>1 par cycle</strong></span>
            </div>
          </div>
        </section>

        <span className="mastery-screen__section-label">
          Maîtrise des workers · {selectedGroup.label}
        </span>
        <div className="mastery-detail__weapons">
          {professionWorkers.length === 0 ? (
            <div className="gathering-workers__empty">
              Aucun worker {selectedGroup.label.toLowerCase()} recruté.
            </div>
          ) : professionWorkers.map((worker) => (
            <article key={worker.id} className="mastery-weapon gathering-worker">
              <div className="mastery-weapon__icon">🧑‍🌾</div>
              <div className="mastery-weapon__body">
                <div className="mastery-detail__title">
                  <div>
                    <h4>{worker.displayName}</h4>
                    <small>
                      {worker.professionName} · affecté au T{String(worker.productionTier)}
                    </small>
                  </div>
                  <strong>Niv. {String(worker.mastery)}</strong>
                </div>
                <WorkerMasteryProgress
                  current={worker.masteryXp}
                  required={worker.masteryXpToNext}
                />
                <small className="gathering-worker__cycle">
                  {String(worker.durationSeconds)} s · {String(worker.yieldPerCycle)} ressource par cycle
                </small>
              </div>
            </article>
          ))}
        </div>
      </main>

      <aside className="mastery-inspector">
        <section>
          <h3>État actuel</h3>
          <dl>
            <div><dt>Maîtrise héros</dt><dd>Niv. {String(heroMastery.level)}</dd></div>
            <div><dt>Workers recrutés</dt><dd>{String(professionWorkers.length)}</dd></div>
            <div><dt>Rendement</dt><dd>1 / cycle</dd></div>
          </dl>
        </section>
        <section>
          <h3>Règle de progression</h3>
          <p className="gathering-mastery__rule">
            La maîtrise couvre tous les tiers. Les ressources de tiers supérieurs
            prennent plus de temps, mais rapportent davantage d’XP.
          </p>
        </section>
      </aside>
    </div>
  );
}

function CombatMasteries({
  progression,
  selectedFamilyId,
  onSelectFamily,
}: {
  readonly progression: ReturnType<typeof useGameBridge>["progression"];
  readonly selectedFamilyId: string;
  readonly onSelectFamily: (familyId: string) => void;
}): JSX.Element | null {
  const byId = new Map(progression.masteries.map((mastery) => [mastery.id, mastery]));
  const selectedGroup = GROUPS.find((group) => group.familyId === selectedFamilyId) ?? GROUPS[0];
  const family = byId.get(selectedGroup.familyId);
  const weapons = selectedGroup.weaponIds
    .map((id) => byId.get(id))
    .filter((mastery): mastery is MasteryVM => mastery !== undefined);

  if (family === undefined) return null;

  return (
    <div className="mastery-screen__columns">
      <nav className="mastery-nav" aria-label="Familles d'armes">
        <span className="mastery-screen__section-label">Familles</span>
        {GROUPS.map((group) => {
          const item = byId.get(group.familyId);
          if (item === undefined) return null;
          return (
            <button
              key={group.familyId}
              type="button"
              className={`mastery-nav__item${group.familyId === selectedFamilyId ? " is-selected" : ""}${item.isUnlocked ? "" : " is-locked"}`}
              onClick={() => { onSelectFamily(group.familyId); }}
            >
              <span className="mastery-nav__icon">{group.icon}</span>
              <span className="mastery-nav__details">
                <strong>{item.displayName}</strong>
                <small>Niveau {String(item.level)}</small>
                <span className="mastery-nav__bar">
                  <span style={{ width: `${String(progressPercent(item))}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <main className="mastery-detail">
        <section className={`mastery-detail__family${family.isUnlocked ? "" : " is-locked"}`}>
          <div className="mastery-detail__family-icon">{selectedGroup.icon}</div>
          <div>
            <span className="mastery-screen__section-label">Tronc commun</span>
            <div className="mastery-detail__title">
              <h3>{family.displayName}</h3>
              <strong>Niv. {String(family.level)}</strong>
            </div>
            <small>
              Bonus actuel : +{String(family.level * 0.5)} IP sur toutes les
              armes de la famille · +0,5 IP par niveau
            </small>
            <MasteryProgress mastery={family} />
          </div>
        </section>

        <span className="mastery-screen__section-label">Spécialisations</span>
        <div className="mastery-detail__weapons">
          {weapons.map((weapon) => (
            <article
              key={weapon.id}
              className={`mastery-weapon${weapon.isUnlocked ? "" : " is-locked"}`}
            >
              <div className="mastery-weapon__icon">{selectedGroup.icon}</div>
              <div className="mastery-weapon__body">
                <div className="mastery-detail__title">
                  <div>
                    <h4>{weapon.displayName}</h4>
                    <small>{weapon.isUnlocked ? "Progression active" : "Arme non découverte"}</small>
                    <small>
                      Bonus actuel : +{String(weapon.level)} IP sur cette arme
                      · +1 IP par niveau
                    </small>
                  </div>
                  <strong>Niv. {String(weapon.level)}</strong>
                </div>
                <MasteryProgress mastery={weapon} />
              </div>
            </article>
          ))}
        </div>
      </main>

      <aside className="mastery-inspector">
        <section>
          <h3>État actuel</h3>
          <dl>
            <div><dt>Famille</dt><dd>Niv. {String(family.level)}</dd></div>
            <div>
              <dt>Armes découvertes</dt>
              <dd>{String(weapons.filter((weapon) => weapon.isUnlocked).length)} / {String(weapons.length)}</dd>
            </div>
            <div><dt>Fame totale</dt><dd>{String(family.totalLifetimeXp)}</dd></div>
          </dl>
        </section>
        <section>
          <h3>Récompenses à venir</h3>
          <div className="mastery-reward">
            <span>1</span>
            <div><strong>Initié</strong><small>Premier palier de maîtrise</small></div>
          </div>
          <div className="mastery-reward">
            <span>3</span>
            <div><strong>Adepte</strong><small>Deuxième palier de maîtrise</small></div>
          </div>
        </section>
        <section>
          <h3>Débordement</h3>
          <strong className="mastery-inspector__overflow">{String(progression.overflowPool)} XP</strong>
        </section>
      </aside>
    </div>
  );
}

export function ProgressionPanel(): JSX.Element | null {
  const { activePanel, closePanel } = usePanelManager();
  const { progression, workers } = useGameBridge();
  const [selectedFamilyId, setSelectedFamilyId] = useState("mastery_sword");
  const [selectedGatheringMasteryId, setSelectedGatheringMasteryId] = useState(
    "mastery_gathering_wood",
  );
  const [selectedCategory, setSelectedCategory] = useState<"combat" | "gathering">("combat");

  if (activePanel !== "masteries") return null;

  const gatheringMasteries = progression.masteries.filter(
    (mastery) => mastery.category === "gathering",
  );

  return (
    <PanelContainer title="Maîtrises" onClose={closePanel}>
      <div className="mastery-screen">
        <header className="mastery-screen__intro">
          <div>
            <h2>{selectedCategory === "combat" ? "Maîtrises d'armes" : "Maîtrises de récolte"}</h2>
            <p>
              {selectedCategory === "combat"
                ? "Combattez avec une arme pour améliorer sa spécialisation et sa famille."
                : "Récoltez une ressource pour accélérer progressivement sa collecte."}
            </p>
            <div className="mastery-category-tabs">
              <button
                type="button"
                className={selectedCategory === "combat" ? "is-active" : ""}
                onClick={() => { setSelectedCategory("combat"); }}
              >
                ⚔ Combat
              </button>
              <button
                type="button"
                className={selectedCategory === "gathering" ? "is-active" : ""}
                onClick={() => { setSelectedCategory("gathering"); }}
              >
                🌿 Récolte
              </button>
            </div>
          </div>
          <div className="mastery-screen__global">
            <span>Fame globale</span>
            <strong>{String(progression.totalFame)}</strong>
          </div>
        </header>

        {selectedCategory === "combat" ? (
          <CombatMasteries
            progression={progression}
            selectedFamilyId={selectedFamilyId}
            onSelectFamily={setSelectedFamilyId}
          />
        ) : (
          <GatheringMasteries
            masteries={gatheringMasteries}
            workers={workers}
            selectedMasteryId={selectedGatheringMasteryId}
            onSelectMastery={setSelectedGatheringMasteryId}
          />
        )}
      </div>
    </PanelContainer>
  );
}
