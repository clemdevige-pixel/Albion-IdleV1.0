import type { HTMLAttributes, ReactNode } from "react";

export interface PanelSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function PanelSurface({
  children,
  className = "",
  ...props
}: PanelSurfaceProps): JSX.Element {
  const classes = ["ui-panel-surface", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
