import { usePanelManager } from "../panels/usePanelManager";
import { PRIMARY_UI_MODULES } from "../ui/navigation";

export function BottomNav(): JSX.Element {
  const { activePanel, togglePanel } = usePanelManager();

  return (
    <nav className="bottomnav">
      {PRIMARY_UI_MODULES.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottomnav__tab${activePanel === tab.id ? " bottomnav__tab--active" : ""}`}
          onClick={() => {
            togglePanel(tab.id);
          }}
        >
          <span className="bottomnav__icon">
            <img src={`/assets/ui/${tab.icon ?? ""}`} alt="" draggable={false} />
          </span>
          <span className="bottomnav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
