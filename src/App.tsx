import { ConfirmProvider, ToastProvider } from "@/components/ui";
import { AppRouter } from "@/routes/AppRouter";

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppRouter />
      </ConfirmProvider>
    </ToastProvider>
  );
}
