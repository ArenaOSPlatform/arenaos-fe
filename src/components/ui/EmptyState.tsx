import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className = "",
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-[1.5rem] border border-white/10 bg-black/25 px-5 text-center ${compact ? "py-6" : "py-10"} ${className}`}
    >
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <Icon size={24} />
      </div>

      <p className="text-base font-black text-white">{title}</p>

      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
          {description}
        </p>
      )}

      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
