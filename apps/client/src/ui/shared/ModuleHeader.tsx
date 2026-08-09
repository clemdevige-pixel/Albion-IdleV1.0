import type { ReactNode } from "react";

export interface ModuleHeaderProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}

export function ModuleHeader({
  title,
  eyebrow,
  description,
  actions,
}: ModuleHeaderProps): JSX.Element {
  return (
    <header className="ui-module-header">
      <div className="ui-module-header__copy">
        {eyebrow !== undefined && <span className="ui-module-header__eyebrow">{eyebrow}</span>}
        <h2 className="ui-module-header__title">{title}</h2>
        {description !== undefined && (
          <p className="ui-module-header__description">{description}</p>
        )}
      </div>
      {actions !== undefined && <div className="ui-module-header__actions">{actions}</div>}
    </header>
  );
}
