import { useEffect, useRef } from "react";

type Shortcuts = {
  enabled: boolean;
  onFocusSearch: () => void;
  onNew: () => void;
  onEdit: () => void;
  onCopy: () => void;
};

function hasTextSelection(): boolean {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.selectionStart !== el.selectionEnd;
  }
  return (window.getSelection()?.toString() ?? "") !== "";
}

export function useLauncherShortcuts(shortcuts: Shortcuts) {
  const current = useRef(shortcuts);

  useEffect(() => {
    current.current = shortcuts;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { enabled, onFocusSearch, onNew, onEdit, onCopy } = current.current;
      if (!e.metaKey || !enabled) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        onFocusSearch();
      } else if (key === "n") {
        e.preventDefault();
        onNew();
      } else if (key === "e") {
        e.preventDefault();
        onEdit();
      } else if (key === "c" && !hasTextSelection()) {
        e.preventDefault();
        onCopy();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
