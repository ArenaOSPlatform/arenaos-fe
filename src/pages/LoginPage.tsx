import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  Radio,
  ShieldCheck,
  Trophy,
  UserRoundCheck,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { googleLogin, login, type AuthResponse } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import {
  clearStoredUserRole,
  getAccessTokenRole,
  isUserRole,
  roleHomePath,
  setStoredUserRole,
} from "@/routes/route-role";

function getEmailLooksValid(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.76-.07-1.49-.2-2.19H12v4.14h5.37a4.59 4.59 0 0 1-1.99 3.01v2.5h3.22c1.89-1.74 3-4.3 3-7.46Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.89 6.61-2.41l-3.22-2.5c-.89.6-2.03.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.08v2.58A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.92a6 6 0 0 1 0-3.84V7.5H3.08a10 10 0 0 0 0 9l3.32-2.58Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.51 3.83 1.5l2.86-2.86C16.96 2.99 14.7 2 12 2a9.99 9.99 0 0 0-8.92 5.5l3.32 2.58C7.19 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  );
}

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdApi = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: "popup";
    auto_select?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: number;
      logo_alignment?: "left" | "center";
    },
  ) => void;
  cancel?: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdApi;
      };
    };
  }
}

const googleIdentityScriptSrc = "https://accounts.google.com/gsi/client";
let googleIdentityScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${googleIdentityScriptSrc}"]`,
    );
    const script = existingScript ?? document.createElement("script");

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Google Identity Services")),
      { once: true },
    );

    if (!existingScript) {
      script.src = googleIdentityScriptSrc;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return googleIdentityScriptPromise;
}

export function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const emailReady = getEmailLooksValid(email);
  const passwordReady = password.trim().length > 0;
  const formReady = emailReady && passwordReady;

  const completeLogin = useCallback(
    (res: AuthResponse, message: string) => {
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);

      const roleFromResponse = res.data.user?.role ?? res.data.role;
      const role = isUserRole(roleFromResponse)
        ? roleFromResponse
        : getAccessTokenRole(res.data.accessToken);

      if (!role) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        clearStoredUserRole();
        toast.error("Invalid account role");
        return;
      }

      setStoredUserRole(role);
      toast.success(message);
      navigate(roleHomePath[role]);
    },
    [navigate, toast],
  );

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        toast.error("Google did not return a credential.");
        return;
      }

      try {
        setGoogleLoading(true);
        const res = await googleLogin({ idToken: response.credential });
        completeLogin(res, "Welcome back with Google.");
      } catch {
        toast.error("Google login failed.");
      } finally {
        setGoogleLoading(false);
      }
    },
    [completeLogin, toast],
  );

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled) {
          return;
        }

        const googleId = window.google?.accounts?.id;
        const buttonTarget = googleButtonRef.current;

        if (!googleId || !buttonTarget) {
          setGoogleError("Google login is unavailable.");
          return;
        }

        googleId.initialize({
          client_id: googleClientId,
          ux_mode: "popup",
          auto_select: false,
          callback: (response) => {
            void handleGoogleCredential(response);
          },
        });

        buttonTarget.innerHTML = "";
        googleId.renderButton(buttonTarget, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "signin_with",
          shape: "pill",
          width: Math.min(buttonTarget.clientWidth || 320, 360),
          logo_alignment: "left",
        });
        setGoogleReady(true);
        setGoogleError("");
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleError("Google login is unavailable.");
        }
      });

    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel?.();
    };
  }, [googleClientId, handleGoogleCredential]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!emailReady) {
      toast.warning("Enter a valid email address.");
      return;
    }

    if (!passwordReady) {
      toast.warning("Enter your password.");
      return;
    }

    try {
      setLoading(true);

      const res = await login({ email: email.trim(), password });
      completeLogin(res, "Welcome back to ArenaOS.");
    } catch {
      toast.error("Invalid email or password");
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
              <Radio className="size-4" aria-hidden="true" />
              ArenaOS secure access
            </span>

            <h1 className="mt-7 text-6xl font-black leading-none text-white">
              Return to your esports command center.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
              Sign in to manage brackets, live match rooms, organizer tools, and
              admin operations from one realtime workspace.
            </p>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <Trophy className="mb-3 size-5 text-amber-200" />
                <p className="text-sm font-black text-white">Tournaments</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Create, approve, and run events.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <UserRoundCheck className="mb-3 size-5 text-emerald-200" />
                <p className="text-sm font-black text-white">Teams</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Track players and invites.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <ShieldCheck className="mb-3 size-5 text-cyan-200" />
                <p className="text-sm font-black text-white">Security</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Role-based workspace access.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full">
          <div className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-[0_28px_110px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
            <div className="border-b border-white/10 p-6 text-center sm:p-8">
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-cyan-300 text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.22)]">
                <LogIn className="size-8" aria-hidden="true" />
              </div>

              <h2 className="text-4xl font-black leading-none text-white">
                Welcome Back
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Login to manage your esports arena.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 p-6 sm:p-8">
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

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-slate-300">
                    Password
                  </span>
                  {password && (
                    <span className="text-xs font-bold text-emerald-200">
                      Entered
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
                    placeholder="password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-black text-cyan-200 transition hover:text-white"
                  >
                    Forgot password?
                  </Link>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="group inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogIn className="size-4" aria-hidden="true" />
                )}
                Login
                {!loading && (
                  <ArrowRight
                    className="size-4 transition group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                )}
              </button>

              {!formReady && (
                <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center text-xs font-bold leading-5 text-slate-500">
                  Enter a valid email and password to continue.
                </p>
              )}

              <div className="flex items-center gap-3 text-xs font-black uppercase text-slate-600">
                <span className="h-px flex-1 bg-white/10" />
                <span>or</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-3">
                <div className="relative min-h-14 overflow-hidden rounded-2xl border border-white/10 bg-[#070b16] p-2">
                  {googleClientId ? (
                    <div
                      ref={googleButtonRef}
                      className={[
                        "flex min-h-10 w-full items-center justify-center transition",
                        googleReady ? "opacity-100" : "opacity-0",
                      ].join(" ")}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex min-h-10 w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-4 text-sm font-black text-slate-300"
                    >
                      <GoogleMark />
                      Sign in with Google
                    </button>
                  )}

                  {googleClientId && !googleReady && !googleError && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#070b16] text-xs font-black text-slate-400">
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Loading Google login
                    </div>
                  )}

                  {googleLoading && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/90 text-sm font-black text-cyan-100 backdrop-blur-sm">
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Signing in with Google
                    </div>
                  )}
                </div>

                {googleError && (
                  <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-center text-xs font-bold leading-5 text-amber-100">
                    {googleError}
                  </p>
                )}
              </div>
            </form>

            <div className="border-t border-white/10 px-6 py-5 text-center sm:px-8">
              <p className="text-sm text-slate-400">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-black text-cyan-200 transition hover:text-white"
                >
                  Register
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
