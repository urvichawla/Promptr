import { useCallback, useRef, useState } from "react";
import { errorMessage } from "@/lib/api/backend";
import { copyPrompt } from "@/lib/api/clipboard";
import {
  accessibilityGranted,
  loadPasteTargets,
  pasteIntoApp,
  PREVIOUS_TARGET,
  requestAccessibility,
  savePasteTarget,
  type PasteTarget,
  type PasteTargets,
} from "@/lib/api/paste";
import type { Prompt } from "@/lib/prompts/types";
import type { NoticeTone } from "./useNotice";

type ShowNotice = (message: string, tone?: NoticeTone) => void;

export function usePromptActions(showNotice: ShowNotice) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [pasteTargets, setPasteTargets] = useState<PasteTargets | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const copying = useRef(false);
  const pasting = useRef(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (prompt: Prompt) => {
      if (copying.current) return;
      copying.current = true;
      try {
        await copyPrompt(prompt.id);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        setCopiedId(prompt.id);
        copiedTimer.current = setTimeout(() => setCopiedId(null), 1500);
        showNotice(`Copied “${prompt.title}”`);
      } catch (err) {
        showNotice(errorMessage(err, "Couldn't copy the prompt."), "error");
      } finally {
        copying.current = false;
      }
    },
    [showNotice],
  );

  const refreshPasteState = useCallback(() => {
    loadPasteTargets()
      .then(setPasteTargets)
      .catch(() => {});
    accessibilityGranted()
      .then((granted) => {
        if (granted) setPermissionMessage(null);
      })
      .catch(() => {});
  }, []);

  const pasteTo = useCallback(
    async (prompt: Prompt, targetId: string) => {
      if (pasting.current) return;
      pasting.current = true;
      try {
        const result = await pasteIntoApp(prompt.id, targetId);
        if (result.status === "needs_permission") setPermissionMessage(result.message);
        else if (result.status === "copied") showNotice(result.message, "warn");
      } catch (err) {
        showNotice(errorMessage(err, "Couldn't paste the prompt."), "error");
      } finally {
        pasting.current = false;
      }
    },
    [showNotice],
  );

  const pasteToDefault = useCallback(
    (prompt: Prompt) => pasteTo(prompt, pasteTargets?.selected ?? PREVIOUS_TARGET),
    [pasteTo, pasteTargets],
  );

  const pasteToChosen = useCallback(
    async (prompt: Prompt, target: PasteTarget) => {
      setPasteTargets((prev) => (prev ? { ...prev, selected: target.id } : prev));
      savePasteTarget(target.id).catch(() => {});
      await pasteTo(prompt, target.id);
    },
    [pasteTo],
  );

  const grantAccessibility = useCallback(async () => {
    const granted = await requestAccessibility().catch(() => false);
    if (granted) setPermissionMessage(null);
  }, []);

  return {
    copiedId,
    copy,
    pasteTargets,
    refreshPasteState,
    pasteToDefault,
    pasteToChosen,
    permissionMessage,
    dismissPermission: () => setPermissionMessage(null),
    grantAccessibility,
  };
}
