import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./contextHoverTooltip.css";

interface ContextHoverTooltipProps {
  readonly tooltip: ReactNode;
  readonly children: ReactNode;
}

function clampTooltipPosition(x: number, y: number): { readonly left: number; readonly top: number } {
  const width = 320;
  const height = 260;
  return {
    left: Math.max(8, Math.min(x + 16, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(y + 16, window.innerHeight - height - 8)),
  };
}

export function ContextHoverTooltip({
  tooltip,
  children,
}: ContextHoverTooltipProps): JSX.Element {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const showFromTarget = (target: HTMLElement): void => {
    const rect = target.getBoundingClientRect();
    setPosition({ x: rect.right, y: rect.top });
  };

  return (
    <div
      className="context-hover-target"
      tabIndex={0}
      onMouseEnter={(event) => {
        setPosition({ x: event.clientX, y: event.clientY });
      }}
      onMouseMove={(event) => {
        setPosition({ x: event.clientX, y: event.clientY });
      }}
      onMouseLeave={() => { setPosition(null); }}
      onFocus={(event) => { showFromTarget(event.currentTarget); }}
      onBlur={() => { setPosition(null); }}
    >
      {children}
      {position !== null && createPortal(
        <div
          className="context-hover-tooltip"
          style={clampTooltipPosition(position.x, position.y)}
          role="tooltip"
        >
          {tooltip}
        </div>,
        document.body,
      )}
    </div>
  );
}
