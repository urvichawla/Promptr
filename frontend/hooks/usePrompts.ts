import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api/prompts";
import { errorMessage } from "@/lib/api/backend";
import type { Prompt, PromptDraft } from "@/lib/prompts/types";

export type LoadState = { status: "loading" } | { status: "ready" } | { status: "error"; message: string };

function starredIds(prompts: Prompt[]): ReadonlySet<number> {
  return new Set(prompts.filter((p) => p.favorite).map((p) => p.id));
}

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [pinned, setPinned] = useState<ReadonlySet<number>>(new Set());
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  const adopt = useCallback((list: Prompt[]) => {
    setPrompts(list);
    setPinned(starredIds(list));
  }, []);

  const reload = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      adopt(await api.listPrompts());
      setLoad({ status: "ready" });
    } catch (err) {
      setLoad({ status: "error", message: errorMessage(err, "Couldn't load your prompts.") });
    }
  }, [adopt]);

  useEffect(() => {
    reload();
  }, [reload]);

  const resync = useCallback(() => {
    api
      .listPrompts()
      .then(adopt)
      .catch(() => {});
  }, [adopt]);

  const settleOrder = useCallback(() => setPinned(starredIds(prompts)), [prompts]);

  const sortedPrompts = useMemo(
    () =>
      [...prompts].sort(
        (a, b) =>
          Number(pinned.has(b.id)) - Number(pinned.has(a.id)) ||
          b.updatedAt.localeCompare(a.updatedAt) ||
          b.id - a.id,
      ),
    [prompts, pinned],
  );

  const allTags = useMemo(() => [...new Set(prompts.flatMap((p) => p.tags))].sort(), [prompts]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of prompts) for (const t of p.tags) counts[t] = (counts[t] ?? 0) + 1;
    return counts;
  }, [prompts]);

  const withResync = useCallback(
    async <T,>(run: () => Promise<T>): Promise<T> => {
      try {
        return await run();
      } catch (err) {
        resync();
        throw err;
      }
    },
    [resync],
  );

  const createPrompt = useCallback(
    (draft: PromptDraft) =>
      withResync(async () => {
        const saved = await api.createPrompt(draft);
        setPrompts((prev) => [saved, ...prev]);
        return saved;
      }),
    [withResync],
  );

  const updatePrompt = useCallback(
    (id: number, draft: PromptDraft) =>
      withResync(async () => {
        const saved = await api.updatePrompt(id, draft);
        setPrompts((prev) => prev.map((p) => (p.id === id ? saved : p)));
        return saved;
      }),
    [withResync],
  );

  const deletePrompt = useCallback(
    (id: number) =>
      withResync(async () => {
        await api.deletePrompt(id);
        setPrompts((prev) => prev.filter((p) => p.id !== id));
      }),
    [withResync],
  );

  const setFavorite = useCallback(
    async (id: number, favorite: boolean) => {
      setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, favorite } : p)));
      try {
        await api.setFavorite(id, favorite);
      } catch (err) {
        setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, favorite: !favorite } : p)));
        resync();
        throw err;
      }
    },
    [resync],
  );

  return {
    prompts: sortedPrompts,
    pinned,
    allTags,
    tagCounts,
    load,
    reload,
    settleOrder,
    createPrompt,
    updatePrompt,
    deletePrompt,
    setFavorite,
  };
}
