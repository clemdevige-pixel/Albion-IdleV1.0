import { useMemo, useState } from "react";
import type { ItemInstanceId } from "@game/gameplay";
import { getItemDisplayName, ItemVisual } from "../../../panels/ItemVisual";
import { useGameBridge, useGameServices } from "../../../state/GameContext";
import { useNavigation } from "../../navigation";
import { UI_MODULE_IDS } from "../../navigation/moduleIds";
import { DashboardCard } from "./DashboardCard";

interface EnchantReadyItem {
  readonly instanceId: string;
  readonly itemId: string;
  readonly currentLevel: number;
  readonly nextLevel: number;
}

export function DashboardEnchantReadyCard(): JSX.Element | null {
  const bridge = useGameBridge();
  const { enchantmentService } = useGameServices();
  const navigation = useNavigation();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());

  const readyItems = useMemo<readonly EnchantReadyItem[]>(() => {
    const instances = [
      ...bridge.equipment.slots,
      ...bridge.inventory.slots,
      ...bridge.bank.slots,
    ];
    const seen = new Set<string>();
    const ready: EnchantReadyItem[] = [];

    for (const slot of instances) {
      if (slot.itemId === undefined || slot.instanceId === undefined || seen.has(slot.instanceId)) continue;
      seen.add(slot.instanceId);
      const preview = enchantmentService.preview(slot.instanceId as ItemInstanceId);
      if (preview?.nextLevel === undefined) continue;
      const economicallyReady = preview.materials.every((material) => material.missing === 0)
        && bridge.wallet.silver >= preview.silverCost;
      const onlyBlockedByCombat = preview.failureReason === undefined || preview.failureReason === "combat_active";
      if (!economicallyReady || !onlyBlockedByCombat) continue;
      ready.push({
        instanceId: slot.instanceId,
        itemId: slot.itemId,
        currentLevel: preview.currentLevel,
        nextLevel: preview.nextLevel,
      });
    }
    return ready;
  }, [bridge, enchantmentService]);

  const visible = readyItems.filter((item) => !hidden.has(`${item.instanceId}:${String(item.nextLevel)}`));
  if (visible.length === 0) return null;

  return (
    <DashboardCard
      title="Enchantement prêt"
      iconSrc="/assets/ui/nav-merchant.png"
      className="dashboard-card--enchant-ready"
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
