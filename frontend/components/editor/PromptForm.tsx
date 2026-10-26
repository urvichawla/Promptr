import { Sparkles, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { cleanDraft, CONTENT_MAX, TITLE_MAX, type DraftErrors } from "@/lib/prompts/validation";
import type { PromptDraft } from "@/lib/prompts/types";
import TagPicker from "@/components/editor/TagPicker";

type PromptFormProps = {
  mode: "create" | "edit";
  initial: PromptDraft;
  allTags: string[];
  tagCounts: Record<string, number>;
  validate: (draft: PromptDraft) => DraftErrors;
  onSubmit: (draft: PromptDraft) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
};

const labelClass = "flex justify-between text-[13px] font-semibold text-slate-800 dark:text-slate-200";
const fieldBase =
  "w-full rounded-xl border bg-white px-3.5 text-[13.5px] text-slate-800 outline-none transition-shadow placeholder:text-slate-400 focus:ring-4 dark:bg-white/[0.04] dark:text-slate-100";
const fieldOk = "border-slate-200 focus:border-blue-400/70 focus:ring-blue-500/10 dark:border-white/10";
const fieldBad = "border-red-400 focus:ring-red-500/10";

export default function PromptForm({
  mode,
  initial,
  allTags,
  tagCounts,
  validate,
  onSubmit,
  onDelete,
  onClose,
}: PromptFormProps) {
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [tag, setTag] = useState<string | null>(initial.tags[0] ?? null);
  const [tagText, setTagText] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);

  const draft = cleanDraft({ title, content, tags: tagText.trim() ? [tagText] : tag ? [tag] : [] });
  const errors = attempted ? validate(draft) : {};
  const initialClean = cleanDraft(initial);
  const dirty =
    draft.title !== initialClean.title ||
    draft.content !== initialClean.content ||
    draft.tags.join(",") !== initialClean.tags.join(",");

  const edited = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setConfirmDiscard(false);
    setSaveError(null);
  };

  const submit = async () => {
    if (saving) return;
    setAttempted(true);
    const found = validate(draft);
    if (found.title) return titleRef.current?.focus();
    if (found.content) return contentRef.current?.focus();
    if (found.tag) return tagRef.current?.focus();
    if (mode === "edit" && !dirty) return onClose();

    setSaving(true);
    try {
      await onSubmit(draft);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save the prompt. Try again.");
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (dirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/25 p-6 backdrop-blur-[2px] dark:bg-black/45"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          requestClose();
        } else if (e.key === "Enter" && e.metaKey) {
          e.preventDefault();
          submit();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-form-title"
        className="flex max-h-full w-full max-w-[500px] flex-col rounded-2xl bg-white shadow-[0_24px_60px_-12px_rgb(15_23_42/0.35)] ring-1 ring-slate-200/70 dark:bg-neutral-900 dark:ring-white/10"
      >
        <div className="flex items-center gap-3 px-6 pt-5 pb-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
            <Sparkles className="size-[17px]" strokeWidth={2.2} />
          </div>
          <h2 id="prompt-form-title" className="flex-1 text-[15px] font-semibold text-slate-900 dark:text-white">
            {mode === "create" ? "New Prompt" : "Edit Prompt"}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
          >
            <X className="size-[18px]" strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>
              Title
              {title.length > TITLE_MAX - 20 && (
                <span className={`font-normal ${title.trim().length > TITLE_MAX ? "text-red-500" : "text-slate-400"}`}>
                  {title.trim().length}/{TITLE_MAX}
                </span>
              )}
            </span>
            <input
              ref={titleRef}
              autoFocus
              value={title}
              onChange={(e) => edited(setTitle)(e.target.value)}
              placeholder="e.g. Code Review Checklist"
              spellCheck={false}
              aria-invalid={!!errors.title}
              className={`${fieldBase} h-10 ${errors.title ? fieldBad : fieldOk}`}
            />
            {errors.title && <FieldError message={errors.title} />}
          </label>

          <label className="flex min-h-40 flex-1 flex-col gap-1.5">
            <span className={labelClass}>
              Content
              {content.length > CONTENT_MAX - 2000 && (
                <span className={`font-normal ${content.length > CONTENT_MAX ? "text-red-500" : "text-slate-400"}`}>
                  {content.length.toLocaleString()}/{CONTENT_MAX.toLocaleString()}
                </span>
              )}
            </span>
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => edited(setContent)(e.target.value)}
              placeholder="Write the full prompt…"
              aria-invalid={!!errors.content}
              className={`${fieldBase} min-h-40 flex-1 resize-none py-2.5 leading-relaxed ${errors.content ? fieldBad : fieldOk}`}
            />
            {errors.content && <FieldError message={errors.content} />}
          </label>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Tag</span>
            <TagPicker
              value={tag}
              onChange={edited(setTag)}
              text={tagText}
              onTextChange={edited(setTagText)}
              suggestions={allTags}
              counts={tagCounts}
              invalid={!!errors.tag}
              inputRef={tagRef}
            />
            {errors.tag && <FieldError message={errors.tag} />}
          </div>
        </div>

        <div className="px-6 pt-3 pb-5">
          <p className="mb-3 min-h-4 text-[11.5px]">
            {saveError ? (
              <span className="text-red-500">{saveError}</span>
            ) : confirmDiscard ? (
              <span className="text-amber-600 dark:text-amber-400">Unsaved changes — press Esc again to discard</span>
            ) : (
              <span className="text-slate-400">⌘↩ to save · Esc to cancel</span>
            )}
          </p>
          <div className="flex gap-3">
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label="Delete prompt"
                title="Delete prompt"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:hover:border-red-400/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <Trash2 className="size-[17px]" strokeWidth={2} />
              </button>
            )}
            <button
              type="button"
              onClick={requestClose}
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="h-11 flex-1 rounded-xl bg-ink text-[13.5px] font-medium text-white shadow-sm hover:bg-ink-soft disabled:opacity-60 dark:bg-white dark:text-ink dark:hover:bg-slate-200"
            >
              {saving ? "Saving…" : "Save Prompt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <span className="text-[12px] text-red-500">{message}</span>;
}
