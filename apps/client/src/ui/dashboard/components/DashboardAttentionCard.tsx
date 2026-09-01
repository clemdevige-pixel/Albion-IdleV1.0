import { RESEARCH_UNLOCK_IDS } from "@game/data";
import { usePlayerAttention, type PlayerAttentionSeverity } from "../../attention/usePlayerAttention";
import { useNavigation } from "../../navigation";
import type { UiModuleId } from "../../navigation/moduleIds";
import { UI_MODULE_IDS } from "../../navigation/moduleIds";
import { PanelSurface } from "../../shared";
import "./DashboardAttentionCard.css";

interface DashboardAttentionAction {
  readonly key: string;
  readonly label: string;
  readonly severity: PlayerAttentionSeverity;
  readonly moduleId: UiModuleId;
  readonly view?: string;
}

const SEVERITY_RANK: Readonly<Record<PlayerAttentionSeverity, number>> = {
  critical: 0,
  warning: 1,
  action: 2,
};

function resolveFeatureView(unlockId: string): string | undefined {
  switch (unlockId) {
    case RESEARCH_UNLOCK_IDS.silverExpeditionTier4:
    case RESEARCH_UNLOCK_IDS.factionExpeditionTier4:
    case RESEARCH_UNLOCK_IDS.secondExpeditionSlot:
      return "academy_expeditions";
    case RESEARCH_UNLOCK_IDS.advancedWorkerOrganization:
      return "worker_house";
    case RESEARCH_UNLOCK_IDS.instantRefining:
      return "refining";
    case RESEARCH_UNLOCK_IDS.enchantmentService:
      return "enchant";
    case RESEARCH_UNLOCK_IDS.blackMarket:
      return "black_market";
    case RESEARCH_UNLOCK_IDS.resourceYieldTracking:
      return "resources";
    case RESEARCH_UNLOCK_IDS.advancedBankManagement:
      return "bank";
    case RESEARCH_UNLOCK_IDS.dungeonSystem:
    case RESEARCH_UNLOCK_IDS.factionRuneWorldDrop:
      return "dungeons";
    case RESEARCH_UNLOCK_IDS.towerSystem:
      return "tower";
    default:
      return undefined;
  }
}

function resolveSignalView(signalId: string): string | undefined {
  if (signalId === "worker_idle") return "worker_attention";
  if (signalId === "expedition_idle") return "academy_expeditions";
  return undefined;
}

function destinationLabel(moduleId: UiModuleId, view?: string): string {
  if (moduleId === UI_MODULE_IDS.inventory && view === "bank") return "Banque";
  if (moduleId === UI_MODULE_IDS.inventory && view === "resources") return "Ressources";
  if (moduleId === UI_MODULE_IDS.merchant && view === "enchant") return "Enchanter";
  if (moduleId === UI_MODULE_IDS.merchant && view === "black_market") return "Marché Noir";
  if (moduleId === UI_MODULE_IDS.world && view === "dungeons") return "Donjons";
  if (moduleId === UI_MODULE_IDS.world && view === "tower") return "Tour";
  if (moduleId === UI_MODULE_IDS.island && view === "academy_expeditions") return "Expéditions";
  if (moduleId === UI_MODULE_IDS.island && view === "worker_house") return "Maison des ouvriers";
  if (moduleId === UI_MODULE_IDS.island && view === "worker_attention") return "Ouvrier concerné";
  if (moduleId === UI_MODULE_IDS.island && view === "refining") return "Raffinage";
  if (moduleId === UI_MODULE_IDS.inventory) return "Inventaire";
  if (moduleId === UI_MODULE_IDS.island) return "Île";
  if (moduleId === UI_MODULE_IDS.merchant) return "Marchand";
  if (moduleId === UI_MODULE_IDS.world) return "Monde";
  return "Voir";
}

export function DashboardAttentionCard(): JSX.Element | null {
  const navigation = useNavigation();
  const attention = usePlayerAttention();

  const actions: DashboardAttentionAction[] = attention.signals
    .filter((signal) => signal.id !== "enchant_ready" && signal.id !== "feature_unlocked")
    .map((signal) => ({
      key: signal.id,
      label: signal.label,
      severity: signal.severity,
      moduleId: signal.moduleId,
      view: resolveSignalView(signal.id),
    }));

  for (const unlock of attention.pendingFeatureUnlocks) {
    actions.push({
      key: `feature:${unlock.unlockId}`,
      label: unlock.label,
      severity: "action",
      moduleId: unlock.moduleId,
      view: resolveFeatureView(unlock.unlockId),
    });
  }

  actions.sort((left, right) => SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]);

  if (actions.length === 0) return null;

  return (
    <PanelSurface className="dashboard-attention-card">
      <div className="dashboard-attention-card__list">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={`dashboard-attention-card__row is-${action.severity}`}
            onClick={() => { navigation.openModule(action.moduleId, action.view); }}
          >
            <span className="dashboard-attention-card__marker" aria-hidden="true" />
            <strong>{action.label}</strong>
            <span>{destinationLabel(action.moduleId, action.view)} →</span>
          </button>
        ))}
      </div>
    </PanelSurface>
  );
}
