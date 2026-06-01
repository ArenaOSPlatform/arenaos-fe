import { Loader2, RadioTower } from "lucide-react";

type LoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
};

export function LoadingState({
  title = "Loading...",
  description = "Syncing the latest arena data.",
  className = "",
  compact = false,
}: LoadingStateProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-[1.75rem] border border-cyan-400/15 bg-cyan-400/[0.06] p-6 text-center shadow-2xl shadow-cyan-950/20 backdrop-blur-xl ${compact ? "min-h-36" : "min-h-[320px]"} ${className}`}
    >
      <div className="mx-auto max-w-sm">
        <div className="relative mx-auto mb-5 flex size-16 items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-cyan-400/10 animate-[soft-pulse_1.8s_ease-in-out_infinite]" />
          <div className="relative flex size-14 items-center justify-center rounded-3xl border border-cyan-300/20 bg-[#081426] text-cyan-300 shadow-xl shadow-cyan-950/30">
            <RadioTower size={24} />
          </div>
          <Loader2
            size={72}
            className="absolute -inset-1 animate-spin text-cyan-300/25"
          />
        </div>

        <p className="text-lg font-black text-white">{title}</p>
        {description && (
          <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>
        )}
      </div>
    </div>
  );
}
