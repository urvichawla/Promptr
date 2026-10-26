import type { CSSProperties } from "react";
import Kbd from "@/components/ui/Kbd";
import type { Shortcut } from "@/lib/api/window";

const dragRegion = { "--wails-draggable": "drag" } as CSSProperties;

export default function LauncherHeader({ shortcut }: { shortcut: Shortcut | null }) {
  return (
    <div style={dragRegion} className="flex h-11 shrink-0 items-center justify-end px-5">
      {shortcut?.registered && (
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400" title="Open Promptr from any app">
          <Kbd>{shortcut.label}</Kbd>
        </span>
      )}
      {shortcut && !shortcut.registered && (
        <span title={shortcut.error} className="text-[11px] text-amber-600 dark:text-amber-400">
          Shortcut unavailable
        </span>
      )}
    </div>
  );
}
