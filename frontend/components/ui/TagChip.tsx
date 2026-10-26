import { X } from "lucide-react";
import { tagTone } from "@/lib/prompts/appearance";

type TagChipProps = {
  label: string;
  active?: boolean;
  size?: "sm" | "md";
  title?: string;
  onClick?: () => void;
  onRemove?: () => void;
};

export default function TagChip({ label, active, size = "sm", title, onClick, onRemove }: TagChipProps) {
  const tone = tagTone(label);
  const sizing = size === "md" ? "h-7 px-3 text-[12.5px]" : "h-[22px] px-2.5 text-[11.5px]";
  const className = `inline-flex shrink-0 items-center gap-1 rounded-full font-medium leading-none transition-colors ${sizing} ${tone.chip} ${
    active ? "ring-2 ring-current/40 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900" : ""
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-pressed={active}
        title={title ?? (active ? `Remove ${label} filter` : `Filter by ${label}`)}
        className={`${className} hover:brightness-[0.97] dark:hover:brightness-125`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={className}>
      {label}
      {onRemove && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRemove}
          tabIndex={-1}
          aria-label={`Remove tag ${label}`}
          className="-mr-1 rounded-full p-0.5 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}
