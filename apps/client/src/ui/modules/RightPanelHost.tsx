import { useNavigation } from "../navigation";
import { UI_MODULE_IDS } from "../navigation/moduleIds";
import { UI_MODULE_LABELS } from "../navigation/moduleCatalog";
import { ModuleHeader } from "../shared";
import { DashboardModule } from "../dashboard";
import { CharacterModule } from "../character";
import { InventoryModule } from "../inventory";
import { MasteriesModule } from "../masteries";
import { ProductionModule } from "../production";
import { MerchantModule } from "../merchant";

export function RightPanelHost(): JSX.Element {
  const { activeModule, returnToDashboard } = useNavigation();

  const isDashboard = activeModule === UI_MODULE_IDS.dashboard;
  const isCharacter = activeModule === UI_MODULE_IDS.character;
  const isInventory = activeModule === UI_MODULE_IDS.inventory;
  const isMasteries = activeModule === UI_MODULE_IDS.masteries;
  const isProduction = activeModule === UI_MODULE_IDS.production;
  const isMerchant = activeModule === UI_MODULE_IDS.merchant;

  return (
    <aside className="ui-right-panel" aria-label="Panneau principal">
      <div className="ui-right-panel__header">
        <ModuleHeader
          eyebrow={isDashboard ? "Vue permanente" : "Module"}
          title={UI_MODULE_LABELS[activeModule]}
          actions={
            isDashboard ? undefined : (
              <button
                className="ui-right-panel__close"
                type="button"
                aria-label="Retour au tableau de bord"
                onClick={returnToDashboard}
              >
                ×
              </button>
            )
          }
        />
      </div>

      <div className="ui-right-panel__content">
        {isDashboard ? (
          <DashboardModule />
        ) : isCharacter ? (
          <CharacterModule />
        ) : isInventory ? (
          <InventoryModule />
        ) : isMasteries ? (
          <MasteriesModule />
        ) : isProduction ? (
          <ProductionModule />
        ) : isMerchant ? (
          <MerchantModule />
        ) : (
          <DashboardModule />
        )}
      </div>
    </aside>
  );
}
