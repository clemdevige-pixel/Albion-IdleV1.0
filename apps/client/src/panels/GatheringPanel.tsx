import { useState } from "react";
import { useGameBridge, useGameServices } from "../state/GameContext";
import type { WorkerProfessionVM, WorkerVM } from "../game/GameBridge";
import { ItemVisual, getItemDefinition, getItemDisplayName } from "./ItemVisual";
import { ItemHoverTooltip } from "./ItemHoverTooltip";
import { PanelContainer } from "./PanelContainer";
import { usePanelManager } from "./usePanelManager";

const CRAFT_FAMILIES = [
  { id: "offhand", label: "Offhand", symbol: "◉" },
  { id: "bow", label: "Arc", symbol: "➶" },
  { id: "sword", label: "Épée", symbol: "⚔" },
  { id: "fire_staff", label: "Bâton de feu", symbol: "🔥" },
  { id: "gloves", label: "Gants", symbol: "🥊" },
  { id: "armor", label: "Armures", symbol: "♜" },
] as const;

const PRODUCTION_SECTIONS = [
  { id: "gather", label: "Récolte", icon: "🌿" },
  { id: "refine", label: "Raffinage", icon: "⚒" },
  { id: "craft", label: "Craft", icon: "🔨" },
] as const;

export function GatheringPanel(): JSX.Element | null {
  const { activePanel, closePanel } = usePanelManager();
  const {
    toggleGathering,
    toggleOreGathering,
    toggleHideGathering,
    toggleFiberGathering,
    toggleRefining,
    toggleMetalRefining,
    toggleLeatherRefining,
    toggleClothRefining,
    refineAllAvailable,
    setProductionTier,
    craftEquipment,
    recruitWorker,
    toggleWorker,
  } = useGameServices();
  const {
    gathering, oreGathering, hideGathering, fiberGathering,
    refining, metalRefining, leatherRefining, clothRefining,
    crafting, workers,
  } = useGameBridge();
  const [selectedCraftFamily, setSelectedCraftFamily] =
    useState<(typeof CRAFT_FAMILIES)[number]["id"]>("offhand");
  const [activeSection, setActiveSection] =
    useState<(typeof PRODUCTION_SECTIONS)[number]["id"]>("gather");
  const [selectedRecipeId, setSelectedRecipeId] = useState("item_shield_t3_reinforced");
  const visibleRecipes = crafting.recipes.filter(
    (recipe) =>
      recipe.tier === crafting.productionTier
      && recipe.family === selectedCraftFamily,
  );
  const selectedRecipe = visibleRecipes.find((recipe) => recipe.outputItemId === selectedRecipeId)
    ?? visibleRecipes[0];
  const tier = crafting.productionTier;
  if (activePanel !== "gathering") return null;

  return (
    <PanelContainer title="Production" onClose={closePanel}>
      <div className="production-panel">
        <header className="production-panel__header">
          <div>
            <span className="production-panel__eyebrow">CHAÎNE DE PRODUCTION T{tier}</span>
            <h2>Production</h2>
            <div className="production-panel__tier-switch" aria-label="Palier de production">
              {([3, 4] as const).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className={tier === entry ? "is-active" : ""}
                  onClick={() => { setProductionTier(entry); }}
                >
                  T{entry}
                </button>
              ))}
            </div>
          </div>
          <div className="production-panel__stocks">
            <Stock icon="resource-birch-log.png" label="Bois" value={gathering.storedQuantity} />
            <Stock icon="resource-copper-ore.png" label="Minerai" value={oreGathering.storedQuantity} />
            <Stock icon="resource-hide.png" label="Peaux" value={hideGathering.storedQuantity} />
            <Stock icon="resource-fiber.png" label="Fibres" value={fiberGathering.storedQuantity} />
            <Stock icon="resource-birch-planks.png" label="Planches" value={refining.refinedStoredQuantity} />
            <Stock icon="resource-copper-ingot.png" label="Lingots" value={metalRefining.refinedStoredQuantity} />
            <Stock icon="resource-leather.png" label="Cuir" value={leatherRefining.refinedStoredQuantity} />
            <Stock icon="resource-cloth.png" label="Tissu" value={clothRefining.refinedStoredQuantity} />
          </div>
        </header>

        <nav className="production-panel__sections" aria-label="Activités de production">
          {PRODUCTION_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "is-active" : ""}
              onClick={() => { setActiveSection(section.id); }}
            >
              <span aria-hidden="true">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>

        <div className={`production-panel__columns production-panel__columns--${activeSection}`}>
          <section className="production-column production-column--gather">
            <h3><img src="/assets/resources/resource-birch-node.png" alt="" /> Récolte</h3>
            <ProductionGatherCard
              icon="resource-birch-node.png"
              tier={tier}
              name={gathering.resourceName}
              tool={tier === 4 ? "Hache T4" : "Hache de compagnon"}
              stock={gathering.storedQuantity}
              progress={gathering.progress}
              active={gathering.status === "gathering"}
              masteryLevel={gathering.masteryLevel}
              requiredMasteryLevel={gathering.requiredMasteryLevel}
              isMasteryUnlocked={gathering.isMasteryUnlocked}
              onToggle={toggleGathering}
              worker={workers.workers.find((entry) => entry.profession === "woodcutter")}
              workerProfession="woodcutter"
              recruitmentCost={workers.recruitmentCost}
              onRecruit={recruitWorker}
              onToggleWorker={toggleWorker}
            />
            <ProductionGatherCard
              icon="resource-hide.png"
              tier={tier}
              name={hideGathering.resourceName}
              tool={tier === 4 ? "Couteau de dépeçage T4" : "Couteau de dépeçage"}
              stock={hideGathering.storedQuantity}
              progress={hideGathering.progress}
              active={hideGathering.status === "gathering"}
              masteryLevel={hideGathering.masteryLevel}
              requiredMasteryLevel={hideGathering.requiredMasteryLevel}
              isMasteryUnlocked={hideGathering.isMasteryUnlocked}
              onToggle={toggleHideGathering}
              worker={workers.workers.find((entry) => entry.profession === "skinner")}
              workerProfession="skinner"
              recruitmentCost={workers.recruitmentCost}
              onRecruit={recruitWorker}
              onToggleWorker={toggleWorker}
            />
            <ProductionGatherCard
              icon="resource-fiber.png"
              tier={tier}
              name={fiberGathering.resourceName}
              tool={tier === 4 ? "Faucille T4" : "Faucille de compagnon"}
              stock={fiberGathering.storedQuantity}
              progress={fiberGathering.progress}
              active={fiberGathering.status === "gathering"}
              masteryLevel={fiberGathering.masteryLevel}
              requiredMasteryLevel={fiberGathering.requiredMasteryLevel}
              isMasteryUnlocked={fiberGathering.isMasteryUnlocked}
              onToggle={toggleFiberGathering}
              worker={workers.workers.find((entry) => entry.profession === "fiber_harvester")}
              workerProfession="fiber_harvester"
              recruitmentCost={workers.recruitmentCost}
              onRecruit={recruitWorker}
              onToggleWorker={toggleWorker}
            />
            <ProductionGatherCard
              icon="resource-copper-pickaxe.png"
              tier={tier}
              name={oreGathering.resourceName}
              tool={tier === 4 ? "Pioche T4" : "Pioche de compagnon"}
              stock={oreGathering.storedQuantity}
              progress={oreGathering.progress}
              active={oreGathering.status === "gathering"}
              masteryLevel={oreGathering.masteryLevel}
              requiredMasteryLevel={oreGathering.requiredMasteryLevel}
              isMasteryUnlocked={oreGathering.isMasteryUnlocked}
              onToggle={toggleOreGathering}
              worker={workers.workers.find((entry) => entry.profession === "miner")}
              workerProfession="miner"
              recruitmentCost={workers.recruitmentCost}
              onRecruit={recruitWorker}
              onToggleWorker={toggleWorker}
            />
          </section>

          <section className="production-column production-column--refine">
            <div className="production-column__heading">
              <h3><img src="/assets/resources/station-sawmill.png" alt="" /> Raffinage</h3>
              <button
                className="production-refine-all"
                type="button"
                onClick={() => { refineAllAvailable(); }}
              >
                Tout raffiner
              </button>
            </div>
            <ProductionRefineCard
              icon="resource-birch-planks.png"
              tier={tier}
              name={refining.recipeName}
              rawName="Bois"
              raw={refining.rawStoredQuantity}
              refined={refining.refinedStoredQuantity}
              requirements={refining.requirements}
              reserved={refining.reservedInputQuantity}
              progress={refining.progress}
              active={refining.status === "refining"}
              onToggle={toggleRefining}
            />
            <ProductionRefineCard
              icon="resource-copper-ingot.png"
              tier={tier}
              name={metalRefining.recipeName}
              rawName="Minerai"
              raw={metalRefining.rawStoredQuantity}
              refined={metalRefining.refinedStoredQuantity}
              requirements={metalRefining.requirements}
              reserved={metalRefining.reservedInputQuantity}
              progress={metalRefining.progress}
              active={metalRefining.status === "refining"}
              onToggle={toggleMetalRefining}
            />
            <ProductionRefineCard
              icon="resource-leather.png"
              tier={tier}
              name={leatherRefining.recipeName}
              rawName="Peau"
              raw={leatherRefining.rawStoredQuantity}
              refined={leatherRefining.refinedStoredQuantity}
              requirements={leatherRefining.requirements}
              reserved={leatherRefining.reservedInputQuantity}
              progress={leatherRefining.progress}
              active={leatherRefining.status === "refining"}
              onToggle={toggleLeatherRefining}
            />
            <ProductionRefineCard
              icon="resource-cloth.png"
              tier={tier}
              name={clothRefining.recipeName}
              rawName="Fibre"
              raw={clothRefining.rawStoredQuantity}
              refined={clothRefining.refinedStoredQuantity}
              requirements={clothRefining.requirements}
              reserved={clothRefining.reservedInputQuantity}
              progress={clothRefining.progress}
              active={clothRefining.status === "refining"}
              onToggle={toggleClothRefining}
            />
          </section>

          <section className="production-column production-column--craft">
            <h3><img src="/assets/ui/nav-production.png" alt="" /> Craft</h3>
            <div className="production-craft__families" aria-label="Familles d’équipement">
              {CRAFT_FAMILIES.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  className={family.id === selectedCraftFamily ? "is-active" : ""}
                  onClick={() => {
                    setSelectedCraftFamily(family.id);
                    const firstRecipe = crafting.recipes.find(
                      (recipe) =>
                        recipe.tier === crafting.productionTier
                        && recipe.family === family.id,
                    );
                    if (firstRecipe !== undefined) {
                      setSelectedRecipeId(firstRecipe.outputItemId);
                    }
                  }}
                >
                  <span aria-hidden="true">{family.symbol}</span>
                  {family.label}
                </button>
              ))}
            </div>
            {selectedRecipe !== undefined && <div className="production-craft">
              <div className="production-craft__recipes">
                {visibleRecipes.map((recipe) => (
                  <button
                    type="button"
                    key={recipe.outputItemId}
                    className={recipe.outputItemId === selectedRecipe.outputItemId ? "is-active" : ""}
                    onClick={() => { setSelectedRecipeId(recipe.outputItemId); }}
                  >
                    <ItemVisual itemId={recipe.outputItemId} />
                    <span>T{recipe.tier}</span>
                  </button>
                ))}
              </div>
              <div className="production-craft__preview">
                <ItemHoverTooltip itemId={selectedRecipe.outputItemId}>
                  <ItemVisual itemId={selectedRecipe.outputItemId} />
                </ItemHoverTooltip>
              </div>
              <span className="production-panel__eyebrow">
                FORGE — ÉQUIPEMENT T{selectedRecipe.tier} · {selectedRecipe.itemPower} IP
              </span>
              <h4>{selectedRecipe.recipeName}</h4>
              <p>Qualité normale</p>
              <div className="production-craft__requirements">
                {selectedRecipe.requirements.map((requirement) => {
                  const visual = getCraftMaterialVisual(requirement.itemId);
                  return <Requirement
                    key={requirement.itemId}
                    iconPath={visual.iconPath}
                    label={visual.label}
                    have={requirement.available}
                    required={requirement.quantity}
                  />;
                })}
              </div>
              <button
                className="production-panel__action production-panel__action--craft"
                type="button"
                disabled={!selectedRecipe.canCraft}
                onClick={() => { craftEquipment(selectedRecipe.outputItemId); }}
              >
                Fabriquer
              </button>
              <small>Fabriqués dans l’inventaire : {selectedRecipe.craftedQuantity}</small>
            </div>}
          </section>
        </div>
      </div>
    </PanelContainer>
  );
}

interface GatherCardProps {
  readonly icon: string;
  readonly tier: 3 | 4;
  readonly name: string;
  readonly tool: string;
  readonly stock: number;
  readonly progress: number;
  readonly active: boolean;
  readonly masteryLevel: number;
  readonly requiredMasteryLevel: number;
  readonly isMasteryUnlocked: boolean;
  readonly onToggle: () => boolean;
  readonly worker: WorkerVM | undefined;
  readonly workerProfession: WorkerProfessionVM;
  readonly recruitmentCost: number;
  readonly onRecruit: (profession: WorkerProfessionVM) => boolean;
  readonly onToggleWorker: (profession: WorkerProfessionVM) => boolean;
}

function ProductionGatherCard(props: GatherCardProps): JSX.Element {
  const [confirmRecruitment, setConfirmRecruitment] = useState(false);
  return (
    <article className="production-card">
      <div className="production-card__icon"><img src={`/assets/resources/${props.icon}`} alt="" /></div>
      <div className="production-card__body">
        <span className="production-panel__eyebrow">RESSOURCE T{props.tier}</span>
        <h4>{props.name}</h4>
        <p>{props.tool} · Rendement 1</p>
        <p>
          Maîtrise {props.masteryLevel}
          {" · "}
          {props.isMasteryUnlocked
            ? `Palier T${String(props.tier)} débloqué`
            : `Niveau ${String(props.requiredMasteryLevel)} requis`}
        </p>
        <Progress value={props.progress} />
        <div className="production-card__status">
          <span>{props.active ? "Récolte en cours…" : "En réserve"}</span>
          <strong>{props.stock}</strong>
        </div>
        <button
          className={`production-panel__action${props.active ? " production-panel__action--stop" : ""}`}
          type="button"
          disabled={!props.active && !props.isMasteryUnlocked}
          onClick={() => { props.onToggle(); }}
        >
          {props.active ? "Arrêter" : "Récolter"}
        </button>
        <div className="worker-control">
          {props.worker === undefined ? (
            <>
              <div className="worker-control__summary">
                <img src="/assets/ui/nav-character.png" alt="" />
                <span>
                  <strong>Emplacement worker libre</strong>
                  <small>
                    {getWorkerProfessionLabel(props.workerProfession)}
                    {" · "}Profession permanente
                  </small>
                </span>
              </div>
              {confirmRecruitment ? (
                <div className="worker-control__confirmation">
                  <p>
                    Cette profession est définitive. Confirmer le recrutement
                    pour {props.recruitmentCost} argent ?
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (props.onRecruit(props.workerProfession)) {
                          setConfirmRecruitment(false);
                        }
                      }}
                    >
                      Confirmer
                    </button>
                    <button type="button" onClick={() => { setConfirmRecruitment(false); }}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="worker-control__recruit"
                  type="button"
                  onClick={() => { setConfirmRecruitment(true); }}
                >
                  Recruter · {props.recruitmentCost} S
                </button>
              )}
            </>
          ) : (
            <>
              <div className="worker-control__summary">
                <img src="/assets/ui/nav-character.png" alt="" />
                <span>
                  <strong>{props.worker.displayName} · {props.worker.professionName}</strong>
                  <small>
                    Affecté au T{props.worker.productionTier} · {props.worker.resourceName}
                  </small>
                  <small>
                    Maîtrise {props.worker.mastery}
                    {" · "}{props.worker.yieldPerCycle} ressource / {props.worker.durationSeconds} s
                  </small>
                  <small>
                    {props.worker.masteryXp} / {props.worker.masteryXpToNext} XP worker
                  </small>
                </span>
                <b className={`worker-control__state worker-control__state--${props.worker.state}`}>
                  {props.worker.state === "working"
                    ? `En production · T${String(props.worker.productionTier)}`
                    : props.worker.state === "paused"
                      ? "En pause"
                      : "Disponible"}
                </b>
              </div>
              <Progress value={props.worker.progress} />
              <button
                className={`worker-control__toggle${props.worker.state === "working" ? " worker-control__toggle--stop" : ""}`}
                type="button"
                disabled={
                  props.worker.mastery < props.requiredMasteryLevel
                  && !(
                    props.worker.state === "working"
                    && props.worker.productionTier === props.tier
                  )
                }
                onClick={() => { props.onToggleWorker(props.workerProfession); }}
              >
                {props.worker.mastery < props.requiredMasteryLevel
                  ? `Maîtrise worker ${String(props.requiredMasteryLevel)} requise`
                  : props.worker.productionTier !== props.tier
                  ? `Affecter au T${String(props.tier)}`
                  : props.worker.state === "working"
                    ? "Mettre en pause"
                    : "Lancer la production passive"}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

interface RefineCardProps {
  readonly icon: string;
  readonly tier: 3 | 4;
  readonly name: string;
  readonly rawName: string;
  readonly raw: number;
  readonly refined: number;
  readonly requirements: readonly {
    readonly itemId: string;
    readonly quantity: number;
    readonly available: number;
    readonly reserved: number;
  }[];
  readonly reserved: number;
  readonly progress: number;
  readonly active: boolean;
  readonly onToggle: () => boolean;
}

function ProductionRefineCard(props: RefineCardProps): JSX.Element {
  const canStart = props.requirements.every(
    (requirement) => requirement.available >= requirement.quantity,
  );
  return (
    <article className="production-card">
      <div className="production-card__icon"><img src={`/assets/resources/${props.icon}`} alt="" /></div>
      <div className="production-card__body">
        <span className="production-panel__eyebrow">RAFFINAGE T{props.tier}</span>
        <h4>{props.name}</h4>
        <div className="production-refine__requirements">
          {props.requirements.map((requirement) => (
            <span key={requirement.itemId}>
              {requirement.quantity} {formatRefiningMaterialName(requirement.itemId, props.rawName)}
              {" · "}{requirement.available} disponibles
            </span>
          ))}
          <strong>→ 1 unité</strong>
        </div>
        <Progress value={props.progress} />
        <div className="production-card__status">
          <span>{props.active ? `${props.reserved} engagés` : `${props.raw} disponibles`}</span>
          <strong>{props.refined}</strong>
        </div>
        <button
          className={`production-panel__action${props.active ? " production-panel__action--stop" : ""}`}
          type="button"
          disabled={!props.active && !canStart}
          onClick={() => { props.onToggle(); }}
        >
          {props.active ? "Arrêter" : "Raffiner"}
        </button>
      </div>
    </article>
  );
}

function formatRefiningMaterialName(itemId: string, rawName: string): string {
  const tier = itemId.match(/_t(\d+)$/i)?.[1] ?? "?";
  if (itemId.startsWith("item_refined_")) {
    const refinedName = rawName === "Bois"
      ? "planches"
      : rawName === "Minerai"
        ? "lingots"
        : rawName === "Peau"
          ? "cuir"
          : "tissu";
    return `${refinedName} T${tier}`;
  }
  return `${rawName.toLowerCase()} brut T${tier}`;
}

function getWorkerProfessionLabel(profession: WorkerProfessionVM): string {
  return {
    woodcutter: "Bûcheron",
    miner: "Mineur",
    stonecutter: "Tailleur de pierre",
    skinner: "Dépeceur",
    fiber_harvester: "Herboriste",
  }[profession];
}

function getCraftMaterialVisual(itemId: string): { iconPath: string; label: string } {
  const itemDef = getItemDefinition(itemId);
  if (itemDef !== undefined) {
    return {
      iconPath: `/assets/items/${itemDef.icon}`,
      label: itemDef.name,
    };
  }
  if (itemId.includes("planks")) return { iconPath: "/assets/resources/resource-birch-planks.png", label: "Planches" };
  if (itemId.includes("bar")) return { iconPath: "/assets/resources/resource-copper-ingot.png", label: "Lingots" };
  if (itemId.includes("leather")) return { iconPath: "/assets/resources/resource-leather.png", label: "Cuir" };
  if (itemId.includes("cloth")) return { iconPath: "/assets/resources/resource-cloth.png", label: "Tissu" };
  return { iconPath: "/assets/resources/resource-birch-log.png", label: getItemDisplayName(itemId) };
}

function Progress({ value }: { readonly value: number }): JSX.Element {
  return (
    <div className="production-progress">
      <div style={{ width: `${String(value)}%` }} />
    </div>
  );
}

function Requirement(props: {
  readonly iconPath: string;
  readonly label: string;
  readonly have: number;
  readonly required: number;
}): JSX.Element {
  const met = props.have >= props.required;
  return (
    <div className={`production-requirement${met ? " production-requirement--met" : ""}`}>
      <span><img src={props.iconPath} alt="" /> {props.label}</span>
      <strong>{props.have} / {props.required} {met ? "✓" : "✕"}</strong>
    </div>
  );
}

function Stock(props: {
  readonly icon: string;
  readonly label: string;
  readonly value: number;
}): JSX.Element {
  return (
    <span>
      <img src={`/assets/resources/${props.icon}`} alt="" />
      {props.label}
      <strong>{props.value}</strong>
    </span>
  );
}
