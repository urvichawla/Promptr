"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import PromptForm from "@/components/editor/PromptForm";
import SearchBar from "@/components/filters/SearchBar";
import TagFilterBar from "@/components/filters/TagFilterBar";
import LauncherFooter from "@/components/launcher/LauncherFooter";
import LauncherHeader from "@/components/launcher/LauncherHeader";
import NoticeToast from "@/components/launcher/NoticeToast";
import PermissionBanner from "@/components/launcher/PermissionBanner";
import PromptList from "@/components/launcher/PromptList";
import PastePicker from "@/components/paste/PastePicker";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useLauncherShortcuts } from "@/hooks/useLauncherShortcuts";
import { useNotice } from "@/hooks/useNotice";
import { usePromptActions } from "@/hooks/usePromptActions";
import { usePromptFilters } from "@/hooks/usePromptFilters";
import { usePrompts } from "@/hooks/usePrompts";
import { useWindowEvents } from "@/hooks/useWindowEvents";
import { errorMessage } from "@/lib/api/backend";
import type { PasteTarget } from "@/lib/api/paste";
import { hideWindow, loadShortcut, type Shortcut } from "@/lib/api/window";
import { validateDraft } from "@/lib/prompts/validation";
import type { Prompt, PromptDraft } from "@/lib/prompts/types";

type Editor = { mode: "create" } | { mode: "edit"; prompt: Prompt };

const emptyDraft: PromptDraft = { title: "", content: "", tags: [] };

export default function PromptLauncher() {
  const data = usePrompts();
  const filters = usePromptFilters(data.prompts, data.allTags, data.pinned);
  const { notice, showNotice } = useNotice();
  const actions = usePromptActions(showNotice);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Prompt | null>(null);
  const [pickerFor, setPickerFor] = useState<Prompt | null>(null);
  const [shortcut, setShortcut] = useState<Shortcut | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const busy = editor !== null || pendingDelete !== null || pickerFor !== null;
  const { selected } = filters;
  const { refreshPasteState } = actions;

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.select();
  }, []);

  useEffect(() => {
    loadShortcut()
      .then(setShortcut)
      .catch(() => {});
    refreshPasteState();
  }, [refreshPasteState]);

  useEffect(() => {
    if (!busy) searchRef.current?.focus();
  }, [busy]);

  useWindowEvents({
    busy,
    onShown: () => {
      refreshPasteState();
      data.settleOrder();
      if (!busy) focusSearch();
    },
    onAddPrompt: () => {
      setPickerFor(null);
      setPendingDelete(null);
      setEditor((current) => current ?? { mode: "create" });
    },
  });

  useLauncherShortcuts({
    enabled: !busy && data.load.status === "ready",
    onFocusSearch: focusSearch,
    onNew: () => setEditor({ mode: "create" }),
    onEdit: () => selected && setEditor({ mode: "edit", prompt: selected }),
    onCopy: () => selected && actions.copy(selected),
  });

  const toggleFavorite = async (prompt: Prompt) => {
    try {
      await data.setFavorite(prompt.id, !prompt.favorite);
    } catch (err) {
      showNotice(errorMessage(err, "Couldn't update the favorite."), "error");
    }
  };

  const toggleStarred = () => {
    data.settleOrder();
    filters.setStarredOnly(!filters.starredOnly);
  };

  const openPicker = (prompt: Prompt) => {
    if (actions.pasteTargets) setPickerFor(prompt);
    else actions.pasteToDefault(prompt);
  };

  const chooseTarget = (target: PasteTarget) => {
    const prompt = pickerFor;
    setPickerFor(null);
    if (prompt) actions.pasteToChosen(prompt, target);
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const composing = e.nativeEvent.isComposing;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      filters.moveSelection(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      filters.moveSelection(-1);
    } else if (e.key === "Enter" && e.metaKey && !composing) {
      e.preventDefault();
      if (selected) actions.pasteToDefault(selected);
    } else if (e.key === "Enter" && !e.metaKey && !e.shiftKey && !e.altKey && !composing) {
      e.preventDefault();
      if (selected) actions.copy(selected);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (filters.query) filters.setQuery("");
      else if (filters.hasFilters) filters.clearFilters();
      else hideWindow();
    } else if (e.key === "Backspace" && !filters.query && filters.tag) {
      e.preventDefault();
      filters.setTag(null);
    }
  };

  const handleSubmit = async (draft: PromptDraft) => {
    const editing = editor?.mode === "edit" ? editor.prompt : null;
    const saved = editing ? await data.updatePrompt(editing.id, draft) : await data.createPrompt(draft);
    if (!filters.shows(saved)) filters.clearAll();
    filters.select(saved.id);
    setEditor(null);
    showNotice(editing ? "Changes saved" : "Prompt added");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { results } = filters;
    const index = results.findIndex((p) => p.id === pendingDelete.id);
    const neighbour = results[index + 1] ?? results[index - 1] ?? null;
    try {
      await data.deletePrompt(pendingDelete.id);
      filters.select(neighbour?.id ?? null);
      setEditor(null);
      showNotice("Prompt deleted");
    } catch (err) {
      showNotice(errorMessage(err, "Couldn't delete the prompt."), "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-white text-slate-900 dark:bg-[#15161b] dark:text-slate-100">
      <LauncherHeader shortcut={shortcut} />

      <SearchBar
        value={filters.query}
        onChange={filters.setQuery}
        onKeyDown={handleSearchKeyDown}
        onNewPrompt={() => setEditor({ mode: "create" })}
        inputRef={searchRef}
      />

      {data.load.status === "ready" && data.prompts.length > 0 && (
        <TagFilterBar
          tags={data.allTags}
          selected={filters.tag}
          starredOnly={filters.starredOnly}
          onToggle={filters.toggleTag}
          onClear={filters.clearFilters}
          onToggleStarred={toggleStarred}
        />
      )}

      {actions.permissionMessage && (
        <PermissionBanner
          message={actions.permissionMessage}
          onGrant={actions.grantAccessibility}
          onDismiss={actions.dismissPermission}
        />
      )}

      <div className="relative min-h-0 flex-1">
        <PromptList
          load={data.load}
          results={filters.results}
          totalPrompts={data.prompts.length}
          selectedIndex={filters.selectedIndex}
          copiedId={actions.copiedId}
          activeTag={filters.tag}
          query={filters.query}
          starredOnly={filters.starredOnly}
          matchesOutsideFilters={filters.matchesOutsideFilters}
          onRetry={data.reload}
          onCreate={() => setEditor({ mode: "create" })}
          onSelect={(prompt) => filters.select(prompt.id)}
          onTagClick={filters.toggleTag}
          onToggleFavorite={toggleFavorite}
          onEdit={(prompt) => setEditor({ mode: "edit", prompt })}
          onDelete={setPendingDelete}
          onCopy={actions.copy}
          onPaste={openPicker}
          onClearQuery={() => filters.setQuery("")}
          onClearFilters={filters.clearFilters}
        />
      </div>

      <LauncherFooter shown={filters.results.length} total={data.prompts.length} filtering={filters.filtering} />

      {editor && (
        <PromptForm
          key={editor.mode === "edit" ? editor.prompt.id : "new"}
          mode={editor.mode}
          initial={editor.mode === "edit" ? editor.prompt : emptyDraft}
          allTags={data.allTags}
          tagCounts={data.tagCounts}
          validate={(draft) => validateDraft(draft, data.prompts, editor.mode === "edit" ? editor.prompt.id : null)}
          onSubmit={handleSubmit}
          onDelete={editor.mode === "edit" ? () => setPendingDelete(editor.prompt) : undefined}
          onClose={() => setEditor(null)}
        />
      )}

      {pickerFor && actions.pasteTargets && (
        <PastePicker
          promptTitle={pickerFor.title}
          targets={actions.pasteTargets}
          onChoose={chooseTarget}
          onClose={() => setPickerFor(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete prompt?"
          message={`“${pendingDelete.title}” will be permanently removed from Promptr. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <NoticeToast notice={notice} />
    </div>
  );
}
