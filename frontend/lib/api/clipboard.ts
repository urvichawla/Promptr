import { CopyPrompt } from "@/wailsjs/go/main/App";
import { callBackend } from "./backend";

export function copyPrompt(id: number): Promise<void> {
  return callBackend(
    () => CopyPrompt(id),
    "Couldn't copy the prompt.",
    "Copying is only available inside the Promptr app.",
  );
}
