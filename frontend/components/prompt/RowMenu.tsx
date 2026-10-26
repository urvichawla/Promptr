import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export type MenuItem = {
  label: string;
  icon: LucideIcon;
  hint?: string;
  danger?: boolean;
  onSelect: () => void;
};

type RowMenuProps = {
  anchor: HTMLElement;
  items: MenuItem[];
  onClose: () => void;
};

const MENU_WIDTH = 188;

export default function RowMenu({ anchor, items, onClose }: RowMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? rect.top - height - 6 : below;
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPosition({ top, left });
  }, [anchor]);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onClose);
    };
  }, [anchor, onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ top: position?.top ?? -9999, left: position?.left ?? -9999, width: MENU_WIDTH }}
      className="fixed z-50 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgb(15_23_42/0.25)] dark:border-white/10 dark:bg-neutral-800"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={`flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] ${
            item.danger
              ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.07]"
          }`}
        >
          <item.icon className="size-4 shrink-0 opacity-80" strokeWidth={2} />
          <span className="flex-1">{item.label}</span>
          {item.hint && <span className="text-[11px] text-slate-400">{item.hint}</span>}
        </button>
      ))}
    </div>
  );
}
