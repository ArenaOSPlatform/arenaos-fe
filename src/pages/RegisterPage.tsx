import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Trophy,
  User,
  UserPlus,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { register } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import { clearStoredUserRole } from "@/routes/route-role";
import { clearStoredTokens } from "@/utils/authStorage";

function getEmailLooksValid(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function getPasswordLooksStrong(value: string) {
  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^\sA-Za-z0-9]/.test(value)
  );
}

function getPasswordRequirementLabel(value: string) {
  const missing = [];

  if (value.length < 8) missing.push("8+ chars");
  if (!/[A-Z]/.test(value)) missing.push("A-Z");
  if (!/[a-z]/.test(value)) missing.push("a-z");
  if (!/\d/.test(value)) missing.push("0-9");
  if (!/[^\sA-Za-z0-9]/.test(value)) missing.push("symbol");

  return missing.join(", ");
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(". ");
    }
  }

  return fallback;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const usernameReady = username.trim().length >= 3;
  const emailReady = getEmailLooksValid(email);
  const passwordReady = getPasswordLooksStrong(password);
  const formReady = usernameReady && emailReady && passwordReady;

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!usernameReady) {
      toast.warning("Full name must be at least 3 characters.");
      return;
    }

    if (!emailReady) {
      toast.warning("Enter a valid email address.");
      return;
    }

    if (!passwordReady) {
      toast.warning(
        "Password needs 8+ characters with uppercase, lowercase, number, and symbol.",
      );
      return;
    }

    try {
      setLoading(true);

      await register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      clearStoredTokens();
      clearStoredUserRole();
      toast.success("Account created successfully. Please login to continue.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Register failed. Check your information and try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.1),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.1),transparent_35%),linear-gradient(180deg,#050816_0%,#08111f_48%,#050816_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)]">
        <section className="hidden lg:block">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase text-cyan-100">
              <UserPlus className="size-4" aria-hidden="true" />
              ArenaOS onboarding
            </span>

            <h1 className="mt-7 text-6xl font-black leading-none text-white">
              Build your player identity for the arena.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
              Join tournaments, manage team access, and move into the right
              workspace automatically after registration.
            </p>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <User className="mb-3 size-5 text-cyan-200" />
                <p className="text-sm font-black text-white">Profile</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Start with a clean player handle.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <Trophy className="mb-3 size-5 text-amber-200" />
                <p className="text-sm font-black text-white">Arena Access</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Enter public events and match rooms.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <ShieldCheck className="mb-3 size-5 text-emerald-200" />
                <p className="text-sm font-black text-white">Secure Role</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Route into the right dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full">
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-[0_28px_110px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
            <div className="border-b border-white/10 p-6 text-center sm:p-8">
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-cyan-300 text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.22)]">
                <UserPlus className="size-8" aria-hidden="true" />
              </div>

              <h2 className="text-4xl font-black leading-none text-white">
                Join ArenaOS
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Create your player account and enter the arena.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5 p-6 sm:p-8">
              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-slate-300">
                    Full Name
                  </span>
                  {username && (
                    <span
                      className={[
                        "text-xs font-bold",
                        usernameReady ? "text-emerald-200" : "text-amber-200",
                      ].join(" ")}
                    >
                      {usernameReady ? "Ready" : "3+ chars"}
                    </span>
                  )}
                </div>
                <div className="flex min-h-13 items-center gap-3 rounded-2xl border border-white/10 bg-[#070b16] px-4 transition focus-within:border-cyan-200/50 focus-within:ring-4 focus-within:ring-cyan-300/10">
                  <User className="size-5 text-cyan-300" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Alex Nguyen"
                    value={username}
                    autoComplete="name"
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full bg-transparent py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600"
                  />
                </div>
              </label>

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
                    value={email}
                    autoComplete="email"
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600"
                  />
                </div>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-slate-300">
                    Password
                  </span>
                  {password && (
                    <span
                      className={[
                        "text-xs font-bold",
                        passwordReady ? "text-emerald-200" : "text-amber-200",
                      ].join(" ")}
                    >
                      {passwordReady
                        ? "Strong"
                        : getPasswordRequirementLabel(password)}
                    </span>
                  )}
                </div>
                <div className="flex min-h-13 items-center gap-3 rounded-2xl border border-white/10 bg-[#070b16] px-4 transition focus-within:border-cyan-200/50 focus-within:ring-4 focus-within:ring-cyan-300/10">
                  <LockKeyhole
                    className="size-5 text-cyan-300"
                    aria-hidden="true"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Strong password"
                    value={password}
                    autoComplete="new-password"
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus className="size-4" aria-hidden="true" />
                )}
                Create Account
                {!loading && (
                  <ArrowRight
                    className="size-4 transition group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                )}
              </button>

              {!formReady && (
                <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center text-xs font-bold leading-5 text-slate-500">
                  Full name, email, and strong password must be ready before
                  creating an account.
                </p>
              )}
            </form>

            <div className="border-t border-white/10 px-6 py-5 text-center sm:px-8">
              <p className="text-sm text-slate-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-black text-cyan-200 transition hover:text-white"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
