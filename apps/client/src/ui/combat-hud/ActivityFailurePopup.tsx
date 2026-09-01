import { FACTION_CAPE_FACTIONS } from "@game/data";
import type { DungeonAccessState } from "../../state/DungeonNavigationActions.js";
import type { ActivityFailureRecapModel } from "../../runtime/ActivityFailureFlow.js";
import { activityFailureFlow } from "../../runtime/ActivityFailureFlow.js";
import { DUNGEON_DEFINITIONS } from "../../data/dungeonContentCatalog.js";
import { getDungeonLootDefinition } from "../../data/dungeonLootContentCatalog.js";
import { ItemVisual } from "../../panels/ItemVisual.js";
import { useGameServices } from "../../state/GameContext.js";
import { ActivityResultPopup } from "./ActivityResultPopup.js";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

function replayUnavailableLabel(access: DungeonAccessState): string | undefined {
  if (access.canEnter) return undefined;
  if (access.reason === "missing_key") return "Clé requise pour relancer";
  if (access.reason === "weapon_required") return "Arme requise";
  if (access.reason === "equipment_tier_locked") return "Équipement incompatible";
  return "Relance indisponible";
}

function resolveFactionDisplayName(factionId: string): string {
  return FACTION_CAPE_FACTIONS.find((entry) => entry.factionId === factionId)?.displayName ?? factionId;
}

interface RewardRow {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly itemId?: string;
  readonly currency?: "silver";
}

function DungeonFailurePopup({ recap }: { readonly recap: Extract<ActivityFailureRecapModel, { kind: "dungeon" }> }): JSX.Element {
  const services = useGameServices();
  const replayAccess = services.getDungeonState().getAccess(recap.dungeonDefinitionId);
  const replayUnavailable = replayUnavailableLabel(replayAccess);
  const dungeonDefinition = DUNGEON_DEFINITIONS.find((definition) => definition.id === recap.dungeonDefinitionId);
  const lootDefinition = dungeonDefinition === undefined ? undefined : getDungeonLootDefinition(dungeonDefinition.lootTableId);
  const rewardRows: readonly RewardRow[] = ([
    { key: "silver", label: "Silver", value: recap.rewards.silver, currency: "silver" as const },
    {
      key: "artifact-fragments",
      label: "Fragments d’artefact",
      value: recap.rewards.artifactFragments,
      ...(lootDefinition === undefined ? {} : { itemId: lootDefinition.artifactFragmentItemId }),
    },
    {
      key: "enchantment-shards",
      label: "Éclats d’enchantement",
      value: recap.rewards.enchantmentShards,
      ...(lootDefinition === undefined ? {} : { itemId: lootDefinition.enchantmentShardItemId }),
    },
    {
      key: "faction-runes",
      label: "Runes de faction",
      value: recap.rewards.factionRunes,
      ...(lootDefinition === undefined ? {} : { itemId: lootDefinition.factionRuneItemId }),
    },
    {
      key: "artifacts",
      label: "Artefacts",
      value: recap.rewards.artifacts,
      ...(lootDefinition === undefined ? {} : { itemId: lootDefinition.artifactItemId }),
    },
  ] satisfies readonly RewardRow[]).filter((entry) => entry.value > 0);

  return (
    <ActivityResultPopup
      title="Échec du donjon"
      titleId="activity-failure-title"
      badge={`T${String(recap.tier)}`}
      tone="failure"
      summary={(
        <>
          <strong>{recap.faction}</strong>
          <span aria-hidden="true">•</span>
          <span>Rencontre {recap.encounterNumber}/{recap.encounterCount}</span>
          <span aria-hidden="true">•</span>
          <span>{formatDuration(recap.durationMs)}</span>
        </>
      )}
      footer={(
        <>
          <button
            type="button"
            className="dungeon-recap__action dungeon-recap__action--secondary"
            disabled={!replayAccess.canEnter}
            title={replayUnavailable}
            onClick={() => {
              if (!services.resumeExploration()) return;
              if (services.startDungeon(recap.dungeonDefinitionId)) activityFailureFlow.dismiss();
            }}
          >
            Relancer le donjon
          </button>
          <button
            type="button"
            className="dungeon-recap__action dungeon-recap__action--primary"
            onClick={() => {
              if (services.resumeExploration()) activityFailureFlow.dismiss();
            }}
          >
            Reprendre l’exploration
          </button>
        </>
      )}
    >
      <div className="dungeon-recap__rewards activity-result__section" aria-label="Butin obtenu avant la défaite">
        <h3>Butin obtenu avant la défaite</h3>
        {rewardRows.length > 0 ? (
          <div className="dungeon-recap__reward-list">
            {rewardRows.map((reward) => (
              <div key={reward.key} className="dungeon-recap__reward-row">
                <div className="dungeon-recap__reward-identity">
                  <span className="dungeon-recap__reward-icon" aria-hidden="true">
                    {reward.currency === "silver" ? (
                      <span className="dungeon-recap__silver-icon">S</span>
                    ) : reward.itemId !== undefined ? (
                      <ItemVisual itemId={reward.itemId} />
                    ) : null}
                  </span>
                  <span>{reward.label}</span>
                </div>
                <strong>+{formatNumber(reward.value)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="dungeon-recap__empty">Aucun butin obtenu avant la défaite.</p>
        )}
      </div>
    </ActivityResultPopup>
  );
}

function TowerFailurePopup({ recap }: { readonly recap: Extract<ActivityFailureRecapModel, { kind: "tower" }> }): JSX.Element {
  const services = useGameServices();
  const towerAccess = services.getTowerState().access;

  return (
    <ActivityResultPopup
      title="Tentative terminée"
      titleId="activity-failure-title"
      badge={`T${String(recap.tier)}`}
      tone="failure"
      summary={(
        <>
          <strong>{resolveFactionDisplayName(recap.factionId)}</strong>
          <span aria-hidden="true">•</span>
          <span>Défaite à l’étage {recap.floor}</span>
        </>
      )}
      footer={(
        <>
          <button
            type="button"
            className="dungeon-recap__action dungeon-recap__action--secondary"
            disabled={!towerAccess.canEnter}
            onClick={() => {
              if (!services.selectTowerCheckpoint(recap.checkpointFloor)) return;
              if (!services.resumeExploration()) return;
              if (services.startTower()) activityFailureFlow.dismiss();
            }}
          >
            Repartir du checkpoint
          </button>
          <button
            type="button"
            className="dungeon-recap__action dungeon-recap__action--primary"
            onClick={() => {
              if (services.resumeExploration()) activityFailureFlow.dismiss();
            }}
          >
            Reprendre l’exploration
          </button>
        </>
      )}
    >
      <div className="activity-result__stats" aria-label="Progression de la Tour conservée">
        <div><small>Étage atteint</small><strong>{recap.floor}</strong></div>
        <div><small>Record</small><strong>{recap.highestClearedFloor}</strong></div>
        <div><small>Checkpoint</small><strong>{recap.checkpointFloor}</strong></div>
      </div>
      <p className="activity-result__notice">Votre progression validée est conservée.</p>
    </ActivityResultPopup>
  );
}

export function ActivityFailurePopup({ recap }: { readonly recap: ActivityFailureRecapModel }): JSX.Element {
  return recap.kind === "dungeon"
    ? <DungeonFailurePopup recap={recap} />
    : <TowerFailurePopup recap={recap} />;
}
