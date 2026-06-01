import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type ErrorStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function ErrorState({
  title,
  description,
  icon: Icon = AlertTriangle,
  action,
  className = "",
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-[1.5rem] border border-red-400/20 bg-red-400/[0.08] px-5 text-center ${compact ? "py-6" : "py-10"} ${className}`}
    >
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-red-300/25 bg-red-400/10 text-red-300">
        <Icon size={24} />
      </div>

      <p className="text-base font-black text-white">{title}</p>

      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
          {description}
        </p>
      )}

      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
