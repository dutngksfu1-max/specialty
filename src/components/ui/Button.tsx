import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Button — docs/design.md 7장 규격 그대로입니다.
 *
 * 최소 터치 영역 44×44px, focus-visible 링 제거 금지.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "bg-surface text-foreground-body border border-border-strong hover:border-foreground-subtle",
  ghost: "bg-transparent text-foreground-muted hover:bg-surface-muted",
  destructive: "bg-surface text-status-danger border border-status-danger hover:bg-surface-muted",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-body-sm",
  md: "h-11 px-4 text-body",
  lg: "h-13 px-6 text-body-lg font-semibold",
};

export const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium " +
  "transition-colors duration-[120ms] ease-out-soft " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-foreground-disabled " +
  "disabled:border-border disabled:hover:bg-surface-muted";

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(BUTTON_BASE, VARIANT_CLASS[variant], SIZE_CLASS[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
