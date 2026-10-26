import type { Notice } from "@/hooks/useNotice";

const tones = {
  info: "truncate rounded-full bg-ink text-white dark:bg-white dark:text-ink",
  warn: "rounded-xl text-center leading-snug bg-amber-500 text-white",
  error: "truncate rounded-full bg-red-600 text-white",
} as const;

export default function NoticeToast({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-40 flex justify-center px-6">
      <div
        role={notice.tone === "info" ? "status" : "alert"}
        className={`max-w-full px-4 py-2 text-[12.5px] font-medium shadow-[0_10px_30px_-8px_rgb(15_23_42/0.4)] ${tones[notice.tone]}`}
      >
        {notice.message}
      </div>
    </div>
  );
}
