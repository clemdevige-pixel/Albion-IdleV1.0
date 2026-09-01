import { getItemDisplayName, ItemVisual } from "../../../panels/ItemVisual";
import { usePlayerAttention } from "../../attention/usePlayerAttention";
import { useNavigation } from "../../navigation";
import { UI_MODULE_IDS } from "../../navigation/moduleIds";
import { DashboardCard } from "./DashboardCard";

export function DashboardEnchantReadyCard(): JSX.Element | null {
  const navigation = useNavigation();
  const { enchantReadyItems, dismissEnchantReady } = usePlayerAttention();

  if (enchantReadyItems.length === 0) return null;

  return (
    <DashboardCard
      sectionId="enchant-ready"
      meta={enchantReadyItems.length > 1 ? `${String(enchantReadyItems.length)} objets` : undefined}
    >
      <div className="dashboard-production__list">
        {enchantReadyItems.map((item) => {
          const attentionKey = `${item.instanceId}:${String(item.nextLevel)}`;
          return (
            <div key={attentionKey} className="dashboard-production__task">
              <button
                type="button"
                className="dashboard-production__task-main"
                onClick={() => {
                  navigation.openModule(UI_MODULE_IDS.merchant, `enchant:${item.instanceId}`);
                }}
                title="Ouvrir l'enchanteur"
              >
                <span className="dashboard-production__visual" aria-hidden="true">
                  <ItemVisual itemId={item.itemId} />
                </span>
                <div>
                  <span>Prêt à enchanter</span>
                  <strong>{getItemDisplayName(item.itemId)}</strong>
                  <small>.{String(item.currentLevel)} → .{String(item.nextLevel)}</small>
                </div>
              </button>
              <button
                type="button"
                aria-label={`Ne plus signaler ${getItemDisplayName(item.itemId)}`}
                title="Ne plus signaler cet objet"
                onClick={() => {
                  dismissEnchantReady(item.instanceId);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
