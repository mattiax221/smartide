import type { ReactNode } from "react";

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: "right" | "top";
}

export function Tooltip({ label, children, side = "right" }: TooltipProps) {
  return (
    <span className={`ui-tooltip ui-tooltip--${side}`} data-tooltip={label}>
      {children}
    </span>
  );
}
