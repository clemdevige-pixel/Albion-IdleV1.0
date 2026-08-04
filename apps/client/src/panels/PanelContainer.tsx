import type { ReactNode } from "react";

export interface PanelContainerProps {
  readonly title: string;
  readonly onClose?: () => void;
  readonly children: ReactNode;
}

/**
 * Generic panel wrapper — title bar, optional close button, styled content area.
 */
export function PanelContainer({ title, onClose, children }: PanelContainerProps): JSX.Element {
  return (
    <section className="panel">
      <div className="panel__header">
        <h3 className="panel__title">{title}</h3>
        {onClose != null && (
          <button className="panel__close" onClick={onClose} type="button" aria-label="Close">
            {"✕"}
          </button>
        )}
      </div>
      <div className="panel__body">{children}</div>
    </section>
  );
}
