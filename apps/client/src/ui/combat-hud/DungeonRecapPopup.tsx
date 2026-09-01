import type { DungeonAccessState } from "../../state/DungeonNavigationActions.js";
import type { DungeonCompletionRecapModel } from "../../runtime/DungeonCompletionFlow.js";
import { dungeonCompletionFlow } from "../../runtime/DungeonCompletionFlow.js";
import { DUNGEON_DEFINITIONS } from "../../data/dungeonContentCatalog.js";
import { getDungeonLootDefinition } from "../../data/dungeonLootContentCatalog.js";
import { ItemVisual } from "../../panels/ItemVisual.js";
import { useGameServices } from "../../state/GameContext.js";
import { ActivityResultPopup } from "./ActivityResultPopup.js";
import "./expeditionRecap.css";

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

interface RewardRow {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly itemId?: string;
  readonly currency?: "silver";
}

export function DungeonRecapPopup({
  recap,
}: {
  readonly recap: DungeonCompletionRecapModel;
}): JSX.Element {
  const services = useGameServices();
  const replayAccess = services.getDungeonState().getAccess(recap.dungeonDefinitionId);
  const replayUnavailable = replayUnavailableLabel(replayAccess);
  const dungeonDefinition = DUNGEON_DEFINITIONS.find(
    (definition) => definition.id === recap.dungeonDefinitionId,
  );
  const lootDefinition = dungeonDefinition === undefined
    ? undefined
    : getDungeonLootDefinition(dungeonDefinition.lootTableId);

  const rewardRows: readonly RewardRow[] = ([
    {
      key: "silver",
      label: "Silver",
      value: recap.rewards.silver,
      currency: "silver" as const,
    },
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
      title="Donjon terminé"
      titleId="dungeon-recap-title"
      badge={`T${String(recap.tier)}`}
      summary={(
        <>
          <strong>{recap.faction}</strong> vaincu
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
              if (services.startDungeon(recap.dungeonDefinitionId)) {
                dungeonCompletionFlow.dismissForReplay();
              }
            }}
          >
            Relancer le donjon
          </button>
          <button
            type="button"
            className="dungeon-recap__action dungeon-recap__action--primary"
            onClick={() => { dungeonCompletionFlow.resumeExploration(); }}
          >
            Reprendre l’exploration
          </button>
        </>
      )}
    >
      <div className="dungeon-recap__rewards" aria-label="Récompenses obtenues">
        <h3>Récompenses obtenues</h3>
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
          <p className="dungeon-recap__empty">Aucune récompense obtenue.</p>
        )}
      </div>
    </ActivityResultPopup>
  );
}
