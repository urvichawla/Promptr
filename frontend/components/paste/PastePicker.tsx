import { AppWindow, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PasteTarget, PasteTargets } from "@/lib/api/paste";
import Kbd from "@/components/ui/Kbd";

type PastePickerProps = {
  promptTitle: string;
  targets: PasteTargets;
  onChoose: (target: PasteTarget) => void;
  onClose: () => void;
};

function usable(target: PasteTarget): boolean {
  return target.id !== "previous" || target.detail !== "";
}

export default function PastePicker({ promptTitle, targets, onChoose, onClose }: PastePickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const list = targets.targets;
  const initial = Math.max(0, list.findIndex((t) => t.id === targets.selected && usable(t)));
  const [active, setActive] = useState(initial);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const choose = (index: number) => {
    const target = list[index];
    if (target && usable(target)) onChoose(target);
  };

  const move = (delta: number) => {
    setActive((current) => {
      for (let step = 1; step <= list.length; step++) {
        const next = (current + delta * step + list.length) % list.length;
        if (usable(list[next])) return next;
      }
      return current;
    });
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/25 p-6 backdrop-blur-[2px] dark:bg-black/45"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-picker-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            move(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(active);
          } else if (e.metaKey && /^[1-9]$/.test(e.key)) {
            e.preventDefault();
            choose(Number(e.key) - 1);
          }
        }}
        className="flex max-h-full w-full max-w-[400px] flex-col rounded-2xl bg-white shadow-[0_24px_60px_-12px_rgb(15_23_42/0.35)] ring-1 ring-slate-200/70 outline-none dark:bg-neutral-900 dark:ring-white/10"
      >
        <div className="flex items-start gap-3 px-6 pt-5 pb-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
            <SendHorizontal className="size-4" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="paste-picker-title" className="text-[15px] font-semibold text-slate-900 dark:text-white">
              Paste into App
            </h2>
            <p className="mt-0.5 truncate text-[12.5px] text-slate-500 dark:text-slate-400">
              Choose where to paste “{promptTitle}”
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
          >
            <X className="size-[18px]" strokeWidth={2.2} />
          </button>
        </div>

        <ul className="min-h-0 overflow-y-auto px-3 pb-3">
          {list.map((target, index) => {
            const isPrevious = target.id === "previous";
            const enabled = usable(target);
            const name = isPrevious ? target.detail || "Previous app" : target.name;
            const note = isPrevious
              ? enabled
                ? "The app you were just using"
                : "Open Promptr from another app first"
              : target.running
                ? ""
                : "Not open — prompt will be copied";
            return (
              <li key={target.id}>
                <button
                  type="button"
                  disabled={!enabled}
                  onMouseEnter={() => enabled && setActive(index)}
                  onClick={() => choose(index)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                    index === active ? "bg-slate-100 dark:bg-white/[0.07]" : ""
                  }`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    {target.icon ? (
                      <img src={target.icon} alt="" className="size-9" />
                    ) : (
                      <AppWindow className="size-5 text-slate-400" strokeWidth={2} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-slate-800 dark:text-slate-100">
                      {name}
                    </span>
                    {note && <span className="block truncate text-[11.5px] text-slate-400">{note}</span>}
                  </span>
                  {index < 9 && <Kbd>⌘ {index + 1}</Kbd>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
