import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  acceptTeamInvite,
  createTeam,
  getMyTeamInvites,
  getMyTeams,
  getTeamRankingHistory,
  getTeamSchedule,
  inviteTeamMember,
  leaveTeam,
  removeTeamMember,
  rejectTeamInvite,
  type TeamScheduleMatch,
  type TeamRankingHistory,
  updateTeam,
} from "@/services/team.service";
import { getMe } from "@/services/auth.service";
import { uploadFile } from "@/services/upload.service";
import {
  BarChart3,
  CalendarDays,
  LogOut,
  Loader2,
  MailPlus,
  Medal,
  Pencil,
  Save,
  Shield,
  Swords,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";

type TeamMember = {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

type Team = {
  id: string;
  name: string;
  logoUrl: string | null;
  game: string | null;
  region: string | null;
  status: string;
  description: string | null;
  totalMatchesPlayed?: number;
  totalWins?: number;
  totalLosses?: number;
  championCount?: number;
  overallWinRate?: number;
  captain: {
    id: string;
    username: string;
    email: string;
  };
  members: TeamMember[];
};

type TeamInvite = {
  id: string;
  status: string;
  team: {
    name: string;
  };
  inviter: {
    username: string;
    email: string;
  };
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    const message = response?.data?.message;

    if (typeof message === "string") return message;
    if (Array.isArray(message) && message.length > 0) return message.join(", ");
  }

  return fallback;
}

type Tone = "cyan" | "emerald" | "amber" | "red" | "violet" | "slate";

const toneClasses: Record<Tone, string> = {
  cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  red: "border-red-300/20 bg-red-300/10 text-red-100",
  violet: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  slate: "border-white/10 bg-white/[0.055] text-slate-200",
};

function getStatusTone(status: string): Tone {
  if (
    [
      "ACCEPTED",
      "APPROVED",
      "COMPLETED",
      "WIN",
      "LIVE",
      "IN_PROGRESS",
      "ONGOING",
    ].includes(status)
  ) {
    return "emerald";
  }

  if (
    [
      "PENDING",
      "PENDING_SCHEDULE",
      "MATCH_SCHEDULED",
      "SCHEDULED",
      "CHECK_IN_OPEN",
      "WAITING_CONFIRMATION",
      "OPEN",
    ].includes(status)
  ) {
    return "amber";
  }

  if (["REJECTED", "CANCELLED", "DISPUTED", "LOSS"].includes(status)) {
    return "red";
  }

  if (["BRACKET_GENERATED", "REGISTRATION_CLOSED"].includes(status)) {
    return "violet";
  }

  return "cyan";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  if (!value) return "TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join("");

  return (initials || "AO").toUpperCase();
}

function StatusPill({ value }: { value: string }) {
  const tone = getStatusTone(value);

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${toneClasses[tone]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {formatStatus(value)}
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone: Tone;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-4xl font-black leading-none text-white">
            {value}
          </p>
          {helper && <p className="mt-2 text-sm text-slate-400">{helper}</p>}
        </div>
        <span
          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border ${toneClasses[tone]}`}
        >
          {icon}
        </span>
      </div>
    </article>
  );
}

function PanelShell({
  icon,
  title,
  description,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl",
        className,
      ].join(" ")}
    >
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-white">{title}</h2>
            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function TeamMark({
  name,
  logoUrl,
  size = "lg",
}: {
  name: string;
  logoUrl?: string | null;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "size-24 text-3xl" : "size-12 text-base";

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`${sizeClass} rounded-[1.35rem] border border-white/10 object-cover shadow-[0_18px_70px_rgba(0,0,0,0.25)]`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-[1.35rem] border border-cyan-300/20 bg-cyan-300/10 font-black text-cyan-100 shadow-[0_18px_70px_rgba(34,211,238,0.1)]`}
    >
      {getInitials(name)}
    </div>
  );
}

export function TeamDashboardPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();
  const isCreateRoute = location.pathname === "/team/create";
  const [team, setTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [ranking, setRanking] = useState<TeamRankingHistory | null>(null);
  const [schedule, setSchedule] = useState<TeamScheduleMatch[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamGame, setTeamGame] = useState("");
  const [teamRegion, setTeamRegion] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamGame, setEditTeamGame] = useState("");
  const [editTeamRegion, setEditTeamRegion] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [editTeamLogoFile, setEditTeamLogoFile] = useState<File | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  const loadTeamData = useCallback(async (preferredTeamId: string | null) => {
    const [meRes, teamsRes, invitesRes] = await Promise.all([
      getMe(),
      getMyTeams(),
      getMyTeamInvites(),
    ]);
    const userTeams = (teamsRes.data ?? []) as Team[];
    const nextTeam =
      userTeams.find((item) => item.id === preferredTeamId) ??
      userTeams[0] ??
      null;

    setCurrentUserId(meRes.data.sub);
    setTeams(userTeams);
    setTeam(nextTeam);
    setSelectedTeamId(nextTeam?.id ?? null);
    setInvites(invitesRes.data);

    if (nextTeam) {
      const [rankingRes, scheduleRes] = await Promise.all([
        getTeamRankingHistory(nextTeam.id),
        getTeamSchedule(nextTeam.id),
      ]);

      setRanking(rankingRes.data);
      setSchedule(scheduleRes.data);
      setEditTeamName(nextTeam.name);
      setEditTeamGame(nextTeam.game ?? "");
      setEditTeamRegion(nextTeam.region ?? "");
      setEditTeamDescription(nextTeam.description ?? "");
      setEditTeamLogoFile(null);
      return;
    }

    setRanking(null);
    setSchedule([]);
    setEditTeamName("");
    setEditTeamGame("");
    setEditTeamRegion("");
    setEditTeamDescription("");
    setEditTeamLogoFile(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchTeam() {
      try {
        await loadTeamData(null);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            getApiErrorMessage(err, "Failed to load team dashboard."),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchTeam();

    return () => {
      cancelled = true;
    };
  }, [loadTeamData, toast]);

  async function handleCreateTeam() {
    if (!teamName.trim()) {
      toast.warning("Team name is required.");
      return;
    }

    if (!teamGame.trim() || !teamRegion.trim()) {
      toast.warning("Game and region are required.");
      return;
    }

    try {
      setLoadingAction(true);
      const logoUrl = teamLogoFile
        ? (await uploadFile(teamLogoFile)).data.url
        : undefined;

      const res = await createTeam({
        name: teamName.trim(),
        game: teamGame.trim(),
        region: teamRegion.trim(),
        description: teamDescription.trim() || undefined,
        logoUrl,
      });

      toast.success(res.message);
      setTeamName("");
      setTeamGame("");
      setTeamRegion("");
      setTeamDescription("");
      setTeamLogoFile(null);
      await loadTeamData(res.data?.id);

      if (isCreateRoute) {
        navigate("/team");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Create team failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleInviteMember() {
    if (!team) return;

    if (team.captain.id !== currentUserId) {
      toast.warning("Only the captain can invite players.");
      return;
    }

    if (!inviteEmail.trim()) {
      toast.warning("Player email or username is required.");
      return;
    }

    try {
      setLoadingAction(true);

      const res = await inviteTeamMember(team.id, {
        identifier: inviteEmail.trim(),
      });

      toast.success(res.message);
      setInviteEmail("");
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Invite failed. Only the captain can invite members.",
        ),
      );
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleUpdateTeam() {
    if (!team) return;

    if (team.captain.id !== currentUserId) {
      toast.warning("Only the captain can edit team.");
      return;
    }

    if (!editTeamName.trim()) {
      toast.warning("Team name is required.");
      return;
    }

    if (!editTeamGame.trim() || !editTeamRegion.trim()) {
      toast.warning("Game and region are required.");
      return;
    }

    const confirmed = await confirm({
      title: "Update team?",
      description: `${team.name} profile will be updated.`,
      confirmText: "Save changes",
      tone: "info",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);
      const logoUrl = editTeamLogoFile
        ? (await uploadFile(editTeamLogoFile)).data.url
        : undefined;

      const res = await updateTeam(team.id, {
        name: editTeamName.trim(),
        game: editTeamGame.trim(),
        region: editTeamRegion.trim(),
        description: editTeamDescription.trim() || undefined,
        ...(logoUrl ? { logoUrl } : {}),
      });

      toast.success(res.message);
      setTeam(res.data);
      setEditingTeam(false);
      await loadTeamData(selectedTeamId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Update team failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleRemoveMember(member: TeamMember) {
    if (!team) return;

    const confirmed = await confirm({
      title: "Remove member?",
      description: `${member.user.username} will be removed from ${team.name}.`,
      confirmText: "Remove",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);

      const res = await removeTeamMember(team.id, member.user.id);

      toast.success(res.message);
      await loadTeamData(selectedTeamId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Remove member failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleLeaveTeam() {
    if (!team) return;

    const confirmed = await confirm({
      title: "Leave team?",
      description: `You will leave ${team.name}. Captains may be blocked if the team still has members or tournament history.`,
      confirmText: "Leave",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);

      const res = await leaveTeam(team.id);
      const nextTeamId = teams.find((item) => item.id !== team.id)?.id ?? null;

      toast.success(res.message);
      setEditingTeam(false);
      await loadTeamData(nextTeamId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Leave team failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleSelectTeam(teamId: string) {
    if (teamId === team?.id) return;

    try {
      setLoadingAction(true);
      setEditingTeam(false);
      await loadTeamData(teamId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Switch team failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleAcceptInvite(inviteId: string) {
    try {
      setLoadingAction(true);

      const res = await acceptTeamInvite(inviteId);

      toast.success(res.message);
      await loadTeamData(selectedTeamId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Accept invite failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleRejectInvite(inviteId: string) {
    const invite = invites.find((item) => item.id === inviteId);
    const confirmed = await confirm({
      title: "Reject team invite?",
      description: `Decline the invite from ${invite?.team.name ?? "this team"}.`,
      confirmText: "Reject",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);

      const res = await rejectTeamInvite(inviteId);

      toast.success(res.message);
      await loadTeamData(selectedTeamId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Reject invite failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_48%,#050816_100%)]" />
        <LoadingState
          title="Loading team..."
          description="Syncing roster, invitations and player details."
        />
      </div>
    );
  }

  const isCaptain = Boolean(team && team.captain.id === currentUserId);
  const teamTitle = team?.name ?? "Create Your Team";
  const teamDescriptionText =
    team?.description ??
    "Create a team, accept invites and invite players using the backend team APIs.";
  const winRate = ranking?.overall
    ? ranking.overall.winRate
    : ranking
      ? ranking.winRate
      : team?.overallWinRate;
  const matchesPlayed =
    ranking?.overall?.matchesPlayed ??
    ranking?.matchesPlayed ??
    team?.totalMatchesPlayed ??
    0;
  const wins = ranking?.overall?.wins ?? ranking?.wins ?? team?.totalWins ?? 0;
  const losses =
    ranking?.overall?.losses ?? ranking?.losses ?? team?.totalLosses ?? 0;
  const titles = ranking?.overall?.championCount ?? team?.championCount ?? 0;

  if (isCreateRoute) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_46%,#050816_100%)]" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
              <Users className="size-4" aria-hidden="true" />
              Team Create
            </span>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-5xl">
              Create a new roster.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
              Captains can manage multiple active teams, but only one active
              team per game. Use the dashboard to switch between your rosters.
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <PanelShell
              icon={<Users className="size-6" />}
              title="New Team"
              description="Create a roster profile and start inviting players."
            >
              <div className="space-y-4">
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Team name"
                  className="w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={teamGame}
                    onChange={(event) => setTeamGame(event.target.value)}
                    placeholder="Game"
                    className="w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                  />
                  <input
                    value={teamRegion}
                    onChange={(event) => setTeamRegion(event.target.value)}
                    placeholder="Region"
                    className="w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                  />
                </div>
                <textarea
                  value={teamDescription}
                  onChange={(event) => setTeamDescription(event.target.value)}
                  placeholder="Description"
                  className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setTeamLogoFile(event.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:font-black file:text-slate-950"
                />
                {teamLogoFile && (
                  <p className="text-xs font-bold text-slate-500">
                    Selected logo: {teamLogoFile.name}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCreateTeam}
                  disabled={
                    loadingAction ||
                    !teamName.trim() ||
                    !teamGame.trim() ||
                    !teamRegion.trim()
                  }
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {loadingAction ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Users className="size-4" />
                  )}
                  Create Team
                </button>
              </div>
            </PanelShell>

            <div className="space-y-6">
              <PanelShell
                icon={<Trophy className="size-6" />}
                title="My Teams"
                description="Switch to an existing roster when you need captain tools."
              >
                {teams.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Users}
                    title="No teams yet"
                    description="Created teams and accepted rosters will appear here."
                  />
                ) : (
                  <div className="space-y-3">
                    {teams.map((item) => (
                      <Link
                        key={item.id}
                        to="/team"
                        onClick={() => {
                          void handleSelectTeam(item.id);
                        }}
                        className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-black/25 p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
                      >
                        <TeamMark
                          name={item.name}
                          logoUrl={item.logoUrl}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">
                            {item.name}
                          </p>
                          <p className="mt-1 truncate text-sm text-slate-400">
                            {item.game ?? "No game"} -{" "}
                            {item.region ?? "No region"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </PanelShell>

              <PanelShell
                icon={<MailPlus className="size-6" />}
                title="Pending Invites"
                description="Accept or decline team invitations sent to your account."
              >
                {invites.length === 0 ? (
                  <EmptyState
                    compact
                    icon={MailPlus}
                    title="No pending invites"
                    description="Team invitations sent to you will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="rounded-[1.35rem] border border-white/10 bg-black/25 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.16)]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-lg font-black text-white">
                              {invite.team.name}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              Invited by {invite.inviter.username}
                            </p>
                          </div>
                          <StatusPill value={invite.status} />
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleAcceptInvite(invite.id)}
                            disabled={loadingAction}
                            className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 disabled:opacity-50 disabled:hover:translate-y-0"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectInvite(invite.id)}
                            disabled={loadingAction}
                            className="rounded-2xl bg-red-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-red-200 disabled:opacity-50 disabled:hover:translate-y-0"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PanelShell>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_46%,#050816_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <TeamMark name={teamTitle} logoUrl={team?.logoUrl} />
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                  <Users className="size-4" aria-hidden="true" />
                  Team Dashboard
                </span>
                <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-5xl lg:text-6xl">
                  {teamTitle}
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  {teamDescriptionText}
                </p>
                <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                    <Shield className="size-4 text-emerald-200" />
                    {team ? (isCaptain ? "Captain access" : "Member access") : "No team yet"}
                  </span>
                  {team?.game && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                      <Swords className="size-4 text-cyan-200" />
                      {team.game}
                    </span>
                  )}
                  {team?.region && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                      <Medal className="size-4 text-amber-200" />
                      {team.region}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                    <MailPlus className="size-4 text-cyan-200" />
                    {invites.length} pending invite{invites.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                    <CalendarDays className="size-4 text-amber-200" />
                    {schedule.length} scheduled match{schedule.length === 1 ? "" : "es"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#09111f]/85 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Team command
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold text-slate-500">Members</p>
                <p className="mt-2 text-3xl font-black">
                  {team?.members.length ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold text-slate-500">Wins</p>
                <p className="mt-2 text-3xl font-black">{wins}</p>
              </div>
            </div>

            {team ? (
              <div className="mt-5 space-y-3">
                {isCaptain && (
                  <button
                    type="button"
                    onClick={() => setEditingTeam((value) => !value)}
                    disabled={loadingAction}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 text-sm font-black text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {editingTeam ? (
                      <X className="size-4" />
                    ) : (
                      <Pencil className="size-4" />
                    )}
                    {editingTeam ? "Cancel Edit" : "Edit Team"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLeaveTeam}
                  disabled={loadingAction}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-300/25 bg-red-300/10 px-5 text-sm font-black text-red-100 transition hover:-translate-y-0.5 hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <LogOut className="size-4" />
                  Leave Team
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100">
                Create a roster or accept an invite to unlock team stats,
                schedule and captain tools.
              </div>
            )}
          </section>
        </header>

        {teams.length > 0 && (
          <PanelShell
            icon={<Trophy className="size-6" />}
            title="My Teams"
            description="Choose which roster this dashboard should manage."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {teams.map((item) => {
                const isSelected = item.id === selectedTeamId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTeam(item.id)}
                    disabled={loadingAction}
                    className={[
                      "flex min-h-20 items-center gap-3 rounded-[1.35rem] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                      isSelected
                        ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-black/25 text-slate-300 hover:border-cyan-300/25 hover:bg-cyan-300/10",
                    ].join(" ")}
                  >
                    <TeamMark
                      name={item.name}
                      logoUrl={item.logoUrl}
                      size="md"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-black">
                        {item.name}
                      </span>
                      <span className="mt-1 block truncate text-sm text-slate-400">
                        {item.game ?? "No game"} - {item.region ?? "No region"}
                      </span>
                    </span>
                  </button>
                );
              })}

              <Link
                to="/team/create"
                className="flex min-h-20 items-center justify-center gap-2 rounded-[1.35rem] border border-cyan-300/25 bg-cyan-300/10 p-4 text-sm font-black text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/20"
              >
                <Users className="size-4" />
                Create Team
              </Link>
            </div>
          </PanelShell>
        )}

        {team && editingTeam && (
          <PanelShell
            icon={<Pencil className="size-6" />}
            title="Edit Team"
            description="Update team identity, public description and logo."
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
              <input
                value={editTeamName}
                onChange={(event) => setEditTeamName(event.target.value)}
                placeholder="Team name"
                className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
              />
              <input
                value={editTeamGame}
                onChange={(event) => setEditTeamGame(event.target.value)}
                placeholder="Game"
                className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
              />
              <input
                value={editTeamRegion}
                onChange={(event) => setEditTeamRegion(event.target.value)}
                placeholder="Region"
                className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
              />
              <input
                value={editTeamDescription}
                onChange={(event) => setEditTeamDescription(event.target.value)}
                placeholder="Description"
                className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setEditTeamLogoFile(event.target.files?.[0] ?? null)
                }
                className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:font-black file:text-slate-950"
              />
              <button
                type="button"
                onClick={handleUpdateTeam}
                disabled={loadingAction}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loadingAction ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save
              </button>
            </div>
          </PanelShell>
        )}

        {!team && (
          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <PanelShell
              icon={<Users className="size-6" />}
              title="New Team"
              description="Create a roster profile and start inviting players."
            >
              <div className="space-y-4">
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Team name"
                  className="w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={teamGame}
                    onChange={(event) => setTeamGame(event.target.value)}
                    placeholder="Game"
                    className="w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                  />
                  <input
                    value={teamRegion}
                    onChange={(event) => setTeamRegion(event.target.value)}
                    placeholder="Region"
                    className="w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                  />
                </div>
                <textarea
                  value={teamDescription}
                  onChange={(event) => setTeamDescription(event.target.value)}
                  placeholder="Description"
                  className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setTeamLogoFile(event.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:font-black file:text-slate-950"
                />
                {teamLogoFile && (
                  <p className="text-xs font-bold text-slate-500">
                    Selected logo: {teamLogoFile.name}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCreateTeam}
                  disabled={
                    loadingAction ||
                    !teamName.trim() ||
                    !teamGame.trim() ||
                    !teamRegion.trim()
                  }
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {loadingAction ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Users className="size-4" />
                  )}
                  Create Team
                </button>
              </div>
            </PanelShell>

            <PanelShell
              icon={<MailPlus className="size-6" />}
              title="Pending Invites"
              description="Accept or decline team invitations sent to your account."
            >
              {invites.length === 0 ? (
                <EmptyState
                  compact
                  icon={MailPlus}
                  title="No pending invites"
                  description="Team invitations sent to you will appear here."
                />
              ) : (
                <div className="space-y-4">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="rounded-[1.35rem] border border-white/10 bg-black/25 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.16)]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-black text-white">
                            {invite.team.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            Invited by {invite.inviter.username}
                          </p>
                        </div>
                        <StatusPill value={invite.status} />
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleAcceptInvite(invite.id)}
                          disabled={loadingAction}
                          className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectInvite(invite.id)}
                          disabled={loadingAction}
                          className="rounded-2xl bg-red-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-red-200 disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PanelShell>
          </section>
        )}

        {team && (
          <>
            <section className="grid gap-4 md:grid-cols-5">
              <MetricCard
                icon={<Medal className="size-5" />}
                label="Current Rank"
                value={ranking?.currentRank ? `#${ranking.currentRank}` : "--"}
                helper="active leaderboard"
                tone="amber"
              />
              <MetricCard
                icon={<Trophy className="size-5" />}
                label="Highest Rank"
                value={ranking?.highestRank ? `#${ranking.highestRank}` : "--"}
                helper="best placement"
                tone="cyan"
              />
              <MetricCard
                icon={<BarChart3 className="size-5" />}
                label="Win Rate"
                value={winRate !== undefined ? `${winRate}%` : "--"}
                helper={`${wins}W / ${losses}L`}
                tone="violet"
              />
              <MetricCard
                icon={<Swords className="size-5" />}
                label="Matches"
                value={matchesPlayed}
                helper="played total"
                tone="red"
              />
              <MetricCard
                icon={<Shield className="size-5" />}
                label="Titles"
                value={titles}
                helper="championships"
                tone="emerald"
              />
            </section>

            <PanelShell
              icon={<BarChart3 className="size-6" />}
              title="Tournament History"
              description="Ranking snapshots created from completed tournament matches."
            >
              {!ranking || ranking.tournamentHistory.length === 0 ? (
                <EmptyState
                  compact
                  icon={Trophy}
                  title="No ranking history"
                  description="Completed tournament matches will create ranking snapshots here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-separate border-spacing-y-3 text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-4">Tournament</th>
                        <th className="px-4">Status</th>
                        <th className="px-4">Rank</th>
                        <th className="px-4">Played</th>
                        <th className="px-4">Wins</th>
                        <th className="px-4">Losses</th>
                        <th className="px-4">Points</th>
                        <th className="px-4">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.tournamentHistory.map((item) => (
                        <tr key={item.tournamentId} className="bg-black/25">
                          <td className="rounded-l-2xl border-y border-l border-white/10 px-4 py-4">
                            <p className="font-black text-white">
                              {item.tournamentName}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {item.game}
                            </p>
                          </td>
                          <td className="border-y border-white/10 px-4 py-4">
                            <StatusPill value={item.status} />
                          </td>
                          <td className="border-y border-white/10 px-4 py-4">
                            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 font-black text-amber-100">
                              #{item.rank}
                            </span>
                          </td>
                          <td className="border-y border-white/10 px-4 py-4 font-bold">
                            {item.matchesPlayed}
                          </td>
                          <td className="border-y border-white/10 px-4 py-4 font-bold text-emerald-300">
                            {item.wins}
                          </td>
                          <td className="border-y border-white/10 px-4 py-4 font-bold text-red-300">
                            {item.losses}
                          </td>
                          <td className="border-y border-white/10 px-4 py-4 text-xl font-black text-cyan-300">
                            {item.points}
                          </td>
                          <td className="rounded-r-2xl border-y border-r border-white/10 px-4 py-4 font-bold">
                            {item.winRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelShell>

            <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
              <PanelShell
                icon={<Users className="size-6" />}
                title="Roster"
                description="Members, captain status and roster controls."
              >
                <div className="space-y-4">
                  {team.members.length === 0 ? (
                    <EmptyState
                      compact
                      icon={Users}
                      title="No members yet"
                      description="Invite players to build your roster."
                    />
                  ) : (
                    team.members.map((member) => {
                      const isMemberCaptain =
                        member.user.id === team.captain.id;

                      return (
                        <div
                          key={member.id}
                          className="flex flex-col gap-4 rounded-[1.35rem] border border-white/10 bg-black/25 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.16)] sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <TeamMark name={member.user.username} size="md" />
                            <div className="min-w-0">
                              <p className="truncate font-black text-white">
                                {member.user.username}
                              </p>
                              <p className="truncate text-sm text-slate-400">
                                {member.user.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {isMemberCaptain && (
                              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-100">
                                Leader
                              </span>
                            )}
                            {isCaptain && !isMemberCaptain && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                disabled={loadingAction}
                                className="inline-flex items-center gap-2 rounded-2xl border border-red-300/25 bg-red-300/10 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-red-300/20 disabled:opacity-50"
                              >
                                <Trash2 className="size-4" />
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </PanelShell>

              <PanelShell
                icon={<CalendarDays className="size-6" />}
                title="Team Operations"
                description="Invite players and jump into upcoming match rooms."
              >
                <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <MailPlus className="size-5 text-cyan-200" />
                    <h3 className="text-lg font-black">Invite Player</h3>
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="Email or username"
                      disabled={!isCaptain}
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleInviteMember}
                      disabled={loadingAction || !isCaptain}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {loadingAction ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MailPlus className="size-4" />
                      )}
                      Invite
                    </button>
                  </div>
                  {!isCaptain && (
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      Only the captain can invite new players.
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  {schedule.length === 0 ? (
                    <EmptyState
                      compact
                      icon={CalendarDays}
                      title="No scheduled matches"
                      description="Matches will appear after this team joins a generated bracket."
                    />
                  ) : (
                    <div className="space-y-3">
                      {schedule.map((match) => (
                        <div
                          key={match.id}
                          className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.16)]"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                                {match.tournament.name}
                              </p>
                              <p className="mt-2 text-lg font-black text-white">
                                vs {match.opponent?.name ?? "TBD"}
                              </p>
                              <p className="mt-1 text-sm text-slate-400">
                                Round {match.roundNumber}, Match{" "}
                                {match.matchNumber}
                              </p>
                            </div>
                            <StatusPill value={match.status} />
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                              <p className="text-xs font-bold text-slate-500">
                                Time
                              </p>
                              <p className="mt-1 font-bold text-white">
                                {formatDateTime(match.scheduledAt)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                              <p className="text-xs font-bold text-slate-500">
                                Room Code
                              </p>
                              <p className="mt-1 font-bold text-white">
                                {match.roomCode ?? "TBA"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <Link
                              to={`/matches/${match.id}`}
                              className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
                            >
                              Match Room
                            </Link>
                            {["LIVE", "IN_PROGRESS"].includes(match.status) &&
                              match.livestreamUrl && (
                                <a
                                  href={match.livestreamUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-2xl bg-red-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-red-200"
                                >
                                  Watch Live
                                </a>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PanelShell>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
