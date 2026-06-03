import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  forgotPassword,
  resetPassword,
  verifyResetOtp,
} from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";

type RecoveryStep = "email" | "otp" | "password";

function getEmailLooksValid(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState<RecoveryStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailReady = getEmailLooksValid(email);
  const otpReady = /^\d{6}$/.test(otp);
  const passwordReady = newPassword.trim().length >= 6;
  const confirmReady =
    newPassword === confirmPassword && confirmPassword !== "";

  async function requestOtp() {
    if (!emailReady) {
      toast.warning("Enter a valid email address.");
      return;
    }

    try {
      setSending(true);
      await forgotPassword({ email: email.trim() });
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setStep("otp");
      toast.success("OTP sent. Check your email inbox.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Email is not registered or OTP failed."),
      );
    } finally {
      setSending(false);
    }
  }

  function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestOtp();
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!otpReady) {
      toast.warning("OTP must be 6 digits.");
      return;
    }

    try {
      setVerifying(true);
      await verifyResetOtp({
        email: email.trim(),
        otp,
      });
      setStep("password");
      toast.success("OTP verified.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Invalid or expired OTP."));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordReady) {
      toast.warning("New password must be at least 6 characters.");
      return;
    }

    if (!confirmReady) {
      toast.warning("Confirm password does not match.");
      return;
    }

    try {
      setResetting(true);
      await resetPassword({
        email: email.trim(),
        otp,
        newPassword,
      });
      toast.success("Password reset successfully.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not reset password."));
      setStep("otp");
    } finally {
      setResetting(false);
    }
  }

  function restartRecovery() {
    setStep("email");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_48%,#050816_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)]">
        <section className="hidden lg:block">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase text-cyan-100">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Account recovery
            </span>

            <h1 className="mt-7 text-6xl font-black leading-none text-white">
              Recover access without leaving the arena.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
              Verify your account email first, confirm the OTP, then set a fresh
              ArenaOS password.
            </p>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <Mail className="mb-3 size-5 text-cyan-200" />
                <p className="text-sm font-black text-white">Email check</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Unknown emails are rejected.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <KeyRound className="mb-3 size-5 text-amber-200" />
                <p className="text-sm font-black text-white">OTP gate</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Password fields unlock after verification.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <CheckCircle2 className="mb-3 size-5 text-emerald-200" />
                <p className="text-sm font-black text-white">Session reset</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Old refresh tokens are cleared.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full">
          <div className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-[0_28px_110px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
            <div className="border-b border-white/10 p-6 text-center sm:p-8">
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-cyan-300 text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.22)]">
                <KeyRound className="size-8" aria-hidden="true" />
              </div>

              <h2 className="text-4xl font-black leading-none text-white">
                Reset Password
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {step === "email" && "Enter the account email first."}
                {step === "otp" && "Verify the OTP before setting a password."}
                {step === "password" && "OTP verified. Set a new password."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-px bg-white/10">
              {["Email", "OTP", "Password"].map((label, index) => {
                const activeIndex =
                  step === "email" ? 0 : step === "otp" ? 1 : 2;

                return (
                  <div
                    key={label}
                    className={[
                      "bg-[#111827] px-3 py-3 text-center text-xs font-black uppercase",
                      index <= activeIndex ? "text-cyan-100" : "text-slate-600",
                    ].join(" ")}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {step === "email" && (
              <form
                onSubmit={handleRequestOtp}
                className="space-y-5 p-6 sm:p-8"
              >
                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-300">
                      Email
                    </span>
                    {email && (
                      <span
                        className={[
                          "text-xs font-bold",
                          emailReady ? "text-emerald-200" : "text-amber-200",
                        ].join(" ")}
                      >
                        {emailReady ? "Ready" : "Check format"}
                      </span>
                    )}
                  </div>
                  <div className="flex min-h-13 items-center gap-3 rounded-2xl border border-white/10 bg-[#070b16] px-4 transition focus-within:border-cyan-200/50 focus-within:ring-4 focus-within:ring-cyan-300/10">
                    <Mail className="size-5 text-cyan-300" aria-hidden="true" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full bg-transparent py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={sending}
                  className="group inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                >
                  {sending ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Mail className="size-4" aria-hidden="true" />
                  )}
                  Send OTP
                  {!sending && (
                    <ArrowRight
                      className="size-4 transition group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-5 p-6 sm:p-8">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Recovery email
                  </p>
                  <p className="mt-2 break-all text-sm font-black text-white">
                    {email}
                  </p>
                </div>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-300">
                      OTP
                    </span>
                    {otp && (
                      <span
                        className={[
                          "text-xs font-bold",
                          otpReady ? "text-emerald-200" : "text-amber-200",
                        ].join(" ")}
                      >
                        {otpReady ? "Ready" : "6 digits"}
                      </span>
                    )}
                  </div>
                  <div className="flex min-h-13 items-center gap-3 rounded-2xl border border-white/10 bg-[#070b16] px-4 transition focus-within:border-cyan-200/50 focus-within:ring-4 focus-within:ring-cyan-300/10">
                    <KeyRound
                      className="size-5 text-cyan-300"
                      aria-hidden="true"
                    />
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(event) =>
                        setOtp(event.target.value.replace(/\D/g, ""))
                      }
                      className="w-full bg-transparent py-4 text-sm font-black tracking-[0.35em] text-white outline-none placeholder:tracking-normal placeholder:text-slate-600"
                    />
                  </div>
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={verifying}
                    className="group inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                  >
                    {verifying ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    )}
                    Verify OTP
                  </button>

                  <button
                    type="button"
                    onClick={() => void requestOtp()}
                    disabled={sending}
                    className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-5 text-sm font-black text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <RotateCw className="size-4" aria-hidden="true" />
                    )}
                    Resend
                  </button>
                </div>

                <button
                  type="button"
                  onClick={restartRecovery}
                  className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-white"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Use another email
                </button>
              </form>
            )}

            {step === "password" && (
              <form
                onSubmit={handleResetPassword}
                className="space-y-5 p-6 sm:p-8"
              >
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100">
                  <CheckCircle2 className="mb-2 size-5" aria-hidden="true" />
                  OTP verified for {email}.
                </div>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-300">
                      New password
                    </span>
                    {newPassword && (
                      <span
                        className={[
                          "text-xs font-bold",
                          passwordReady ? "text-emerald-200" : "text-amber-200",
                        ].join(" ")}
                      >
                        {passwordReady ? "Ready" : "6+ chars"}
                      </span>
                    )}
                  </div>
                  <div className="flex min-h-13 items-center gap-3 rounded-2xl border border-white/10 bg-[#070b16] px-4 transition focus-within:border-cyan-200/50 focus-within:ring-4 focus-within:ring-cyan-300/10">
                    <LockKeyhole
                      className="size-5 text-cyan-300"
                      aria-hidden="true"
                    />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="new password"
                      value={newPassword}
                      autoComplete="new-password"
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full bg-transparent py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((value) => !value)}
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                    >
                      {showNewPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-300">
                      Confirm password
                    </span>
                    {confirmPassword && (
                      <span
                        className={[
                          "text-xs font-bold",
                          confirmReady ? "text-emerald-200" : "text-amber-200",
                        ].join(" ")}
                      >
                        {confirmReady ? "Match" : "No match"}
                      </span>
                    )}
                  </div>
                  <div className="flex min-h-13 items-center gap-3 rounded-2xl border border-white/10 bg-[#070b16] px-4 transition focus-within:border-cyan-200/50 focus-within:ring-4 focus-within:ring-cyan-300/10">
                    <LockKeyhole
                      className="size-5 text-cyan-300"
                      aria-hidden="true"
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="confirm password"
                      value={confirmPassword}
                      autoComplete="new-password"
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className="w-full bg-transparent py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={resetting}
                  className="group inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                >
                  {resetting ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  )}
                  Reset Password
                </button>
              </form>
            )}

            <div className="border-t border-white/10 px-6 py-5 text-center sm:px-8">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-black text-cyan-200 transition hover:text-white"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to login
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
