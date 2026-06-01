import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  acceptTeamInvite,
  createTeam,
  getMyTeam,
  getMyTeamInvites,
  getMyTeamRankingHistory,
  getMyTeamSchedule,
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
import { EmptyState, LoadingState, useConfirm, useToast } from "@/components/ui";

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

export function TeamDashboardPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [team, setTeam] = useState<Team | null>(null);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [ranking, setRanking] = useState<TeamRankingHistory | null>(null);
  const [schedule, setSchedule] = useState<TeamScheduleMatch[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [editTeamLogoFile, setEditTeamLogoFile] = useState<File | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  async function loadTeamData() {
    const [meRes, teamRes, invitesRes, rankingRes, scheduleRes] = await Promise.all([
      getMe(),
      getMyTeam(),
      getMyTeamInvites(),
      getMyTeamRankingHistory(),
      getMyTeamSchedule(),
    ]);

    setCurrentUserId(meRes.data.sub);
    setTeam(teamRes.data);
    setInvites(invitesRes.data);
    setRanking(rankingRes.data);
    setSchedule(scheduleRes.data);

    if (teamRes.data) {
      setEditTeamName(teamRes.data.name);
      setEditTeamDescription(teamRes.data.description ?? "");
      setEditTeamLogoFile(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchTeam() {
      try {
        await loadTeamData();
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, "Failed to load team dashboard."));
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
  }, [toast]);

  async function handleCreateTeam() {
    try {
      setLoadingAction(true);
      const logoUrl = teamLogoFile
        ? (await uploadFile(teamLogoFile)).data.url
        : undefined;

      const res = await createTeam({
        name: teamName,
        description: teamDescription || undefined,
        logoUrl,
      });

      toast.success(res.message);
      setTeamName("");
      setTeamDescription("");
      setTeamLogoFile(null);
      await loadTeamData();
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
      toast.warning("Player email is required.");
      return;
    }

    try {
      setLoadingAction(true);

      const res = await inviteTeamMember(team.id, { email: inviteEmail.trim() });

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
        description: editTeamDescription.trim() || undefined,
        ...(logoUrl ? { logoUrl } : {}),
      });

      toast.success(res.message);
      setTeam(res.data);
      setEditingTeam(false);
      await loadTeamData();
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
      await loadTeamData();
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

      const res = await leaveTeam();

      toast.success(res.message);
      setEditingTeam(false);
      await loadTeamData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Leave team failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleAcceptInvite(inviteId: string) {
    try {
      setLoadingAction(true);

      const res = await acceptTeamInvite(inviteId);

      toast.success(res.message);
      await loadTeamData();
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
      await loadTeamData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Reject invite failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1020] px-6 py-16 text-white">
        <LoadingState
          title="Loading team..."
          description="Syncing roster, invitations and player details."
        />
      </div>
    );
  }

  const isCaptain = Boolean(team && team.captain.id === currentUserId);

  return (
    <div className="min-h-screen bg-[#0B1020] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            {team?.logoUrl && (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="mb-5 size-20 rounded-3xl object-cover"
              />
            )}
            <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
              TEAM DASHBOARD
            </p>
            <h1 className="mt-4 text-5xl font-black">
              {team?.name ?? "Create Your Team"}
            </h1>
            <p className="mt-4 text-white/60">
              {team?.description ??
                "Create a team, accept invites and invite players using the backend team APIs."}
            </p>
          </div>

          {team && (
            <div className="flex flex-wrap gap-3">
              {isCaptain && (
                <button
                  type="button"
                  onClick={() => setEditingTeam((value) => !value)}
                  disabled={loadingAction}
                  className="flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50"
                >
                  {editingTeam ? <X size={18} /> : <Pencil size={18} />}
                  {editingTeam ? "Cancel Edit" : "Edit Team"}
                </button>
              )}

              <button
                type="button"
                onClick={handleLeaveTeam}
                disabled={loadingAction}
                className="flex items-center gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-3 font-bold text-red-200 hover:bg-red-400/20 disabled:opacity-50"
              >
                <LogOut size={18} />
                Leave Team
              </button>
            </div>
          )}
        </div>

        {team && editingTeam && (
          <section className="mb-8 rounded-[2rem] border border-cyan-400/20 bg-cyan-400/10 p-6">
            <div className="mb-5 flex items-center gap-3">
              <Pencil className="text-cyan-300" />
              <h2 className="text-2xl font-black">Edit Team</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr_auto]">
              <input
                value={editTeamName}
                onChange={(event) => setEditTeamName(event.target.value)}
                placeholder="Team name"
                className="rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 outline-none"
              />

              <input
                value={editTeamDescription}
                onChange={(event) =>
                  setEditTeamDescription(event.target.value)
                }
                placeholder="Description"
                className="rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 outline-none"
              />

              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setEditTeamLogoFile(event.target.files?.[0] ?? null)
                }
                className="rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-black file:text-black"
              />

              <button
                type="button"
                onClick={handleUpdateTeam}
                disabled={loadingAction}
                className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-black hover:bg-cyan-300 disabled:opacity-50"
              >
                {loadingAction ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Save
              </button>
            </div>
          </section>
        )}

        {!team && (
          <section className="mb-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="mb-6 text-2xl font-black">New Team</h2>

              <div className="space-y-4">
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Team name"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />

                <textarea
                  value={teamDescription}
                  onChange={(event) => setTeamDescription(event.target.value)}
                  placeholder="Description"
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setTeamLogoFile(event.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-black file:text-black"
                />

                <button
                  onClick={handleCreateTeam}
                  disabled={loadingAction}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-50"
                >
                  {loadingAction && <Loader2 size={18} className="animate-spin" />}
                  Create Team
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="mb-6 text-2xl font-black">Pending Invites</h2>

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
                    <div key={invite.id} className="rounded-3xl bg-black/30 p-5">
                      <p className="font-black">{invite.team.name}</p>
                      <p className="mt-1 text-sm text-white/50">
                        Invited by {invite.inviter.username}
                      </p>
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => handleAcceptInvite(invite.id)}
                          disabled={loadingAction}
                          className="rounded-2xl bg-green-400 px-4 py-2 text-sm font-black text-black hover:bg-green-300 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectInvite(invite.id)}
                          disabled={loadingAction}
                          className="rounded-2xl bg-red-400 px-4 py-2 text-sm font-black text-black hover:bg-red-300 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {team && (
          <>
            <section className="grid gap-6 md:grid-cols-5">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <Medal className="mb-4 text-amber-300" />
                <p className="text-sm text-white/50">Current Rank</p>
                <p className="mt-2 text-3xl font-black">
                  {ranking?.currentRank ? `#${ranking.currentRank}` : "--"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <Trophy className="mb-4 text-yellow-300" />
                <p className="text-sm text-white/50">Highest Rank</p>
                <p className="mt-2 text-3xl font-black">
                  {ranking?.highestRank ? `#${ranking.highestRank}` : "--"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <BarChart3 className="mb-4 text-violet-400" />
                <p className="text-sm text-white/50">Win Rate</p>
                <p className="mt-2 text-3xl font-black">
                  {ranking?.overall
                    ? `${ranking.overall.winRate}%`
                    : ranking
                      ? `${ranking.winRate}%`
                      : team.overallWinRate !== undefined
                        ? `${team.overallWinRate}%`
                        : "--"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <Swords className="mb-4 text-cyan-400" />
                <p className="text-sm text-white/50">Matches</p>
                <p className="mt-2 text-3xl font-black">
                  {ranking?.overall?.matchesPlayed ??
                    ranking?.matchesPlayed ??
                    team.totalMatchesPlayed ??
                    0}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <Shield className="mb-4 text-emerald-300" />
                <p className="text-sm text-white/50">Titles</p>
                <p className="mt-2 text-3xl font-black">
                  {ranking?.overall?.championCount ?? team.championCount ?? 0}
                </p>
              </div>
            </section>

            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-6 flex items-center gap-3">
                <BarChart3 className="text-amber-300" />
                <h2 className="text-2xl font-black">Tournament History</h2>
              </div>

              {!ranking || ranking.tournamentHistory.length === 0 ? (
                <EmptyState
                  compact
                  icon={Trophy}
                  title="No ranking history"
                  description="Completed tournament matches will create ranking snapshots here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] border-separate border-spacing-y-3 text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.2em] text-white/40">
                        <th className="px-4">Tournament</th>
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
                        <tr key={item.tournamentId} className="bg-black/30">
                          <td className="rounded-l-2xl px-4 py-4">
                            <p className="font-black">{item.tournamentName}</p>
                            <p className="mt-1 text-xs text-white/40">
                              {item.game} - {item.status}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-amber-300/15 px-3 py-1 font-black text-amber-200">
                              #{item.rank}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-bold">
                            {item.matchesPlayed}
                          </td>
                          <td className="px-4 py-4 font-bold text-emerald-300">
                            {item.wins}
                          </td>
                          <td className="px-4 py-4 font-bold text-red-300">
                            {item.losses}
                          </td>
                          <td className="px-4 py-4 text-xl font-black text-cyan-300">
                            {item.points}
                          </td>
                          <td className="rounded-r-2xl px-4 py-4 font-bold">
                            {item.winRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <h2 className="mb-6 text-2xl font-black">Roster</h2>

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
                      const isMemberCaptain = member.user.id === team.captain.id;

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-3xl bg-black/30 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                              <Shield />
                            </div>

                            <div>
                              <p className="font-black">
                                {member.user.username}
                              </p>
                              <p className="text-sm text-white/50">
                                {member.user.email}
                              </p>
                            </div>
                          </div>

                          {isMemberCaptain && (
                            <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-black">
                              LEADER
                            </span>
                          )}

                          {isCaptain && !isMemberCaptain && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member)}
                              disabled={loadingAction}
                              className="flex items-center gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-black text-red-200 hover:bg-red-400/20 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <h2 className="mb-6 text-2xl font-black">Invite Player</h2>

                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="player@example.com"
                    disabled={!isCaptain}
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                  />

                  <button
                    onClick={handleInviteMember}
                    disabled={loadingAction || !isCaptain}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {loadingAction ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <MailPlus size={18} />
                    )}
                    Invite
                  </button>
                </div>

                <div className="mt-8">
                  <div className="mb-4 flex items-center gap-3">
                    <CalendarDays className="text-amber-300" />
                    <h3 className="text-xl font-black">Match Schedule</h3>
                  </div>

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
                          className="rounded-3xl border border-white/10 bg-black/30 p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                                {match.tournament.name}
                              </p>
                              <p className="mt-2 font-black">
                                vs {match.opponent?.name ?? "TBD"}
                              </p>
                              <p className="mt-1 text-sm text-white/50">
                                Round {match.roundNumber}, Match{" "}
                                {match.matchNumber}
                              </p>
                            </div>

                            <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70">
                              {match.status}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl bg-white/5 p-3">
                              <p className="text-xs text-white/40">Time</p>
                              <p className="mt-1 font-bold">
                                {match.scheduledAt
                                  ? new Date(match.scheduledAt).toLocaleString()
                                  : "TBA"}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-3">
                              <p className="text-xs text-white/40">Room Code</p>
                              <p className="mt-1 font-bold">
                                {match.roomCode ?? "TBA"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <Link
                              to={`/matches/${match.id}`}
                              className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-black text-black hover:bg-cyan-300"
                            >
                              Match Room
                            </Link>
                            {match.status === "IN_PROGRESS" &&
                              match.livestreamUrl && (
                              <a
                                href={match.livestreamUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-2xl bg-red-400 px-4 py-2 text-sm font-black text-black hover:bg-red-300"
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
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
