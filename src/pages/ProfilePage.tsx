import {
  Camera,
  ImagePlus,
  Loader2,
  Mail,
  RotateCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, updateProfile } from "@/services/auth.service";
import { uploadFile } from "@/services/upload.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/hooks/useToast";

type ProfileUser = {
  sub: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  status: string;
};

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join("");

  return (initials || "AO").toUpperCase();
}

export function ProfilePage() {
  const toast = useToast();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const usernameReady = username.trim().length >= 3;
  const avatarPreviewUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile],
  );
  const previewUrl = avatarPreviewUrl ?? (removeAvatar ? null : user?.avatarUrl);

  async function loadProfile() {
    try {
      setLoading(true);
      const res = await getMe();

      setUser(res.data);
      setUsername(res.data.username);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setPageError("");
    } catch {
      const message = "Failed to load profile.";
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((res) => {
        if (cancelled) {
          return;
        }

        setUser(res.data);
        setUsername(res.data.username);
        setAvatarFile(null);
        setRemoveAvatar(false);
        setPageError("");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        const message = "Failed to load profile.";
        setPageError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.type.startsWith("image/")) {
      setAvatarFile(file);
      setRemoveAvatar(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file && file.type.startsWith("image/")) {
      setAvatarFile(file);
      setRemoveAvatar(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!usernameReady) {
      toast.warning("Username must be at least 3 characters.");
      return;
    }

    try {
      setSaving(true);

      let avatarUrl: string | null | undefined;

      if (avatarFile) {
        const uploadRes = await uploadFile(avatarFile);
        avatarUrl = uploadRes.data.url;
      } else if (removeAvatar) {
        avatarUrl = null;
      }

      const res = await updateProfile({
        username: username.trim(),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      });

      setUser(res.data);
      setUsername(res.data.username);
      setAvatarFile(null);
      setRemoveAvatar(false);
      toast.success("Profile updated.");
    } catch {
      toast.error("Update profile failed. Username may already exist.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
        <LoadingState
          title="Loading profile..."
          description="Fetching your ArenaOS account details."
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
        <EmptyState
          icon={User}
          title="Profile unavailable"
          description={pageError || "Login again to manage your profile."}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_46%,#050816_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Account Profile
          </span>
          <h1 className="mt-7 text-4xl font-black leading-none text-white sm:text-6xl">
            Manage your ArenaOS identity.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            Update your username and avatar used across tournaments, teams,
            match rooms and organizer tools.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
            <div className="flex flex-col items-center text-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={user.username}
                  className="size-32 rounded-[2rem] border border-white/10 object-cover shadow-[0_22px_80px_rgba(0,0,0,0.32)]"
                />
              ) : (
                <div className="flex size-32 items-center justify-center rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 text-4xl font-black text-cyan-100 shadow-[0_22px_80px_rgba(34,211,238,0.12)]">
                  {getInitials(username)}
                </div>
              )}

              <h2 className="mt-5 text-2xl font-black text-white">
                {user.username}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{user.email}</p>

              <div className="mt-5 grid w-full grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Role
                  </p>
                  <p className="mt-2 font-black text-cyan-100">{user.role}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </p>
                  <p className="mt-2 font-black text-emerald-100">
                    {user.status}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <form
            onSubmit={handleSubmit}
            className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-8"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">
                Profile Details
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Email is read-only for now. Use username and avatar to control
                how you appear inside ArenaOS.
              </p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-slate-300">
                    Username
                  </span>
                  <span
                    className={[
                      "text-xs font-bold",
                      usernameReady ? "text-emerald-200" : "text-amber-200",
                    ].join(" ")}
                  >
                    {usernameReady ? "Ready" : "3+ chars"}
                  </span>
                </div>
                <div className="flex min-h-13 items-center gap-3 rounded-2xl border border-white/10 bg-[#070b16] px-4 transition focus-within:border-cyan-200/50 focus-within:ring-4 focus-within:ring-cyan-300/10">
                  <User className="size-5 text-cyan-300" aria-hidden="true" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full bg-transparent py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600"
                    placeholder="Your username"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-300">
                  Email
                </span>
                <div className="flex min-h-13 items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 opacity-80">
                  <Mail className="size-5 text-slate-500" aria-hidden="true" />
                  <input
                    value={user.email}
                    readOnly
                    className="w-full bg-transparent py-4 text-sm font-medium text-slate-400 outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-300">
                  Avatar
                </span>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={[
                    "relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition duration-200",
                    isDragOver
                      ? "border-cyan-300/60 bg-cyan-300/10 scale-[1.01]"
                      : "border-white/15 bg-[#070b16] hover:border-white/25 hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    aria-label="Upload avatar image"
                  />

                  <div className="flex flex-col items-center gap-3 p-8 text-center">
                    {avatarFile ? (
                      <>
                        <div className="flex size-12 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-300">
                          <Camera className="size-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">
                            {avatarFile.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {(avatarFile.size / 1024).toFixed(1)} KB · Click to change
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-400">
                          {isDragOver ? (
                            <Upload className="size-6 text-cyan-300" />
                          ) : (
                            <ImagePlus className="size-6" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">
                            {isDragOver ? "Drop to upload" : "Drag & drop or click"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            PNG, JPG, WEBP · max 5 MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setRemoveAvatar(true);
                  }}
                  disabled={saving || (!user.avatarUrl && !avatarFile)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-300/25 bg-red-300/10 px-5 text-sm font-black text-red-100 transition hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  Remove Avatar
                </button>

                <button
                  type="button"
                  onClick={loadProfile}
                  disabled={saving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-5 text-sm font-black text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCw className="size-4" />
                  Reset
                </button>
              </div>

              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100">
                <Camera className="mb-2 size-5" />
                Avatar images are validated before being saved to your account.
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
