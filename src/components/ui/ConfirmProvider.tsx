import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ConfirmContext,
  type ConfirmOptions,
  type ConfirmTone,
  type PendingConfirm,
} from "@/utils/confirmContext";

type ConfirmStyle = {
  icon: LucideIcon;
  iconBox: string;
  confirmButton: string;
  glow: string;
};

const UI = {
  motion: {
    duration: 0.22,
    ease: [0.22, 1, 0.36, 1] as const,
  },
} as const;

const confirmStyles: Record<ConfirmTone, ConfirmStyle> = {
  danger: {
    icon: ShieldAlert,
    iconBox: "bg-red-400/15 text-red-300 ring-red-400/25",
    confirmButton:
      "bg-red-400 text-black hover:bg-red-300 focus-visible:ring-red-300",
    glow: "bg-red-400/15",
  },
  info: {
    icon: Info,
    iconBox: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/25",
    confirmButton:
      "bg-cyan-400 text-black hover:bg-cyan-300 focus-visible:ring-cyan-300",
    glow: "bg-cyan-400/15",
  },
  success: {
    icon: CheckCircle2,
    iconBox: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/25",
    confirmButton:
      "bg-emerald-400 text-black hover:bg-emerald-300 focus-visible:ring-emerald-300",
    glow: "bg-emerald-400/15",
  },
  warning: {
    icon: AlertTriangle,
    iconBox: "bg-amber-300/15 text-amber-200 ring-amber-300/25",
    confirmButton:
      "bg-amber-300 text-black hover:bg-amber-200 focus-visible:ring-amber-300",
    glow: "bg-amber-300/15",
  },
};

function ConfirmDialog({
  pending,
  onClose,
}: {
  pending: PendingConfirm;
  onClose: (confirmed: boolean) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const style = confirmStyles[pending.tone];
  const Icon = style.icon;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.clearTimeout(timer);
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose(false);
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center px-4 py-8"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <motion.button
        type="button"
        aria-label="Close confirm dialog"
        onClick={() => onClose(false)}
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0 }}
        transition={{
          duration: UI.motion.duration,
          ease: UI.motion.ease,
        }}
        className="absolute inset-0 bg-black/75 backdrop-blur-xl"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={pending.description ? descriptionId : undefined}
        initial={
          shouldReduceMotion
            ? false
            : {
                opacity: 0,
                y: 24,
                scale: 0.96,
                filter: "blur(10px)",
              }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
              }
        }
        exit={
          shouldReduceMotion
            ? undefined
            : {
                opacity: 0,
                y: 16,
                scale: 0.97,
                filter: "blur(8px)",
              }
        }
        transition={{
          duration: UI.motion.duration,
          ease: UI.motion.ease,
        }}
        className="relative w-full max-w-md overflow-hidden rounded-4xl border border-white/10 bg-[#0f172a]/95 shadow-[0_32px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-200/70 to-transparent" />
        <div
          className={`pointer-events-none absolute -right-20 -top-20 size-60 rounded-full blur-3xl ${style.glow}`}
        />

        <div className="relative p-6 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div
              className={`flex size-13 shrink-0 items-center justify-center rounded-2xl ring-1 ${style.iconBox}`}
            >
              <Icon className="size-6" aria-hidden="true" />
            </div>

            <button
              ref={cancelButtonRef}
              type="button"
              onClick={() => onClose(false)}
              aria-label="Cancel"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] active:scale-95"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <h2
            id={titleId}
            className="text-balance text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl"
          >
            {pending.title}
          </h2>

          {pending.description && (
            <p
              id={descriptionId}
              className="mt-3 text-sm leading-7 text-slate-400"
            >
              {pending.description}
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-black text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] active:translate-y-0"
            >
              {pending.cancelText}
            </button>

            <button
              type="button"
              onClick={() => onClose(true)}
              className={`inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-black shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] active:translate-y-0 ${style.confirmButton}`}
            >
              {pending.confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({
          title: options.title,
          description: options.description,
          confirmText: options.confirmText ?? "Confirm",
          cancelText: options.cancelText ?? "Cancel",
          tone: options.tone ?? "info",
          resolve,
        });
      }),
    [],
  );

  const close = useCallback(
    (confirmed: boolean) => {
      pending?.resolve(confirmed);
      setPending(null);
    },
    [pending],
  );

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {pending && <ConfirmDialog pending={pending} onClose={close} />}
    </ConfirmContext.Provider>
  );
}
