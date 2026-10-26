export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const message = raw.trim();
  if (!message) return fallback;
  return message.charAt(0).toUpperCase() + message.slice(1);
}

export function hasBackend(): boolean {
  return typeof window !== "undefined" && "go" in window;
}

export async function callBackend<T>(run: () => Promise<T>, fallback: string, unavailable = fallback): Promise<T> {
  if (!hasBackend()) throw new Error(unavailable);
  try {
    return await run();
  } catch (err) {
    throw new Error(errorMessage(err, fallback));
  }
}
