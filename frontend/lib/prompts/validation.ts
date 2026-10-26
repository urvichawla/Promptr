import type { Prompt, PromptDraft } from "./types";

export const TITLE_MAX = 100;
export const CONTENT_MAX = 20000;
export const TAG_MAX = 24;

export type DraftErrors = Partial<Record<"title" | "content" | "tag", string>>;

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

export function cleanDraft(draft: PromptDraft): PromptDraft {
  const tag = draft.tags.map(normalizeTag).find(Boolean);
  return {
    title: draft.title.trim().replace(/\s+/g, " "),
    content: draft.content.replace(/^(?:[ \t]*\n)+/, "").replace(/\s+$/, ""),
    tags: tag ? [tag] : [],
  };
}

export function validateDraft(draft: PromptDraft, existing: Prompt[], editingId: number | null): DraftErrors {
  const errors: DraftErrors = {};
  const titleKey = draft.title.toLowerCase();

  if (!draft.title) {
    errors.title = "Give the prompt a title.";
  } else if (draft.title.length > TITLE_MAX) {
    errors.title = `Keep the title under ${TITLE_MAX} characters.`;
  } else if (existing.some((p) => p.id !== editingId && p.title.toLowerCase() === titleKey)) {
    errors.title = "Another prompt already has this title.";
  }

  if (!draft.content) {
    errors.content = "The prompt can't be empty.";
  } else if (draft.content.length > CONTENT_MAX) {
    errors.content = `Prompts are limited to ${CONTENT_MAX.toLocaleString()} characters.`;
  }

  if (draft.tags.some((t) => t.length > TAG_MAX)) {
    errors.tag = `Tags can be up to ${TAG_MAX} characters.`;
  }

  return errors;
}
