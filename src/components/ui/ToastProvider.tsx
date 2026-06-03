import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastTone,
} from "@/utils/toastContext";

type ToastStyle = {
  icon: LucideIcon;
  shell: string;
  iconBox: string;
  title: string;
  bar: string;
  glow: string;
};

const UI = {
  maxToasts: 5,
  defaultDuration: 4200,
  errorDuration: 5600,
  warningDuration: 5200,
  motion: {
    duration: 0.24,
    ease: [0.22, 1, 0.36, 1] as const,
  },
} as const;

type Toast = {
  id: number;
  title?: string;
  message: string;
  tone: ToastTone;
  duration: number;
};

const toastStyles: Record<ToastTone, ToastStyle> = {
  success: {
    icon: CheckCircle2,
    shell: "border-emerald-400/25 bg-[#061912]/95 shadow-emerald-950/40",
    iconBox: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/20",
    title: "text-emerald-100",
    bar: "bg-emerald-300",
    glow: "bg-emerald-400/15",
  },
  error: {
    icon: XCircle,
    shell: "border-red-400/25 bg-[#1b0810]/95 shadow-red-950/40",
    iconBox: "bg-red-400/15 text-red-300 ring-red-400/20",
    title: "text-red-100",
    bar: "bg-red-300",
    glow: "bg-red-400/15",
  },
  info: {
    icon: Info,
    shell: "border-cyan-400/25 bg-[#071725]/95 shadow-cyan-950/40",
    iconBox: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/20",
    title: "text-cyan-100",
    bar: "bg-cyan-300",
    glow: "bg-cyan-400/15",
  },
  warning: {
    icon: AlertTriangle,
    shell: "border-amber-300/25 bg-[#1c1406]/95 shadow-amber-950/40",
    iconBox: "bg-amber-300/15 text-amber-200 ring-amber-300/20",
    title: "text-amber-100",
    bar: "bg-amber-200",
    glow: "bg-amber-300/15",
  },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const style = toastStyles[toast.tone];
  const Icon = style.icon;

  return (
    <motion.div
      layout
      role="status"
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      initial={
        shouldReduceMotion
          ? false
          : {
              opacity: 0,
              x: 28,
              scale: 0.96,
              filter: "blur(10px)",
            }
      }
      animate={
        shouldReduceMotion
          ? undefined
          : {
              opacity: 1,
              x: 0,
              scale: 1,
              filter: "blur(0px)",
            }
      }
      exit={
        shouldReduceMotion
          ? undefined
          : {
              opacity: 0,
              x: 28,
              scale: 0.96,
              filter: "blur(8px)",
            }
      }
      transition={{
        duration: UI.motion.duration,
        ease: UI.motion.ease,
      }}
      drag={shouldReduceMotion ? false : "x"}
      dragConstraints={{ left: 0, right: 120 }}
      dragElastic={0.18}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80 || info.velocity.x > 450) {
          onDismiss(toast.id);
        }
      }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl ${style.shell}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/50 to-transparent" />
      <div
        className={`pointer-events-none absolute -right-12 -top-12 size-36 rounded-full blur-3xl ${style.glow}`}
      />

      <div className="relative flex gap-3 p-4">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${style.iconBox}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          {toast.title && (
            <p className={`text-sm font-black ${style.title}`}>{toast.title}</p>
          )}

          <p className="mt-1 wrap-break-word text-sm leading-5 text-white/70">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss toast"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-white/45 transition duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071725] active:scale-95"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {toast.duration > 0 && (
        <div className="h-1 bg-white/5">
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{
              duration: toast.duration / 1000,
              ease: "linear",
            }}
            className={`h-full origin-left ${style.bar}`}
          />
        </div>
      )}
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      title,
      message,
      tone = "info",
      duration = UI.defaultDuration,
    }: ToastInput) => {
      const id = Date.now() + Math.random();

      setToasts((prev) =>
        [{ id, title, message, tone, duration }, ...prev].slice(
          0,
          UI.maxToasts,
        ),
      );

      if (duration > 0) {
        window.setTimeout(() => dismissToast(id), duration);
      }
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      success: (message, title = "Success") =>
        showToast({ message, title, tone: "success" }),
      error: (message, title = "Something went wrong") =>
        showToast({
          message,
          title,
          tone: "error",
          duration: UI.errorDuration,
        }),
      info: (message, title = "Heads up") =>
        showToast({ message, title, tone: "info" }),
      warning: (message, title = "Attention") =>
        showToast({
          message,
          title,
          tone: "warning",
          duration: UI.warningDuration,
        }),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 top-4 z-100 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
