import { useState } from "react";
import { getItemDisplayName, ItemVisual } from "../../../panels/ItemVisual";
import { usePlayerAttention } from "../../attention/usePlayerAttention";
import { useNavigation } from "../../navigation";
import { UI_MODULE_IDS } from "../../navigation/moduleIds";
import { DashboardCard } from "./DashboardCard";

export function DashboardEnchantReadyCard(): JSX.Element | null {
  const navigation = useNavigation();
  const { enchantReadyItems } = usePlayerAttention();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());

  const visible = enchantReadyItems.filter((item) => !hidden.has(`${item.instanceId}:${String(item.nextLevel)}`));
  if (visible.length === 0) return null;

  return (
    <DashboardCard
      sectionId="enchant-ready"
      meta={visible.length > 1 ? `${String(visible.length)} objets` : undefined}
    >
      <div className="dashboard-production__list">
        {visible.map((item) => {
          const hideKey = `${item.instanceId}:${String(item.nextLevel)}`;
          return (
            <div key={hideKey} className="dashboard-production__task">
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
                aria-label={`Masquer ${getItemDisplayName(item.itemId)}`}
                title="Masquer cette alerte"
                onClick={() => {
                  setHidden((current) => new Set([...current, hideKey]));
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
