import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "subtle";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "ghost", className = "", children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={`ui-btn ui-btn--${variant} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
