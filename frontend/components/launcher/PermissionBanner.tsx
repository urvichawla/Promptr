import { ShieldAlert } from "lucide-react";

type PermissionBannerProps = {
  message: string;
  onGrant: () => void;
  onDismiss: () => void;
};

export default function PermissionBanner({ message, onGrant, onDismiss }: PermissionBannerProps) {
  return (
    <div
      role="alert"
      className="mx-5 mb-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"
    >
      <ShieldAlert className="mt-0.5 size-[18px] shrink-0 text-amber-500" strokeWidth={2.1} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Promptr needs Accessibility access to paste</div>
        <div className="mt-0.5 text-amber-800/80 dark:text-amber-100/70">{message}</div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onGrant}
          className="h-8 rounded-lg bg-amber-500 px-3 text-[12px] font-medium text-white hover:bg-amber-600"
        >
          Open Settings
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onDismiss}
          className="h-8 rounded-lg px-2.5 text-[12px] font-medium hover:bg-amber-500/15"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
