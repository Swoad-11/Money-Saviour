import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-strong dark:hover:opacity-90 border-transparent",
  secondary: "bg-surface text-ink border-line hover:bg-surface-muted",
  ghost: "bg-transparent text-muted border-transparent hover:bg-surface-muted hover:text-ink",
  danger: "bg-surface text-danger border-line hover:bg-danger-soft",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-[13px]"
      } ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-muted focus:border-primary focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-primary/25 ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "info" | "warning" | "danger" | "success"; children: ReactNode }) {
  const tones = {
    info: "border-line bg-surface-muted text-ink",
    warning: "border-warning/30 bg-warning-soft text-ink",
    danger: "border-danger/30 bg-danger-soft text-ink",
    success: "border-primary/30 bg-primary-soft text-ink",
  };
  return <div className={`rounded-lg border px-3 py-2.5 text-[13px] ${tones[tone]}`}>{children}</div>;
}
