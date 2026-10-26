import { useEffect, useRef } from "react";
import { hideWindow, isNativeWindow, onAddPromptRequested, onWindowShown } from "@/lib/api/window";

type WindowEventHandlers = {
  busy: boolean;
  onShown: () => void;
  onAddPrompt: () => void;
};

export function useWindowEvents({ busy, onShown, onAddPrompt }: WindowEventHandlers) {
  const handlers = useRef({ busy, onShown, onAddPrompt });

  useEffect(() => {
    handlers.current = { busy, onShown, onAddPrompt };
  });

  useEffect(() => {
    const stopShown = onWindowShown(() => handlers.current.onShown());
    const stopAdd = onAddPromptRequested(() => handlers.current.onAddPrompt());
    const onBlur = () => {
      if (!handlers.current.busy && isNativeWindow()) hideWindow();
    };
    window.addEventListener("blur", onBlur);
    return () => {
      stopShown();
      stopAdd();
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}
