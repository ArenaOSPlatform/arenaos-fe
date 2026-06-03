import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

type BackButtonProps = {
  fallbackTo?: string;
  label?: string;
  className?: string;
};

export function BackButton({
  fallbackTo = "/",
  label = "Back",
  className = "",
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleBack() {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }

    navigate(fallbackTo);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={[
        "inline-flex min-h-11 w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0",
        className,
      ].join(" ")}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
