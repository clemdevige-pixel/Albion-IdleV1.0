import { FACTION_CAPE_FACTIONS } from "@game/data";
import type { TowerBlockCompletionRecapModel } from "../../runtime/TowerBlockCompletionFlow.js";
import { towerBlockCompletionFlow } from "../../runtime/TowerBlockCompletionFlow.js";
import type { TowerAccessState } from "../../state/TowerNavigationActions.js";
import { useGameServices } from "../../state/GameContext.js";
import { UI_MODULE_IDS } from "../navigation/moduleIds.js";
import { useNavigation } from "../navigation/useNavigation.js";
import { ActivityResultPopup } from "./ActivityResultPopup.js";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function factionName(factionId: string): string {
  return FACTION_CAPE_FACTIONS.find((entry) => entry.factionId === factionId)?.displayName ?? factionId;
}

function accessMessage(access: TowerAccessState): string {
  if (access.canEnter) return `Compatible · équipement T${String(access.requiredTier)} maximum`;
  if (access.reason === "equipment_tier_locked") {
    return `Incompatible · T${String(access.highestEquippedTier ?? access.requiredTier + 1)} détecté, T${String(access.requiredTier)} maximum`;
  }
  if (access.reason === "weapon_required") return "Incompatible · une arme doit être équipée";
  if (access.reason === "activity_busy") return "Indisponible · une autre activité de combat est active";
  if (access.reason === "research_locked") return "Indisponible · recherche de la Tour requise";
  return "Bloc suivant indisponible";
}

export function TowerBlockRecapPopup({
  recap,
}: {
  readonly recap: TowerBlockCompletionRecapModel;
}): JSX.Element {
  const services = useGameServices();
  const navigation = useNavigation();
  const access = services.getTowerState().access;
  const completedFaction = factionName(recap.factionId);
  const nextFaction = factionName(recap.nextFactionId);
  const hasFirstClearBonus = recap.firstClearBlockBonusSilver > 0;
  const hasMajorBossBonus = recap.majorBossFirstClearBonusSilver > 0;

  return (
    <ActivityResultPopup
      title={recap.unlockedEndlessNow ? "Palier majeur terminé" : "Bloc terminé"}
      titleId="tower-block-recap-title"
      badge={`T${String(recap.tier)}`}
      summary={(
        <>
          <strong>{completedFaction}</strong>
          <span>Étages {recap.floorStart}–{recap.floorEnd} terminés</span>
        </>
      )}
      footer={(
        <>
          <button
            type="button"
            className="dungeon-recap__action dungeon-recap__action--secondary"
            onClick={() => {
              towerBlockCompletionFlow.dismiss();
              navigation.openModule(UI_MODULE_IDS.character);
            }}
          >
            Adapter mon équipement
          </button>
          <button
            type="button"
            className="dungeon-recap__action dungeon-recap__action--primary"
            disabled={!access.canEnter}
            title={access.canEnter ? undefined : accessMessage(access)}
            onClick={() => {
              if (services.startTower()) towerBlockCompletionFlow.dismiss();
            }}
          >
            Lancer le bloc suivant
          </button>
          <button
            type="button"
            className="activity-result__text-action"
            onClick={() => {
              if (services.abandonTower()) towerBlockCompletionFlow.dismiss();
            }}
          >
            Quitter la Tour
          </button>
        </>
      )}
    >
      {recap.unlockedEndlessNow ? (
        <div className="tower-block-recap__milestone">
          <strong>Endless débloqué</strong>
          <span>La Tour continue désormais au-delà de l’étage 25.</span>
        </div>
      ) : null}

      <section className="tower-block-recap__rewards" aria-label="Récompenses de fin de bloc">
        <h3>Récompenses du bloc</h3>
        <div><span>Étage final</span><strong>+{formatNumber(recap.finalFloorSilver)} Silver</strong></div>
        <div><span>Coffre de bloc</span><strong>+{formatNumber(recap.repeatableBlockChestSilver)} Silver</strong></div>
        {hasFirstClearBonus ? <div><span>Première validation</span><strong>+{formatNumber(recap.firstClearBlockBonusSilver)} Silver</strong></div> : null}
        {hasMajorBossBonus ? <div><span>Boss majeur</span><strong>+{formatNumber(recap.majorBossFirstClearBonusSilver)} Silver</strong></div> : null}
        <small>Nouveau checkpoint · étage {recap.checkpointFloor}</small>
      </section>

      <section className="tower-block-recap__next" aria-label="Prochain bloc">
        <header><small>PROCHAIN BLOC</small><strong>T{recap.nextTier} · {nextFaction}</strong></header>
        <div className="tower-block-recap__next-grid">
          <span><small>Départ</small><strong>Étage {recap.nextFloor}</strong></span>
          <span><small>Équipement</small><strong>T{access.requiredTier} max</strong></span>
        </div>
        <p className={access.canEnter ? "is-compatible" : "is-incompatible"}>{accessMessage(access)}</p>
      </section>
    </ActivityResultPopup>
  );
}
