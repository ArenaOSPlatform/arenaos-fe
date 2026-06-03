import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type ErrorStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

const UI = {
  motion: {
    duration: 0.45,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

export function ErrorState({
  title,
  description,
  icon: Icon = AlertTriangle,
  action,
  className = "",
  compact = false,
}: ErrorStateProps) {
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
      role="alert"
      className={[
        "relative overflow-hidden rounded-[1.75rem] border border-red-300/20 bg-red-400/[0.075] px-5 text-center shadow-[0_24px_80px_rgba(127,29,29,0.22)] backdrop-blur-2xl",
        compact ? "py-6" : "py-10",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-200/60 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-0 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-400/15 blur-3xl" />

      <div
        className={[
          "relative mx-auto mb-4 flex items-center justify-center rounded-2xl border border-red-300/25 bg-red-400/10 text-red-200 shadow-[0_0_40px_rgba(248,113,113,0.12)]",
          compact ? "size-12" : "size-14",
        ].join(" ")}
        aria-hidden="true"
      >
        <Icon className={compact ? "size-5" : "size-6"} />
      </div>

      <p className="relative text-base font-black tracking-[-0.015em] text-white">
        {title}
      </p>

      {description && (
        <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300">
          {description}
        </p>
      )}

      {action && (
        <div className="relative mt-5 flex justify-center">{action}</div>
      )}
    </motion.div>
  );
}
