import Kbd from "@/components/ui/Kbd";

type LauncherFooterProps = {
  shown: number;
  total: number;
  filtering: boolean;
};

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </span>
      {label}
    </span>
  );
}

export default function LauncherFooter({ shown, total, filtering }: LauncherFooterProps) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-t border-slate-100 px-5 text-[12px] text-slate-400 dark:border-white/[0.06]">
      <div className="flex min-w-0 items-center gap-4 overflow-hidden">
        <Hint keys={["↑", "↓"]} label="to navigate" />
        <Hint keys={["↩"]} label="to copy" />
        <Hint keys={["⌘", "↩"]} label="to paste" />
      </div>
      <span className="shrink-0">
        {filtering ? `${shown} of ${total}` : total} {total === 1 ? "prompt" : "prompts"}
      </span>
    </div>
  );
}
