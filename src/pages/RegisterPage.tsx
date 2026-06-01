import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, LockKeyhole, UserPlus, User } from "lucide-react";
import { useState } from "react";
import { register } from "@/services/auth.service";
import { useToast } from "@/components/ui";
import {
  clearStoredUserRole,
  getAccessTokenRole,
  isUserRole,
  roleHomePath,
  setStoredUserRole,
} from "@/routes/route-role";

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    try {
      setLoading(true);

      const res = await register({ username, email, password });

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
      toast.success("Account created successfully.");
      navigate(roleHomePath[role]);
    } catch {
      toast.error("Register failed. Check your information and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1020] px-6 py-16">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-cyan-400 text-black">
            <UserPlus size={30} />
          </div>

          <h1 className="text-4xl font-black">Join ArenaOS</h1>
          <p className="mt-3 text-white/60">
            Create your player account and enter the arena.
          </p>
        </div>

        <form className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-white/70">
              Username
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4">
              <User size={18} className="text-cyan-400" />
              <input
                type="text"
                placeholder="NovaPlayer"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full bg-transparent py-4 outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-white/70">
              Email
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4">
              <Mail size={18} className="text-cyan-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent py-4 outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-white/70">
              Password
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4">
              <LockKeyhole size={18} className="text-cyan-400" />
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent py-4 outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-4 font-black text-black hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-cyan-400">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}
