import { Plus, Search, X } from "lucide-react";
import type { KeyboardEvent, RefObject } from "react";
import Kbd from "@/components/ui/Kbd";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onNewPrompt: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

export default function SearchBar({ value, onChange, onKeyDown, onNewPrompt, inputRef }: SearchBarProps) {
  return (
    <div className="flex items-center gap-3 px-5">
      <div className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 transition-colors focus-within:border-blue-400/70 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.04] dark:focus-within:bg-white/[0.06]">
        <Search className="size-[17px] shrink-0 text-slate-400" strokeWidth={2.2} />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search prompts, tags or content…"
          spellCheck={false}
          autoComplete="off"
          className="h-full flex-1 bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
        />
        {value ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </button>
        ) : (
          <Kbd>⌘ K</Kbd>
        )}
      </div>
      <button
        type="button"
        onClick={onNewPrompt}
        title="New prompt (⌘N)"
        aria-label="New prompt"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-400/15 dark:text-blue-300 dark:hover:bg-blue-400/25"
      >
        <Plus className="size-5" strokeWidth={2.4} />
      </button>
    </div>
  );
}
