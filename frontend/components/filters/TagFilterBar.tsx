import { Star } from "lucide-react";
import TagChip from "@/components/ui/TagChip";

type TagFilterBarProps = {
  tags: string[];
  selected: string | null;
  starredOnly: boolean;
  onToggle: (tag: string) => void;
  onClear: () => void;
  onToggleStarred: () => void;
};

export default function TagFilterBar({
  tags,
  selected,
  starredOnly,
  onToggle,
  onClear,
  onToggleStarred,
}: TagFilterBarProps) {
  const showingAll = selected === null && !starredOnly;

  return (
    <div className="flex items-center gap-3 px-5 pt-4 pb-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
          aria-pressed={showingAll}
          className={`h-7 shrink-0 rounded-full px-3.5 text-[12.5px] font-medium transition-colors ${
            showingAll
              ? "bg-ink text-white dark:bg-white dark:text-ink"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10"
          }`}
        >
          All
        </button>
        {tags.map((tag) => (
          <TagChip key={tag} label={tag} size="md" active={selected === tag} onClick={() => onToggle(tag)} />
        ))}
      </div>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggleStarred}
        aria-pressed={starredOnly}
        title={starredOnly ? "Show all prompts" : "Show starred prompts only"}
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          starredOnly
            ? "bg-amber-50 text-amber-500 dark:bg-amber-400/15 dark:text-amber-300"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
        }`}
      >
        <Star className="size-[17px]" strokeWidth={2.2} fill={starredOnly ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
