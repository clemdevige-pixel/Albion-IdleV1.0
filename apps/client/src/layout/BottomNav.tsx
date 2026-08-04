import { usePanelManager } from "../panels/usePanelManager";

export interface NavTab {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
}

const TABS: readonly NavTab[] = [
  { id: "inventory", label: "Banque", icon: "nav-inventory.png" },
  { id: "character", label: "Personnage", icon: "nav-character.png" },
  { id: "masteries", label: "Maîtrises", icon: "nav-masteries.png" },
  { id: "vendor", label: "Marchand", icon: "nav-vendor.png" },
  { id: "gathering", label: "Production", icon: "nav-production.png" },
] as const;

export function BottomNav(): JSX.Element {
  const { activePanel, togglePanel } = usePanelManager();

  return (
    <nav className="bottomnav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottomnav__tab${
            activePanel === tab.id ? " bottomnav__tab--active" : ""
          }`}
          onClick={() => {
            togglePanel(tab.id);
          }}
        >
          <span className="bottomnav__icon">
            <img src={`/assets/ui/${tab.icon}`} alt="" draggable={false} />
          </span>
          <span className="bottomnav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
