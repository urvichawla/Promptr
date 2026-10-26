import Fuse, { type Expression, type IFuseOptions } from "fuse.js";
import type { Prompt } from "./types";

type SearchDoc = Prompt & { titleWords: string[]; words: string[] };

export type PromptIndex = {
  fuse: Fuse<SearchDoc>;
  prompts: Prompt[];
};

const MAX_SCORE = 0.6;

const fuseOptions: IFuseOptions<SearchDoc> = {
  keys: [
    { name: "title", weight: 3 },
    { name: "titleWords", weight: 3 },
    { name: "tags", weight: 2 },
    { name: "words", weight: 1 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
  ignoreFieldNorm: true,
  minMatchCharLength: 2,
  includeScore: true,
};

function toWords(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu) ?? [])];
}

export function buildIndex(prompts: Prompt[]): PromptIndex {
  const docs = prompts.map((p) => ({ ...p, titleWords: toWords(p.title), words: toWords(p.content) }));
  return { fuse: new Fuse(docs, fuseOptions), prompts };
}

function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function hasShortToken(prompt: Prompt, token: string): boolean {
  return toWords(prompt.title).some((w) => w.startsWith(token)) || prompt.tags.some((t) => t.startsWith(token));
}

export function hasAllTags(prompt: Prompt, tags: string[]): boolean {
  return tags.every((t) => prompt.tags.includes(t));
}

export function searchPrompts(index: PromptIndex, query: string, tags: string[]): Prompt[] {
  const tokens = tokenize(query);
  const fuzzyTokens = tokens.filter((t) => t.length > 1);
  const shortTokens = tokens.filter((t) => t.length === 1);

  let results = index.prompts;
  if (fuzzyTokens.length > 0) {
    const expression: Expression = {
      $and: fuzzyTokens.map((t): Expression => {
        const anyField: Expression[] = [{ title: t }, { titleWords: t }, { tags: t }, { words: t }];
        return { $or: anyField };
      }),
    };
    results = index.fuse
      .search(expression)
      .filter((r) => (r.score ?? 0) <= MAX_SCORE)
      .map((r) => index.prompts[r.refIndex]);
  }
  if (shortTokens.length > 0) {
    results = results.filter((p) => shortTokens.every((t) => hasShortToken(p, t)));
  }
  if (tags.length > 0) {
    results = results.filter((p) => hasAllTags(p, tags));
  }
  return results;
}

export function isVisible(prompt: Prompt, query: string, tags: string[]): boolean {
  return searchPrompts(buildIndex([prompt]), query, tags).length > 0;
}
