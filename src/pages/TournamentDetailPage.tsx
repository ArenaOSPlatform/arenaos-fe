import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Gamepad2,
  Loader2,
  Medal,
  Megaphone,
  Radio,
  Shield,
  Trophy,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  getTournamentBracket,
  getTournamentAnnouncements,
  getTournamentById,
  getTournamentLeaderboard,
  registerTeamToTournament,
  type TournamentAnnouncement,
  type TournamentLeaderboardRow,
} from "@/services/tournament.service";
import { getMyTeam } from "@/services/team.service";
import { EmptyState, LoadingState, useConfirm, useToast } from "@/components/ui";

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    const message = response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.join(", ");
    }
  }

  return fallback;
}

type Tournament = {
  id: string;
  name: string;
  game: string;
  description: string | null;
  bannerUrl: string | null;
  maxTeams: number;
  teamSize: number;
  format: string;
  prizePool: string | null;
  rules: string | null;
  status: string;
  startDate: string;
  championTeamId: string | null;
  runnerUpTeamId: string | null;
  completedAt: string | null;
  _count?: {
    registrations: number;
    matches: number;
  };
};

type Match = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: string;
  scheduledAt: string | null;
  roomCode: string | null;
  livestreamUrl: string | null;
};

type Bracket = {
  id: string;
  matches: Match[];
};

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
  captain: {
    id: string;
    username: string;
    email: string;
  };
  members: TeamMember[];
};

type TournamentDetailTab = "BRACKET" | "LEADERBOARD";

function getAnnouncementTone(type: TournamentAnnouncement["type"]) {
  if (type === "URGENT") {
    return {
      wrapper: "border-red-400/30 bg-red-400/10",
      label: "bg-red-400 text-black",
      icon: "text-red-300",
    };
  }

  if (type === "WARNING") {
    return {
      wrapper: "border-amber-300/30 bg-amber-300/10",
      label: "bg-amber-300 text-black",
      icon: "text-amber-200",
    };
  }

  return {
    wrapper: "border-cyan-400/25 bg-cyan-400/10",
    label: "bg-cyan-400 text-black",
    icon: "text-cyan-300",
  };
}

export function TournamentDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardRow[]>([]);
  const [announcements, setAnnouncements] = useState<TournamentAnnouncement[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<TournamentDetailTab>("BRACKET");
  const [pageError, setPageError] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [lineupLoading, setLineupLoading] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [mainPlayerIds, setMainPlayerIds] = useState<string[]>([]);
  const [substituteIds, setSubstituteIds] = useState<string[]>([]);
  const requiredLineupSize = tournament?.teamSize ?? 0;

  async function fetchData(tournamentId: string) {
    const tournamentRes = await getTournamentById(tournamentId);
    setTournament(tournamentRes.data);

    try {
      const bracketRes = await getTournamentBracket(tournamentId);
      setBracket(bracketRes.data);
    } catch {
      setBracket(null);
    }

    try {
      const leaderboardRes = await getTournamentLeaderboard(tournamentId);
      setLeaderboard(leaderboardRes.data);
    } catch {
      setLeaderboard([]);
    }

    try {
      const announcementRes = await getTournamentAnnouncements(tournamentId);
      setAnnouncements(announcementRes.data);
    } catch {
      setAnnouncements([]);
    }
  }

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchData(id)
        .then(() => {
          if (!cancelled) setPageError("");
        })
        .catch((err) => {
          if (cancelled) return;

          const message = getApiErrorMessage(err, "Failed to load tournament.");
          setPageError(message);
          toast.error(message);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id, toast]);

  async function handleOpenRegisterModal() {
    if (!id) return;

    if (tournament?.status !== "OPEN_REGISTRATION") {
      toast.warning("Registration is not open for this tournament.");
      return;
    }

    setRegisterModalOpen(true);

    if (team) return;

    try {
      setLineupLoading(true);
      const res = await getMyTeam();
      setTeam(res.data);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Load team failed. Login as a team captain before registering.",
        ),
      );
    } finally {
      setLineupLoading(false);
    }
  }

  function toggleMainPlayer(playerId: string) {
    setMainPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }

      if (prev.length >= requiredLineupSize) {
        toast.warning(`Main lineup needs exactly ${requiredLineupSize} players.`);
        return prev;
      }

      setSubstituteIds((subs) => subs.filter((id) => id !== playerId));
      return [...prev, playerId];
    });
  }

  function toggleSubstitute(playerId: string) {
    if (mainPlayerIds.includes(playerId)) {
      toast.warning("A main player cannot also be a substitute.");
      return;
    }

    setSubstituteIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId],
    );
  }

  async function handleRegisterTeam() {
    if (!id) return;

    if (tournament?.status !== "OPEN_REGISTRATION") {
      toast.warning("Registration is not open for this tournament.");
      return;
    }

    if (mainPlayerIds.length !== requiredLineupSize) {
      toast.warning(`Choose exactly ${requiredLineupSize} main players.`);
      return;
    }

    const confirmed = await confirm({
      title: "Register your team?",
      description: `Submit ${team?.name ?? "your team"} with ${mainPlayerIds.length} main players and ${substituteIds.length} substitutes.`,
      confirmText: "Register",
      tone: "info",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("register");

      const res = await registerTeamToTournament(id, {
        mainPlayerIds,
        substituteIds,
      });
      toast.success(res.message);
      setRegisterModalOpen(false);
    } catch {
      toast.error(
        "Register team failed. Make sure registration is open and you are a captain.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0B1020] px-6 py-16 text-white">
        {pageError ? (
          <EmptyState
            title="Tournament unavailable"
            description={pageError}
            icon={Trophy}
          />
        ) : (
          <LoadingState
            title="Loading tournament..."
            description="Fetching tournament details, rules and bracket data."
          />
        )}
      </div>
    );
  }

  const canRegister = tournament.status === "OPEN_REGISTRATION";
  const totalTeams = leaderboard.length || tournament._count?.registrations || 0;
  const totalMatches = bracket?.matches.length ?? tournament._count?.matches ?? 0;
  const completedMatches =
    bracket?.matches.filter((match) => match.status === "COMPLETED").length ??
    0;
  const teamNameById = new Map(
    leaderboard.map((row) => [row.teamId, row.teamName]),
  );
  const getTeamLabel = (teamId: string | null) =>
    teamId ? teamNameById.get(teamId) ?? teamId : "TBD";
  const registerButtonLabel =
    tournament.status === "COMPLETED"
      ? "Tournament Archived"
      : canRegister
        ? "Register Team"
        : "Registration Closed";

  return (
    <div className="min-h-screen bg-[#0B1020] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
          {tournament.bannerUrl && (
            <img
              src={tournament.bannerUrl}
              alt={tournament.name}
              className="mb-8 h-64 w-full rounded-3xl object-cover"
            />
          )}

          <div className="mb-8 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cyan-400 px-4 py-1 text-xs font-black text-black">
              {tournament.status}
            </span>

            <span className="rounded-full border border-white/10 px-4 py-1 text-xs font-bold text-white/60">
              {tournament.format}
            </span>
          </div>

          <h1 className="text-5xl font-black md:text-7xl">{tournament.name}</h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/60">
            {tournament.description ?? "No description available."}
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-black/30 p-5">
              <Gamepad2 className="mb-3 text-cyan-400" />
              <p className="text-sm text-white/50">Game</p>
              <p className="font-black">{tournament.game}</p>
            </div>

            <div className="rounded-3xl bg-black/30 p-5">
              <Users className="mb-3 text-violet-400" />
              <p className="text-sm text-white/50">Max Teams</p>
              <p className="font-black">{tournament.maxTeams}</p>
            </div>

            <div className="rounded-3xl bg-black/30 p-5">
              <Trophy className="mb-3 text-yellow-300" />
              <p className="text-sm text-white/50">Prize Pool</p>
              <p className="font-black">{tournament.prizePool ?? "TBA"}</p>
            </div>

            <div className="rounded-3xl bg-black/30 p-5">
              <CalendarDays className="mb-3 text-rose-400" />
              <p className="text-sm text-white/50">Start Date</p>
              <p className="font-black">
                {new Date(tournament.startDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </section>

        {tournament.status === "COMPLETED" && (
          <section className="mt-8 rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-6">
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black tracking-[0.25em] text-amber-200">
                  TOURNAMENT RESULT
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  Final Standings
                </h2>
              </div>

              {tournament.completedAt && (
                <p className="text-sm font-bold text-white/55">
                  Completed {new Date(tournament.completedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-yellow-300/25 bg-black/30 p-5">
                <Trophy className="mb-3 text-yellow-300" />
                <p className="text-sm text-white/50">Champion</p>
                <p className="mt-2 font-black">
                  {getTeamLabel(tournament.championTeamId)}
                </p>
              </div>

              <div className="rounded-3xl border border-cyan-300/20 bg-black/30 p-5">
                <Medal className="mb-3 text-cyan-300" />
                <p className="text-sm text-white/50">Runner-up</p>
                <p className="mt-2 font-black">
                  {getTeamLabel(tournament.runnerUpTeamId)}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <Users className="mb-3 text-violet-300" />
                <p className="text-sm text-white/50">Total Teams</p>
                <p className="mt-2 text-2xl font-black">{totalTeams}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <Radio className="mb-3 text-rose-300" />
                <p className="text-sm text-white/50">Matches</p>
                <p className="mt-2 text-2xl font-black">
                  {completedMatches}/{totalMatches}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-6 flex items-center gap-3">
            <Megaphone className="text-cyan-300" />
            <h2 className="text-2xl font-black">Announcements</h2>
          </div>

          {announcements.length === 0 ? (
            <EmptyState
              compact
              icon={Megaphone}
              title="No announcements"
              description="Organizer updates for this tournament will appear here."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {announcements.map((announcement) => {
                const tone = getAnnouncementTone(announcement.type);
                const Icon =
                  announcement.type === "URGENT" ? AlertTriangle : Megaphone;

                return (
                  <article
                    key={announcement.id}
                    className={`rounded-3xl border p-5 ${tone.wrapper}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <Icon className={`mt-1 shrink-0 ${tone.icon}`} />
                        <div>
                          <p className="font-black">{announcement.title}</p>
                          <p className="mt-1 text-sm text-white/45">
                            {new Date(announcement.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-black ${tone.label}`}
                      >
                        {announcement.type}
                      </span>
                    </div>

                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-white/70">
                      {announcement.content}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                {activeTab === "BRACKET" ? (
                  <Radio className="text-cyan-400" />
                ) : (
                  <BarChart3 className="text-amber-300" />
                )}
                <h2 className="text-2xl font-black">
                  {activeTab === "BRACKET" ? "Live Bracket" : "Leaderboard"}
                </h2>
              </div>

              <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-black/30 p-1 text-sm font-black">
                <button
                  type="button"
                  onClick={() => setActiveTab("BRACKET")}
                  className={`rounded-xl px-4 py-2 ${
                    activeTab === "BRACKET"
                      ? "bg-cyan-400 text-black"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  Bracket
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("LEADERBOARD")}
                  className={`rounded-xl px-4 py-2 ${
                    activeTab === "LEADERBOARD"
                      ? "bg-amber-300 text-black"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  Leaderboard
                </button>
              </div>
            </div>

            {activeTab === "BRACKET" && !bracket ? (
              <EmptyState
                compact
                icon={Radio}
                title="Bracket not generated"
                description="Once the organizer generates matches, the live bracket will appear here."
              />
            ) : activeTab === "BRACKET" ? (
              <div className="grid gap-5 md:grid-cols-3">
                {(bracket?.matches ?? []).map((match) => (
                  <div
                    key={match.id}
                    className="rounded-3xl border border-white/10 bg-black/30 p-5"
                  >
                    <p className="mb-4 text-xs font-bold text-white/40">
                      ROUND {match.roundNumber} • MATCH {match.matchNumber}
                    </p>

                    <div className="rounded-2xl border border-cyan-400/40 bg-cyan-400/10 p-4">
                      <p className="font-bold">{match.teamAId ?? "TBD"}</p>
                    </div>

                    <p className="my-3 text-center text-xs font-black text-white/40">
                      VS
                    </p>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="font-bold">{match.teamBId ?? "TBD"}</p>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white/5 p-3 text-center">
                      <p className="font-black text-cyan-300">
                        {match.status === "COMPLETED"
                          ? `${match.scoreA} - ${match.scoreB}`
                          : match.status}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                      <p className="text-white/55">
                        Time:{" "}
                        <span className="font-bold text-white">
                          {match.scheduledAt
                            ? new Date(match.scheduledAt).toLocaleString()
                            : "TBA"}
                        </span>
                      </p>
                      <p className="text-white/55">
                        Room:{" "}
                        <span className="font-bold text-white">
                          {match.roomCode ?? "TBA"}
                        </span>
                      </p>
                      {match.status === "IN_PROGRESS" &&
                      match.livestreamUrl ? (
                        <a
                          href={match.livestreamUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-red-400 px-4 py-2 font-black text-black hover:bg-red-300"
                        >
                          <Video size={16} />
                          Watch Live
                        </a>
                      ) : match.livestreamUrl ? (
                        <p className="text-white/55">
                          Stream:{" "}
                          <span className="font-bold text-white">
                            Ready when match starts
                          </span>
                        </p>
                      ) : (
                        <p className="text-white/55">
                          Stream:{" "}
                          <span className="font-bold text-white">TBA</span>
                        </p>
                      )}
                    </div>

                    <Link
                      to={`/matches/${match.id}`}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-black hover:bg-cyan-300"
                    >
                      <Radio size={16} />
                      Open Match Room
                    </Link>
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <EmptyState
                compact
                icon={BarChart3}
                title="No leaderboard yet"
                description="Approved teams will appear here after the leaderboard is calculated."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-3 text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.2em] text-white/40">
                      <th className="px-4">Rank</th>
                      <th className="px-4">Team</th>
                      <th className="px-4">Played</th>
                      <th className="px-4">Wins</th>
                      <th className="px-4">Losses</th>
                      <th className="px-4">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row) => (
                      <tr key={row.teamId} className="bg-black/30">
                        <td className="rounded-l-2xl px-4 py-4">
                          <span className="inline-flex items-center gap-2 rounded-full bg-amber-300/15 px-3 py-1 font-black text-amber-200">
                            <Medal size={16} /> #{row.rank}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-black">{row.teamName}</p>
                          <p className="mt-1 text-xs text-white/40">
                            Highest #{row.highestRank} - {row.winRate}% win rate
                          </p>
                        </td>
                        <td className="px-4 py-4 font-bold">
                          {row.matchesPlayed}
                        </td>
                        <td className="px-4 py-4 font-bold text-emerald-300">
                          {row.wins}
                        </td>
                        <td className="px-4 py-4 font-bold text-red-300">
                          {row.losses}
                        </td>
                        <td className="rounded-r-2xl px-4 py-4 text-xl font-black text-cyan-300">
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="rounded-[2rem] border border-cyan-400/20 bg-cyan-400/10 p-6 backdrop-blur-xl">
            <Shield className="mb-5 text-cyan-300" />
            <h2 className="text-2xl font-black">Tournament Rules</h2>

            <p className="mt-6 text-white/65">
              {tournament.rules ?? "No rules provided."}
            </p>

            <button
              onClick={handleOpenRegisterModal}
              disabled={loadingAction === "register" || !canRegister}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-50"
            >
              {loadingAction === "register" && (
                <Loader2 size={18} className="animate-spin" />
              )}
              {registerButtonLabel}
            </button>
          </aside>
        </section>
      </div>

      {registerModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close registration modal"
            onClick={() => setRegisterModalOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[#0f172a] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold tracking-[0.25em] text-cyan-400">
                  TEAM LINEUP
                </p>
                <h2 className="mt-2 text-3xl font-black">Register Team</h2>
                <p className="mt-2 text-sm text-white/55">
                  Choose exactly {tournament.teamSize} main players. Substitutes
                  are optional.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {lineupLoading ? (
              <LoadingState
                compact
                title="Loading team..."
                description="Fetching roster for lineup selection."
              />
            ) : !team ? (
              <EmptyState
                compact
                icon={Users}
                title="No team loaded"
                description="Login as a team captain to choose a lineup."
              />
            ) : (
              <>
                <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <p className="font-black text-cyan-100">{team.name}</p>
                  <p className="mt-1 text-sm text-white/55">
                    Captain: {team.captain.username}
                  </p>
                </div>

                <div className="space-y-3">
                  {team.members.map((member) => {
                    const playerId = member.user.id;
                    const isMain = mainPlayerIds.includes(playerId);
                    const isSub = substituteIds.includes(playerId);

                    return (
                      <div
                        key={member.id}
                        className="grid gap-3 rounded-2xl bg-black/30 p-4 md:grid-cols-[1fr_auto_auto]"
                      >
                        <div>
                          <p className="font-black">{member.user.username}</p>
                          <p className="text-sm text-white/50">
                            {member.user.email}
                          </p>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/10">
                          <input
                            type="checkbox"
                            checked={isMain}
                            onChange={() => toggleMainPlayer(playerId)}
                            className="size-4 accent-cyan-400"
                          />
                          Main
                        </label>

                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/10">
                          <input
                            type="checkbox"
                            checked={isSub}
                            disabled={isMain}
                            onChange={() => toggleSubstitute(playerId)}
                            className="size-4 accent-violet-400 disabled:opacity-40"
                          />
                          Substitute
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-white/60">
                    Main {mainPlayerIds.length}/{tournament.teamSize} · Substitute{" "}
                    {substituteIds.length}
                  </p>

                  <button
                    type="button"
                    onClick={handleRegisterTeam}
                    disabled={loadingAction === "register"}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-black hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {loadingAction === "register" && (
                      <Loader2 size={18} className="animate-spin" />
                    )}
                    Submit Lineup
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
