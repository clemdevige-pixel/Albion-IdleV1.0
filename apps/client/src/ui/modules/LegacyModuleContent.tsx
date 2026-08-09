import { VendorPanel } from "../../panels/VendorPanel";
import { WalletPanel } from "../../panels/WalletPanel";

export function LegacyModuleContent(): JSX.Element {
  return (
    <div className="ui-right-panel__legacy">
      <WalletPanel />
      <VendorPanel />
    </div>
  );
}
