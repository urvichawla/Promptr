import { useCallback, useEffect, useRef, useState } from "react";

export type NoticeTone = "info" | "warn" | "error";
export type Notice = { message: string; tone: NoticeTone };

const durations: Record<NoticeTone, number> = { info: 2200, warn: 6500, error: 4500 };

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((message: string, tone: NoticeTone = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setNotice({ message, tone });
    timer.current = setTimeout(() => setNotice(null), durations[tone]);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { notice, showNotice };
}
