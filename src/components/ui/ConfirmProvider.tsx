import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type ConfirmTone = "danger" | "info" | "success" | "warning";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
};

type PendingConfirm = Required<Omit<ConfirmOptions, "description">> & {
  description?: string;
  resolve: (confirmed: boolean) => void;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

type ConfirmStyle = {
  icon: LucideIcon;
  iconBox: string;
  confirmButton: string;
};

const confirmStyles: Record<ConfirmTone, ConfirmStyle> = {
  danger: {
    icon: ShieldAlert,
    iconBox: "bg-red-400/15 text-red-300 ring-red-400/20",
    confirmButton: "bg-red-400 text-black hover:bg-red-300",
  },
  info: {
    icon: Info,
    iconBox: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/20",
    confirmButton: "bg-cyan-400 text-black hover:bg-cyan-300",
  },
  success: {
    icon: CheckCircle2,
    iconBox: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/20",
    confirmButton: "bg-emerald-400 text-black hover:bg-emerald-300",
  },
  warning: {
    icon: AlertTriangle,
    iconBox: "bg-amber-300/15 text-amber-200 ring-amber-300/20",
    confirmButton: "bg-amber-300 text-black hover:bg-amber-200",
  },
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

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

  const style = pending ? confirmStyles[pending.tone] : null;
  const Icon = style?.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {pending && style && Icon && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close confirm dialog"
            onClick={() => close(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0f172a]/95 shadow-2xl shadow-black/50 animate-[modal-in_180ms_ease-out]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

            <div className="p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${style.iconBox}`}
                >
                  <Icon size={24} />
                </div>

                <button
                  type="button"
                  onClick={() => close(false)}
                  aria-label="Cancel"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <h2 className="text-2xl font-black text-white">{pending.title}</h2>

              {pending.description && (
                <p className="mt-3 text-sm leading-6 text-white/60">
                  {pending.description}
                </p>
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {pending.cancelText}
                </button>

                <button
                  type="button"
                  onClick={() => close(true)}
                  className={`rounded-2xl px-5 py-3 text-sm font-black transition ${style.confirmButton}`}
                >
                  {pending.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }

  return context.confirm;
}
