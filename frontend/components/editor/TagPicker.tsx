import { Check, ChevronDown, Plus, Tag } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import Kbd from "@/components/ui/Kbd";
import TagChip from "@/components/ui/TagChip";
import { normalizeTag, TAG_MAX } from "@/lib/prompts/validation";

type TagPickerProps = {
  value: string | null;
  onChange: (tag: string | null) => void;
  text: string;
  onTextChange: (text: string) => void;
  suggestions: string[];
  counts: Record<string, number>;
  invalid: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
};

type Option = { kind: "existing" | "create"; tag: string };
type MenuPosition = { left: number; width: number; top?: number; bottom?: number };

const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 264;

export default function TagPicker({
  value,
  onChange,
  text,
  onTextChange,
  suggestions,
  counts,
  invalid,
  inputRef,
}: TagPickerProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const query = normalizeTag(text);
  const tooLong = query.length > TAG_MAX;
  const rank = (tag: string) => (query && tag.startsWith(query) ? 0 : 1);
  const existing = suggestions
    .filter((t) => !query || t.includes(query))
    .sort((a, b) => rank(a) - rank(b) || (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b));
  const canCreate = query !== "" && !suggestions.includes(query) && !tooLong;
  const options: Option[] = [
    ...existing.map((tag): Option => ({ kind: "existing", tag })),
    ...(canCreate ? [{ kind: "create", tag: query } as Option] : []),
  ];
  const active = Math.min(highlight, Math.max(0, options.length - 1));

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = fieldRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - 8;
      const spaceAbove = rect.top - MENU_GAP - 8;
      if (spaceBelow >= Math.min(MENU_MAX_HEIGHT, 180) || spaceBelow >= spaceAbove) {
        setPosition({ left: rect.left, width: rect.width, top: rect.bottom + MENU_GAP });
      } else {
        setPosition({ left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + MENU_GAP });
      }
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, value, text]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openMenu = () => {
    const current = value && !query ? options.findIndex((o) => o.tag === value) : 0;
    setHighlight(Math.max(0, current));
    setOpen(true);
  };

  const choose = (tag: string) => {
    onChange(tag);
    onTextChange("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openMenu();
      else if (options.length) setHighlight((active + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open && options.length) setHighlight((active - 1 + options.length) % options.length);
    } else if (e.key === "Enter" && !e.metaKey) {
      e.preventDefault();
      if (open && options[active]) choose(options[active].tag);
      else if (query && !tooLong) choose(query);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key === "Backspace" && !text && value) {
      e.preventDefault();
      onChange(null);
    }
  };

  const note = tooLong
    ? `Tags can be up to ${TAG_MAX} characters.`
    : options.length === 0
      ? suggestions.length === 0
        ? "Type a name to create your first tag."
        : "No matching tags."
      : null;

  return (
    <div>
      <div
        ref={fieldRef}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            inputRef.current?.focus();
            openMenu();
          }
        }}
        className={`flex min-h-11 cursor-text items-center gap-2 rounded-xl border bg-white px-2.5 py-2 transition-shadow dark:bg-white/[0.04] ${
          open ? "ring-4" : "focus-within:ring-4"
        } ${
          invalid
            ? "border-red-400 ring-red-500/10"
            : `${open ? "border-blue-400/70" : "border-slate-200 dark:border-white/10"} ring-blue-500/10 focus-within:border-blue-400/70`
        }`}
      >
        {value && !text && <TagChip label={value} size="md" onRemove={() => onChange(null)} />}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value.replace(/,/g, ""));
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={openMenu}
          onBlur={() => setOpen(false)}
          role="combobox"
          aria-expanded={open}
          aria-controls="tag-options"
          aria-autocomplete="list"
          placeholder={value ? "Change tag…" : "Choose or create a tag"}
          spellCheck={false}
          autoComplete="off"
          className="h-7 min-w-28 flex-1 bg-transparent px-1 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            inputRef.current?.focus();
            if (open) setOpen(false);
            else openMenu();
          }}
          aria-label="Show tags"
          title="Choose a tag"
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
            open
              ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/30 dark:bg-blue-400/15 dark:text-blue-300"
              : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
          }`}
        >
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.2} />
        </button>
      </div>

      {open && position && (
        <div
          ref={listRef}
          id="tag-options"
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
          style={{ left: position.left, width: position.width, top: position.top, bottom: position.bottom, maxHeight: MENU_MAX_HEIGHT }}
          className="fixed z-50 overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-[0_16px_40px_-12px_rgb(15_23_42/0.3)] dark:border-white/10 dark:bg-neutral-800"
        >
          {existing.length > 0 && (
            <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-medium text-slate-400">
              {query ? "Matching tags" : "Your tags"}
            </div>
          )}
          {options.map((option, index) => {
            const highlighted = index === active;
            const isCreate = option.kind === "create";
            const isCurrent = !isCreate && option.tag === value;
            const uses = counts[option.tag] ?? 0;
            return (
              <div key={`${option.kind}-${option.tag}`}>
                {isCreate && existing.length > 0 && (
                  <div className="mx-2 my-1 border-t border-slate-100 dark:border-white/[0.06]" />
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  data-index={index}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(option.tag)}
                  className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors ${
                    highlighted ? "bg-slate-100 dark:bg-white/[0.07]" : ""
                  }`}
                >
                  {isCreate ? (
                    <>
                      <span className="flex size-6 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                        <Plus className="size-3.5" strokeWidth={2.6} />
                      </span>
                      <span className="text-[13px] text-slate-600 dark:text-slate-300">Create</span>
                      <TagChip label={option.tag} />
                    </>
                  ) : (
                    <>
                      <TagChip label={option.tag} />
                      {isCurrent && <Check className="size-4 text-blue-600 dark:text-blue-400" strokeWidth={2.6} />}
                    </>
                  )}
                  <span className="flex-1" />
                  {!isCreate && (
                    <span className="text-[11.5px] text-slate-400">
                      {uses} {uses === 1 ? "prompt" : "prompts"}
                    </span>
                  )}
                  {highlighted && <Kbd>↩</Kbd>}
                </button>
              </div>
            );
          })}
          {note && (
            <div className="flex items-center gap-2 px-2.5 py-2.5 text-[12.5px] text-slate-400">
              <Tag className="size-3.5 shrink-0" strokeWidth={2} />
              {note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
