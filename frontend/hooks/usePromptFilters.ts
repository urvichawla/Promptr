import { useCallback, useMemo, useState } from "react";
import { buildIndex, isVisible, searchPrompts } from "@/lib/prompts/search";
import type { Prompt } from "@/lib/prompts/types";

export function usePromptFilters(prompts: Prompt[], allTags: string[], pinned: ReadonlySet<number>) {
  const [query, setQueryState] = useState("");
  const [chosenTag, setChosenTag] = useState<string | null>(null);
  const [starredOnly, setStarredOnlyState] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const tag = chosenTag && allTags.includes(chosenTag) ? chosenTag : null;
  const tagList = useMemo(() => (tag ? [tag] : []), [tag]);
  const searchIndex = useMemo(() => buildIndex(prompts), [prompts]);

  const results = useMemo(() => {
    const matches = searchPrompts(searchIndex, query, tagList);
    return starredOnly ? matches.filter((p) => pinned.has(p.id)) : matches;
  }, [searchIndex, query, tagList, starredOnly, pinned]);

  const selectedIndex = Math.max(0, results.findIndex((p) => p.id === selectedId));
  const selected = results[selectedIndex] ?? null;
  const filtering = query.trim() !== "" || tag !== null || starredOnly;
  const hasFilters = tag !== null || starredOnly;
  const matchesOutsideFilters = hasFilters ? searchPrompts(searchIndex, query, []).length : 0;

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setSelectedId(null);
  }, []);

  const setTag = useCallback((value: string | null) => {
    setChosenTag(value);
    setSelectedId(null);
  }, []);

  const toggleTag = useCallback((value: string) => setTag(tag === value ? null : value), [setTag, tag]);

  const setStarredOnly = useCallback((value: boolean) => {
    setStarredOnlyState(value);
    setSelectedId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setTag(null);
    setStarredOnly(false);
  }, [setTag, setStarredOnly]);

  const clearAll = useCallback(() => {
    setQuery("");
    clearFilters();
  }, [setQuery, clearFilters]);

  const moveSelection = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(selectedIndex + delta, 0), results.length - 1);
      setSelectedId(results[next]?.id ?? null);
    },
    [results, selectedIndex],
  );

  const shows = useCallback(
    (prompt: Prompt) => isVisible(prompt, query, tagList) && (!starredOnly || prompt.favorite),
    [query, tagList, starredOnly],
  );

  return {
    query,
    tag,
    starredOnly,
    results,
    selected,
    selectedIndex,
    filtering,
    hasFilters,
    matchesOutsideFilters,
    setQuery,
    setTag,
    toggleTag,
    setStarredOnly,
    clearFilters,
    clearAll,
    select: setSelectedId,
    moveSelection,
    shows,
  };
}
