import { Check, Copy, Ellipsis, Pencil, SendHorizontal, Star, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { promptIcon, updatedAgo } from "@/lib/prompts/appearance";
import type { Prompt } from "@/lib/prompts/types";
import RowMenu from "@/components/prompt/RowMenu";
import TagChip from "@/components/ui/TagChip";

const PREVIEW_CHARS = 280;

type PromptRowProps = {
  prompt: Prompt;
  selected: boolean;
  copied: boolean;
  activeTag: string | null;
  onSelect: () => void;
  onTagClick: (tag: string) => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
};

export default function PromptRow({
  prompt,
  selected,
  copied,
  activeTag,
  onSelect,
  onTagClick,
  onToggleFavorite,
  onEdit,
  onDelete,
  onCopy,
  onPaste,
}: PromptRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { icon: Icon, tone } = promptIcon(prompt);
  const tag = prompt.tags[0];
  const preview = prompt.content.length > PREVIEW_CHARS ? `${prompt.content.slice(0, PREVIEW_CHARS)}…` : prompt.content;

  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <li
      ref={rowRef}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest("button")) onEdit();
      }}
      className={`group relative flex gap-4 rounded-2xl px-4 py-4 transition-colors ${
        selected
          ? "bg-slate-50 ring-1 ring-slate-200/80 dark:bg-white/[0.05] dark:ring-white/10"
          : "hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
      }`}
    >
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone.tile}`}>
        <Icon className="size-[22px]" strokeWidth={2.1} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 truncate pt-0.5 text-[14.5px] font-semibold text-slate-900 dark:text-white">
            {prompt.title}
          </h3>
          <div className="-mt-1 -mr-1 flex shrink-0 items-center">
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={prompt.favorite}
              aria-label={prompt.favorite ? "Unstar prompt" : "Star prompt"}
              title={prompt.favorite ? "Unstar" : "Star"}
              className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
                prompt.favorite
                  ? "text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10"
                  : "text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
              }`}
            >
              <Star className="size-[18px]" strokeWidth={2} fill={prompt.favorite ? "currentColor" : "none"} />
            </button>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-slate-200 ${
                menuOpen ? "bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-200" : ""
              }`}
            >
              <Ellipsis className="size-[18px]" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {tag && (
          <div className="mt-1.5 flex">
            <TagChip label={tag} active={activeTag === tag} onClick={() => onTagClick(tag)} />
          </div>
        )}

        <div className="mt-2 flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{preview}</p>
            <p className="mt-1.5 text-[11.5px] text-slate-400 dark:text-slate-500">{updatedAgo(prompt.updatedAt)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              title="Copy prompt (↩)"
              className={`flex h-9 min-w-[84px] items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                copied
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
              }`}
            >
              {copied ? <Check className="size-4" strokeWidth={2.4} /> : <Copy className="size-4" strokeWidth={2} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={onPaste}
              title="Paste into an app (⌘↩ pastes into the last one)"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ink-soft dark:bg-white dark:text-ink dark:hover:bg-slate-200"
            >
              <SendHorizontal className="size-[15px]" strokeWidth={2.2} />
              Paste into App
            </button>
          </div>
        </div>
      </div>

      {menuOpen && menuButtonRef.current && (
        <RowMenu
          anchor={menuButtonRef.current}
          onClose={() => setMenuOpen(false)}
          items={[
            { label: "Edit", icon: Pencil, hint: "⌘E", onSelect: onEdit },
            { label: "Copy", icon: Copy, hint: "↩", onSelect: onCopy },
            {
              label: prompt.favorite ? "Unstar" : "Star",
              icon: Star,
              onSelect: onToggleFavorite,
            },
            { label: "Delete", icon: Trash2, danger: true, onSelect: onDelete },
          ]}
        />
      )}
    </li>
  );
}
