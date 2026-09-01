import type { ReactNode } from "react";
import "./expeditionRecap.css";
import "./activityResult.css";

export function ActivityResultPopup({
  title,
  titleId,
  badge,
  summary,
  tone = "success",
  className,
  children,
  footer,
}: {
  readonly title: string;
  readonly titleId: string;
  readonly badge: string;
  readonly summary: ReactNode;
  readonly tone?: "success" | "failure";
  readonly className?: string;
  readonly children?: ReactNode;
  readonly footer: ReactNode;
}): JSX.Element {
  return (
    <div className="expedition-recap-backdrop dungeon-recap-backdrop" role="presentation">
      <section
        className={`expedition-recap dungeon-recap activity-result activity-result--${tone}${className === undefined ? "" : ` ${className}`}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dungeon-recap__header activity-result__header">
          <h2 id={titleId}>{title}</h2>
          <span className="expedition-recap__counter activity-result__badge">{badge}</span>
        </header>

        <div className="dungeon-recap__summary activity-result__summary">{summary}</div>
        {children}
        <footer className="dungeon-recap__footer activity-result__footer">{footer}</footer>
      </section>
    </div>
  );
}
