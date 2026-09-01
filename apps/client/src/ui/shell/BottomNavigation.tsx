import { usePlayerAttention, type PlayerAttentionSeverity } from "../attention/usePlayerAttention";
import { PRIMARY_UI_MODULES, useNavigation } from "../navigation";
import "./attentionBadges.css";

const ATTENTION_SEVERITY_RANK: Readonly<Record<PlayerAttentionSeverity, number>> = {
  action: 1,
  warning: 2,
  critical: 3,
};

export function BottomNavigation(): JSX.Element {
  const navigation = useNavigation();
  const attention = usePlayerAttention();

  return (
    <nav className="permanent-bottom-nav" aria-label="Navigation principale">
      {PRIMARY_UI_MODULES.map((module) => {
        const isActive = navigation.activeModule === module.id;
        const signals = attention.getModuleSignals(module.id);
        const strongestSignal = signals.reduce<(typeof signals)[number] | undefined>((current, signal) => (
          current === undefined || ATTENTION_SEVERITY_RANK[signal.severity] > ATTENTION_SEVERITY_RANK[current.severity]
            ? signal
            : current
        ), undefined);
        const attentionCount = signals.reduce((total, signal) => total + signal.count, 0);
        const attentionLabel = signals.map((signal) => signal.label).join(" · ");
        const badgeLabel = strongestSignal?.id === "inventory_pressure"
          ? "!"
          : attentionCount > 9
            ? "9+"
            : String(attentionCount);

        return (
          <button
            key={module.id}
            type="button"
            className={`permanent-bottom-nav__item${isActive ? " is-active" : ""}`}
            aria-pressed={isActive}
            aria-label={attentionLabel.length > 0 ? `${module.label} · ${attentionLabel}` : module.label}
            title={attentionLabel.length > 0 ? attentionLabel : undefined}
            onClick={() => { navigation.toggleModule(module.id); }}
          >
            <span className="permanent-bottom-nav__icon" aria-hidden="true">
              <img src={`/assets/ui/${module.icon ?? ""}`} alt="" draggable={false} />
            </span>
            <span className="permanent-bottom-nav__label">{module.label}</span>
            {strongestSignal !== undefined && (
              <span
                className={`permanent-bottom-nav__attention permanent-bottom-nav__attention--${strongestSignal.severity}`}
                aria-hidden="true"
              >
                {badgeLabel}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
