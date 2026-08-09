import type { HTMLAttributes, ReactNode } from "react";

export interface PanelSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly elevated?: boolean;
}

export function PanelSurface({
  children,
  className = "",
  elevated = false,
  ...props
}: PanelSurfaceProps): JSX.Element {
  const classes = ["ui-panel-surface", elevated ? "ui-panel-surface--elevated" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
