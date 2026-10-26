import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  body?: string;
  tone?: "neutral" | "error";
  action?: ReactNode;
};

export default function EmptyState({ icon, title, body, tone = "neutral", action }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div
        className={`flex size-11 items-center justify-center rounded-full ${
          tone === "error"
            ? "bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400"
            : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
        }`}
      >
        {icon}
      </div>
      <div className="mt-3.5 text-[14px] font-semibold text-slate-800 dark:text-slate-100">{title}</div>
      {body && <div className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-slate-500">{body}</div>}
      {action && <div className="mt-4 flex gap-2">{action}</div>}
    </div>
  );
}
