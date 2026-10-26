import {
  GetAccessibility,
  GetPasteTargets,
  PasteIntoApp,
  RequestAccessibility,
  SetPasteTarget,
} from "@/wailsjs/go/main/App";
import { callBackend, hasBackend } from "./backend";

export const PREVIOUS_TARGET = "previous";

export type PasteTarget = { id: string; name: string; detail: string; icon: string; running: boolean };
export type PasteTargets = { selected: string; targets: PasteTarget[] };
export type PasteResult = { status: "pasted" | "copied" | "needs_permission"; target: string; message: string };

const outsideApp = "Pasting is only available inside the Promptr app.";

export async function loadPasteTargets(): Promise<PasteTargets | null> {
  if (!hasBackend()) return null;
  return GetPasteTargets();
}

export function savePasteTarget(id: string): Promise<void> {
  return callBackend(() => SetPasteTarget(id), "Couldn't save the paste target.", outsideApp);
}

export async function pasteIntoApp(id: number, target: string): Promise<PasteResult> {
  return (await callBackend(() => PasteIntoApp(id, target), "Couldn't paste the prompt.", outsideApp)) as PasteResult;
}

export async function accessibilityGranted(): Promise<boolean> {
  return hasBackend() ? GetAccessibility() : false;
}

export async function requestAccessibility(): Promise<boolean> {
  return hasBackend() ? RequestAccessibility() : false;
}
