import { motion, useReducedMotion } from "framer-motion";
import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
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

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className = "",
  compact = false,
}: EmptyStateProps) {
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
      className={[
        "relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] px-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl",
        compact ? "py-6" : "py-10",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-0 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative mx-auto mb-4 w-fit" aria-hidden="true">
        {/* Pulsing glow ring behind icon */}
        {!shouldReduceMotion && (
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-2xl bg-cyan-300/15 blur-md"
          />
        )}

        {/* Floating icon */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -5, 0],
                }
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={[
            "relative flex items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.12)]",
            compact ? "size-12" : "size-14",
          ].join(" ")}
        >
          <Icon className={compact ? "size-5" : "size-6"} />
        </motion.div>
      </div>

      <p className="relative text-base font-black tracking-[-0.015em] text-white">
        {title}
      </p>

      {description && (
        <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          {description}
        </p>
      )}

      {action && (
        <div className="relative mt-5 flex justify-center">{action}</div>
      )}
    </motion.div>
  );
}
