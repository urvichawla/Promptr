import { GetShortcut, HideWindow } from "@/wailsjs/go/main/App";
import { EventsOn } from "@/wailsjs/runtime/runtime";
import { hasBackend } from "./backend";

export type Shortcut = {
  label: string;
  ready: boolean;
  registered: boolean;
  error: string;
};

export function isNativeWindow(): boolean {
  const webkit = (window as { webkit?: { messageHandlers?: Record<string, unknown> } }).webkit;
  return hasBackend() && webkit?.messageHandlers?.external !== undefined;
}

export function hideWindow(): void {
  if (hasBackend()) HideWindow().catch(() => {});
}

export function onWindowShown(callback: () => void): () => void {
  if (!hasBackend()) return () => {};
  return EventsOn("window:shown", callback);
}

export function onAddPromptRequested(callback: () => void): () => void {
  if (!hasBackend()) return () => {};
  return EventsOn("prompt:new", callback);
}

export async function loadShortcut(): Promise<Shortcut | null> {
  if (!hasBackend()) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const status = await GetShortcut();
    if (status.ready) return status;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}
