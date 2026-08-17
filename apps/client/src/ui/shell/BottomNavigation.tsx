import { PRIMARY_UI_MODULES, useNavigation } from "../navigation";

export function BottomNavigation(): JSX.Element {
  const navigation = useNavigation();

  return (
    <nav className="permanent-bottom-nav" aria-label="Navigation principale">
      {PRIMARY_UI_MODULES.map((module, index) => {
        const isActive = navigation.activeModule === module.id;
        return (
          <button
            key={module.id}
            type="button"
            className={`permanent-bottom-nav__item${isActive ? " is-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => { navigation.toggleModule(module.id); }}
          >
            <span className="permanent-bottom-nav__index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="permanent-bottom-nav__icon" aria-hidden="true">
              <img src={`/assets/ui/${module.icon ?? ""}`} alt="" draggable={false} />
            </span>
            <span className="permanent-bottom-nav__label">{module.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
