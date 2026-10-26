import type { ReactNode } from "react";

type ButtonProps = { onClick: () => void; children: ReactNode };

const base = "h-9 rounded-lg px-4 text-[13px] font-medium";

export function PrimaryButton({ onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${base} bg-ink text-white hover:bg-ink-soft dark:bg-white dark:text-ink dark:hover:bg-slate-200`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${base} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]`}
    >
      {children}
    </button>
  );
}
