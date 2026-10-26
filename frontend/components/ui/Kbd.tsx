import type { ReactNode } from "react";

export default function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 font-sans text-[10.5px] font-medium text-slate-500 shadow-[0_1px_0_rgb(15_23_42/0.04)] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400">
      {children}
    </kbd>
  );
}
