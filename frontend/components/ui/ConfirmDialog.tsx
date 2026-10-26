import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type ConfirmDialogProps = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/20 p-6 dark:bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-[420px] rounded-2xl border border-slate-200/80 bg-white px-6 pt-5 pb-5 shadow-[0_24px_60px_-16px_rgb(15_23_42/0.35)] dark:border-white/[0.08] dark:bg-[#2b2b2d] dark:shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6)]"
      >
        <h3 id="confirm-title" className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-white">
          {title}
        </h3>
        <p id="confirm-message" className="mt-2 text-[14px] leading-[1.55] text-slate-500 dark:text-[#a3a3a8]">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl bg-slate-100 px-4 text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-200/80 dark:bg-white/[0.12] dark:text-white dark:hover:bg-white/[0.18]"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-xl border border-red-300 bg-red-50/60 px-4 text-[14px] font-medium text-red-600 shadow-[0_0_0_3px_rgb(239_68_68/0.12)] outline-none transition-colors hover:border-red-400 hover:bg-red-50 focus-visible:shadow-[0_0_0_3px_rgb(239_68_68/0.25)] dark:border-red-500/70 dark:bg-red-500/[0.12] dark:text-red-400 dark:shadow-[0_0_14px_-2px_rgb(239_68_68/0.45)] dark:hover:bg-red-500/[0.2]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
