import { createContext } from "react";

type ToastTone = "success" | "error" | "info" | "warning";

type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  dismissToast: (id: number) => void;
};

export type { ToastContextValue, ToastInput, ToastTone };

export const ToastContext = createContext<ToastContextValue | null>(null);
