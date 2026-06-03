import { createContext } from "react";

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

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export type {
  ConfirmContextValue,
  ConfirmOptions,
  ConfirmTone,
  PendingConfirm,
};

export { ConfirmContext };
