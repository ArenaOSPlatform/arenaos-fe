import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";

type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  duration?: number;
};

type Toast = {
  id: number;
  title?: string;
  message: string;
  tone: ToastTone;
  duration: number;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  dismissToast: (id: number) => void;
};

type ToastStyle = {
  icon: LucideIcon;
  shell: string;
  iconBox: string;
  title: string;
  bar: string;
};

const toastStyles: Record<ToastTone, ToastStyle> = {
  success: {
    icon: CheckCircle2,
    shell: "border-emerald-400/25 bg-[#061912]/95 shadow-emerald-950/40",
    iconBox: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/20",
    title: "text-emerald-100",
    bar: "bg-emerald-300",
  },
  error: {
    icon: XCircle,
    shell: "border-red-400/25 bg-[#1b0810]/95 shadow-red-950/40",
    iconBox: "bg-red-400/15 text-red-300 ring-red-400/20",
    title: "text-red-100",
    bar: "bg-red-300",
  },
  info: {
    icon: Info,
    shell: "border-cyan-400/25 bg-[#071725]/95 shadow-cyan-950/40",
    iconBox: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/20",
    title: "text-cyan-100",
    bar: "bg-cyan-300",
  },
  warning: {
    icon: AlertTriangle,
    shell: "border-amber-300/25 bg-[#1c1406]/95 shadow-amber-950/40",
    iconBox: "bg-amber-300/15 text-amber-200 ring-amber-300/20",
    title: "text-amber-100",
    bar: "bg-amber-200",
  },
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, tone = "info", duration = 4200 }: ToastInput) => {
      const id = Date.now() + Math.random();

      setToasts((prev) =>
        [{ id, title, message, tone, duration }, ...prev].slice(0, 5),
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
        showToast({ message, title, tone: "error", duration: 5600 }),
      info: (message, title = "Heads up") =>
        showToast({ message, title, tone: "info" }),
      warning: (message, title = "Attention") =>
        showToast({ message, title, tone: "warning", duration: 5200 }),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => {
          const style = toastStyles[toast.tone];
          const Icon = style.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl animate-[toast-in_220ms_ease-out] ${style.shell}`}
            >
              <div className="flex gap-3 p-4">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${style.iconBox}`}
                >
                  <Icon size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  {toast.title && (
                    <p className={`text-sm font-black ${style.title}`}>
                      {toast.title}
                    </p>
                  )}
                  <p className="mt-1 break-words text-sm leading-5 text-white/70">
                    {toast.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss toast"
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {toast.duration > 0 && (
                <div className="h-1 bg-white/5">
                  <div
                    className={`h-full origin-left animate-[toast-bar_linear_forwards] ${style.bar}`}
                    style={{ animationDuration: `${toast.duration}ms` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
