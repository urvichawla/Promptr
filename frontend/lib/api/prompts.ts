import { CreatePrompt, DeletePrompt, ListPrompts, SetFavorite, UpdatePrompt } from "@/wailsjs/go/main/App";
import type { Prompt, PromptDraft } from "@/lib/prompts/types";
import { callBackend } from "./backend";

const outsideApp = "The prompt database is only available inside the Promptr app.";

export function listPrompts(): Promise<Prompt[]> {
  return callBackend(() => ListPrompts(), "Couldn't load your prompts.", outsideApp);
}

export function createPrompt(draft: PromptDraft): Promise<Prompt> {
  return callBackend(() => CreatePrompt(draft), "Couldn't save the prompt.", outsideApp);
}

export function updatePrompt(id: number, draft: PromptDraft): Promise<Prompt> {
  return callBackend(() => UpdatePrompt(id, draft), "Couldn't save the prompt.", outsideApp);
}

export function deletePrompt(id: number): Promise<void> {
  return callBackend(() => DeletePrompt(id), "Couldn't delete the prompt.", outsideApp);
}

export function setFavorite(id: number, favorite: boolean): Promise<void> {
  return callBackend(() => SetFavorite(id, favorite), "Couldn't update the favorite.", outsideApp);
}
