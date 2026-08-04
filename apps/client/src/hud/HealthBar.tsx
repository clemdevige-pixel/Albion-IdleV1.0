interface HealthBarProps {
  readonly current: number;
  readonly max: number;
  readonly color?: string;
  readonly label?: string;
}

/**
 * Reusable health bar with smooth CSS transitions.
 */
export function HealthBar({ current, max, color, label }: HealthBarProps): JSX.Element {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const percent = `${String(Math.round(ratio * 100))}%`;

  // Default green->red gradient based on ratio
  const fillColor = color ?? (ratio > 0.5 ? "var(--accent-green)" : "var(--accent-red)");

  return (
    <div className="health-bar">
      {label !== undefined && <span className="health-bar__label">{label}</span>}
      <div className="health-bar__track">
        <div
          className="health-bar__fill"
          style={{ width: percent, backgroundColor: fillColor }}
        />
      </div>
      <span className="health-bar__text">
        {String(Math.ceil(current))} / {String(Math.ceil(max))}
      </span>
    </div>
  );
}
