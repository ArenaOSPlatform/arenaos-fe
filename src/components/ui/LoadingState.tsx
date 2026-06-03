import { motion, useReducedMotion } from "framer-motion";
import { Loader2, RadioTower } from "lucide-react";

type LoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
};

const UI = {
  motion: {
    duration: 0.45,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

export function LoadingState({
  title = "Loading...",
  description = "Syncing the latest arena data.",
  className = "",
  compact = false,
}: LoadingStateProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        shouldReduceMotion
          ? false
          : {
              opacity: 0,
              y: 18,
              filter: "blur(8px)",
            }
      }
      animate={
        shouldReduceMotion
          ? undefined
          : {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
            }
      }
      transition={{
        duration: UI.motion.duration,
        ease: UI.motion.ease,
      }}
      role="status"
      aria-live="polite"
      className={[
        "relative flex items-center justify-center overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[0.055] p-6 text-center shadow-[0_24px_80px_rgba(8,145,178,0.18)] backdrop-blur-2xl",
        compact ? "min-h-36" : "min-h-[320px]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-0 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative mx-auto max-w-sm">
        <div className="relative mx-auto mb-5 flex size-16 items-center justify-center">
          {!shouldReduceMotion && (
            <>
              <motion.div
                aria-hidden="true"
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.25, 0.65, 0.25],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-3xl bg-cyan-300/15 blur-sm"
              />
              <motion.div
                aria-hidden="true"
                animate={{
                  scale: [1, 1.45, 1],
                  opacity: [0.1, 0.4, 0.1],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-3xl bg-cyan-300/10 blur-md"
              />
            </>
          )}

          <div className="relative flex size-14 items-center justify-center rounded-3xl border border-cyan-300/20 bg-[#081426] text-cyan-200 shadow-[0_18px_50px_rgba(8,145,178,0.24)]">
            <RadioTower className="size-6" aria-hidden="true" />
          </div>

          <Loader2
            className={[
              "absolute size-[72px] text-cyan-200/25",
              shouldReduceMotion ? "" : "animate-spin",
            ].join(" ")}
            aria-hidden="true"
          />
        </div>

        <p className="text-lg font-black tracking-[-0.015em] text-white">
          {title}
        </p>

        {description && (
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        )}

        <span className="sr-only">{title}</span>
      </div>
    </motion.div>
  );
}
