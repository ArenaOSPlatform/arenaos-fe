import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
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
  getTournamentRegistrations,
  registerTeamToTournament,
  type TournamentAnnouncement,
  type TournamentLeaderboardRow,
} from "@/services/tournament.service";
import { getMyTeams } from "@/services/team.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { BackButton } from "@/components/ui/BackButton";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";
import { connectSocket, socket } from "@/sockets/socket";
import { formatTournamentName } from "@/utils";
import { getAccessToken } from "@/utils/authStorage";

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
  region: string | null;
  livestreamUrl: string | null;
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
  livestreamUrl: string | null;
};

type Bracket = {
  id: string;
  status: string;
  format: string;
  generatedAt: string;
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
  game: string | null;
  region: string | null;
  captain: {
    id: string;
    username: string;
    email: string;
  };
  members: TeamMember[];
};

type TournamentRegistration = {
  id: string;
  teamId: string;
  status: string;
  rejectReason: string | null;
  lineupData: string | null;
  createdAt: string;
  updatedAt: string;
  team?: {
    id: string;
    name: string;
  };
};

type TournamentDetailTab = "BRACKET" | "LEADERBOARD";

function getAnnouncementTone(type: TournamentAnnouncement["type"]) {
  if (type === "URGENT") {
    return {
      wrapper: "border-red-300/20 bg-red-300/10",
      label: "border-red-300/20 bg-red-300/10 text-red-100",
      icon: "text-red-200",
    };
  }

  if (type === "WARNING") {
    return {
      wrapper: "border-amber-300/20 bg-amber-300/10",
      label: "border-amber-300/20 bg-amber-300/10 text-amber-100",
      icon: "text-amber-200",
    };
  }

  return {
    wrapper: "border-cyan-300/20 bg-cyan-300/10",
    label: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    icon: "text-cyan-200",
  };
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
      "APPROVED",
      "OPEN_REGISTRATION",
      "ONGOING",
      "LIVE",
      "IN_PROGRESS",
      "COMPLETED",
    ].includes(status)
  ) {
    return "emerald";
  }

  if (
    [
      "PENDING",
      "PENDING_APPROVAL",
      "PENDING_SCHEDULE",
      "SCHEDULED",
      "MATCH_SCHEDULED",
      "CHECK_IN_OPEN",
      "WAITING_CONFIRMATION",
    ].includes(status)
  ) {
    return "amber";
  }

  if (["REJECTED", "DISPUTED", "CANCELLED"].includes(status)) {
    return "red";
  }

  if (["BRACKET_GENERATED", "REGISTRATION_CLOSED", "LOCKED"].includes(status)) {
    return "violet";
  }

  return "cyan";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) return "TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

function getRegistrationButtonLabel(
  registration: TournamentRegistration | null,
  tournamentStatus: string,
  canRegister: boolean,
) {
  if (registration?.status === "PENDING") return "Lineup Pending";
  if (registration?.status === "APPROVED") return "Lineup Approved";
  if (registration?.status === "REJECTED") return "Lineup Rejected";
  if (tournamentStatus === "COMPLETED") return "Tournament Archived";

  return canRegister ? "Register Team" : "Registration Closed";
}

function getRegistrationStatusMessage(status: string) {
  if (status === "PENDING") return "Waiting for organizer review.";
  if (status === "APPROVED") {
    return "Your team has been approved for this tournament.";
  }
  if (status === "REJECTED") return "Organizer rejected this lineup.";

  return "Registration status updated.";
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
          <p className="mt-3 text-3xl font-black leading-none text-white">
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

export function TournamentDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const toast = useToast();
  const confirm = useConfirm();
  const routeDefaultTab: TournamentDetailTab =
    location.pathname.endsWith("/leaderboard") ||
    location.pathname.startsWith("/leaderboards/")
    ? "LEADERBOARD"
    : "BRACKET";

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardRow[]>(
    [],
  );
  const [announcements, setAnnouncements] = useState<TournamentAnnouncement[]>(
    [],
  );
  const [tabOverride, setTabOverride] = useState<{
    pathname: string;
    tab: TournamentDetailTab;
  } | null>(null);
  const activeTab =
    tabOverride?.pathname === location.pathname
      ? tabOverride.tab
      : routeDefaultTab;
  const [pageError, setPageError] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [lineupLoading, setLineupLoading] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myRegistration, setMyRegistration] =
    useState<TournamentRegistration | null>(null);
  const [registrationStatusLoading, setRegistrationStatusLoading] =
    useState(false);
  const [mainPlayerIds, setMainPlayerIds] = useState<string[]>([]);
  const [substituteIds, setSubstituteIds] = useState<string[]>([]);
  const requiredLineupSize = tournament?.teamSize ?? 0;

  const loadMyRegistration = useCallback(async (
    tournamentId: string,
    currentTournament: Tournament,
  ) => {
    if (!getAccessToken()) {
      setTeams([]);
      setTeam(null);
      setMyRegistration(null);
      return;
    }

    try {
      setRegistrationStatusLoading(true);

      const [teamsRes, registrationsRes] = await Promise.all([
        getMyTeams(),
        getTournamentRegistrations(tournamentId),
      ]);
      const userTeams = (teamsRes.data ?? []) as Team[];

      const registrations = (registrationsRes.data ??
        []) as TournamentRegistration[];
      const registration = registrations.find((item) =>
        userTeams.some(
          (userTeam) =>
            item.teamId === userTeam.id || item.team?.id === userTeam.id,
        ),
      );
      const registeredTeam = registration
        ? userTeams.find(
            (userTeam) =>
              registration.teamId === userTeam.id ||
              registration.team?.id === userTeam.id,
          )
        : null;
      const matchingGameTeam = userTeams.find(
        (userTeam) =>
          userTeam.game?.trim().toLowerCase() ===
          currentTournament.game.trim().toLowerCase(),
      );
      const currentTeam =
        registeredTeam ?? matchingGameTeam ?? userTeams[0] ?? null;

      setTeams(userTeams);
      setTeam(currentTeam);
      setMyRegistration(registration || null);
    } catch {
      setTeams([]);
      setTeam(null);
      setMyRegistration(null);
    } finally {
      setRegistrationStatusLoading(false);
    }
  }, []);

  const fetchData = useCallback(
    async (tournamentId: string) => {
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

      void loadMyRegistration(tournamentId, tournamentRes.data);
    },
    [loadMyRegistration],
  );

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
  }, [fetchData, id, toast]);

  useEffect(() => {
    if (!id) return;

    if (!connectSocket()) return;

    socket.emit("join:tournament", id);

    const refreshTournament = () => {
      void fetchData(id);
    };

    socket.on("tournament:status_changed", refreshTournament);
    socket.on("registration:updated", refreshTournament);
    socket.on("bracket:generated", refreshTournament);
    socket.on("bracket:updated", refreshTournament);
    socket.on("leaderboard:updated", refreshTournament);

    return () => {
      socket.off("tournament:status_changed", refreshTournament);
      socket.off("registration:updated", refreshTournament);
      socket.off("bracket:generated", refreshTournament);
      socket.off("bracket:updated", refreshTournament);
      socket.off("leaderboard:updated", refreshTournament);
    };
  }, [fetchData, id]);

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
      const res = await getMyTeams();
      const userTeams = (res.data ?? []) as Team[];
      const currentTeam =
        userTeams.find(
          (userTeam) =>
            userTeam.game?.trim().toLowerCase() ===
            tournament?.game.trim().toLowerCase(),
        ) ??
        userTeams[0] ??
        null;

      setTeams(userTeams);
      setTeam(currentTeam);
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

  function handleSelectRegistrationTeam(nextTeam: Team) {
    if (nextTeam.id === team?.id) return;

    setTeam(nextTeam);
    setMainPlayerIds([]);
    setSubstituteIds([]);
  }

  function toggleMainPlayer(playerId: string) {
    setMainPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }

      if (prev.length >= requiredLineupSize) {
        toast.warning(
          `Main lineup needs exactly ${requiredLineupSize} players.`,
        );
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

    if (!team) {
      toast.warning("Choose a team before registering.");
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
        teamId: team.id,
        mainPlayerIds,
        substituteIds,
      });
      setMyRegistration(res.data as TournamentRegistration);
      toast.success(res.message);
      setRegisterModalOpen(false);
      void fetchData(id);
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
      <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_48%,#050816_100%)]" />
        <div className="mx-auto max-w-4xl space-y-5">
          <BackButton fallbackTo="/tournaments" label="Back to tournaments" />
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
      </div>
    );
  }

  const canRegister = tournament.status === "OPEN_REGISTRATION";
  const totalTeams =
    leaderboard.length || tournament._count?.registrations || 0;
  const totalMatches =
    bracket?.matches.length ?? tournament._count?.matches ?? 0;
  const completedMatches =
    bracket?.matches.filter((match) => match.status === "COMPLETED").length ??
    0;
  const teamNameById = new Map(
    leaderboard.map((row) => [row.teamId, row.teamName]),
  );
  const getTeamLabel = (teamId: string | null) =>
    teamId ? formatTournamentName(teamNameById.get(teamId) ?? teamId) : "TBD";
  const registerButtonLabel = getRegistrationButtonLabel(
    myRegistration,
    tournament.status,
    canRegister,
  );
  const bracketMatches = bracket?.matches ?? [];
  const completedAtLabel = tournament.completedAt
    ? formatDateTime(tournament.completedAt)
    : null;

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_46%,#050816_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

      <div className="mx-auto max-w-7xl space-y-6">
        <BackButton fallbackTo="/tournaments" label="Back to tournaments" />

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
          {tournament.bannerUrl && (
            <img
              src={tournament.bannerUrl}
              alt={tournament.name}
              className="absolute inset-0 h-full w-full object-cover opacity-25"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,22,0.96),rgba(5,8,22,0.78),rgba(5,8,22,0.5))]" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill value={tournament.status} />

              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-200">
                {tournament.format}
              </span>
            </div>

            <h1 className="mt-8 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              {formatTournamentName(tournament.name)}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
              {tournament.description ?? "No description available."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2">
                <Gamepad2 className="size-4 text-cyan-200" />
                {tournament.game}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2">
                <Users className="size-4 text-violet-200" />
                {totalTeams}/{tournament.maxTeams} teams
              </span>
              {tournament.region && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2">
                  <Shield className="size-4 text-emerald-200" />
                  {tournament.region}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2">
                <CalendarDays className="size-4 text-amber-200" />
                {formatDate(tournament.startDate)}
              </span>
              {tournament.livestreamUrl && (
                <a
                  href={tournament.livestreamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-300/10 px-4 py-2 text-red-100"
                >
                  <Video className="size-4" />
                  Main stream
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={<Gamepad2 className="size-5" />}
            label="Game"
            value={tournament.game}
            helper="competition title"
            tone="cyan"
          />
          <MetricCard
            icon={<Users className="size-5" />}
            label="Teams"
            value={`${totalTeams}/${tournament.maxTeams}`}
            helper={`${tournament.teamSize} players each`}
            tone="violet"
          />
          <MetricCard
            icon={<Radio className="size-5" />}
            label="Matches"
            value={`${completedMatches}/${totalMatches}`}
            helper="completed"
            tone="red"
          />
          <MetricCard
            icon={<CalendarDays className="size-5" />}
            label="Start Date"
            value={formatDate(tournament.startDate)}
            helper="local display"
            tone="amber"
          />
        </section>


        {tournament.status === "COMPLETED" && (
          <section className="rounded-[1.75rem] border border-amber-300/20 bg-amber-300/10 p-6 shadow-[0_24px_90px_rgba(251,191,36,0.08)]">
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black tracking-[0.25em] text-amber-200">
                  TOURNAMENT RESULT
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  Final Standings
                </h2>
              </div>

              {completedAtLabel && (
                <p className="text-sm font-bold text-white/55">
                  Completed {completedAtLabel}
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

        <PanelShell
          icon={<Megaphone className="size-6" />}
          title="Announcements"
          description="Organizer updates, warnings and urgent notices for this tournament."
        >
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
                    className={`rounded-[1.35rem] border p-5 shadow-[0_18px_70px_rgba(0,0,0,0.14)] ${tone.wrapper}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <Icon className={`mt-1 shrink-0 ${tone.icon}`} />
                        <div>
                          <p className="font-black text-white">
                            {announcement.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatDateTime(announcement.createdAt)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${tone.label}`}
                      >
                        {announcement.type}
                      </span>
                    </div>

                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">
                      {announcement.content}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </PanelShell>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-6">
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
                {activeTab === "BRACKET" && bracket?.status && (
                  <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 sm:flex">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Bracket
                    </span>
                    <StatusPill value={bracket.status} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1 text-sm font-black">
                <button
                  type="button"
                  onClick={() =>
                    setTabOverride({
                      pathname: location.pathname,
                      tab: "BRACKET",
                    })
                  }
                  className={`rounded-xl px-4 py-2 ${
                    activeTab === "BRACKET"
                      ? "bg-cyan-300 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Bracket
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTabOverride({
                      pathname: location.pathname,
                      tab: "LEADERBOARD",
                    })
                  }
                  className={`rounded-xl px-4 py-2 ${
                    activeTab === "LEADERBOARD"
                      ? "bg-amber-300 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Leaderboard
                </button>
              </div>
            </div>

            {activeTab === "BRACKET" && bracketMatches.length === 0 ? (
              <EmptyState
                compact
                icon={Radio}
                title="Bracket not generated"
                description="Once the organizer generates matches, the live bracket will appear here."
              />
            ) : activeTab === "BRACKET" ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {bracketMatches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-[1.35rem] border border-white/10 bg-black/25 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.16)]"
                  >
                    <p className="mb-4 text-xs font-bold text-white/40">
                      ROUND {match.roundNumber} / MATCH {match.matchNumber}
                    </p>

                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                      <p className="font-bold text-white">
                        {getTeamLabel(match.teamAId)}
                      </p>
                    </div>

                    <p className="my-3 text-center text-xs font-black text-white/40">
                      VS
                    </p>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="font-bold text-white">
                        {getTeamLabel(match.teamBId)}
                      </p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center">
                      <p className="font-black text-cyan-300">
                        {match.status === "COMPLETED"
                          ? `${match.scoreA} - ${match.scoreB}`
                          : formatStatus(match.status)}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                      <p className="text-white/55">
                        Time:{" "}
                        <span className="font-bold text-white">
                          {match.scheduledAt
                            ? formatDateTime(match.scheduledAt)
                            : "TBA"}
                        </span>
                      </p>
                      <p className="text-white/55">
                        Room:{" "}
                        <span className="font-bold text-white">
                          Private match room
                        </span>
                      </p>
                      {(match.status === "LIVE" ||
                        match.status === "IN_PROGRESS") &&
                      match.livestreamUrl ? (
                        <a
                          href={match.livestreamUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-red-300 px-4 py-2 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-red-200"
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
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
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
                <table className="w-full min-w-[780px] border-separate border-spacing-y-3 text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
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
                      <tr key={row.teamId} className="bg-black/25">
                        <td className="rounded-l-2xl border-y border-l border-white/10 px-4 py-4">
                          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 font-black text-amber-100">
                            <Medal size={16} /> #{row.rank}
                          </span>
                        </td>
                        <td className="border-y border-white/10 px-4 py-4">
                          <p className="font-black text-white">{row.teamName}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            Highest #{row.highestRank} / {row.winRate}% win rate
                          </p>
                        </td>
                        <td className="border-y border-white/10 px-4 py-4 font-bold">
                          {row.matchesPlayed}
                        </td>
                        <td className="border-y border-white/10 px-4 py-4 font-bold text-emerald-300">
                          {row.wins}
                        </td>
                        <td className="border-y border-white/10 px-4 py-4 font-bold text-red-300">
                          {row.losses}
                        </td>
                        <td className="rounded-r-2xl border-y border-r border-white/10 px-4 py-4 text-xl font-black text-cyan-300">
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="rounded-[1.75rem] border border-cyan-300/20 bg-cyan-300/10 p-6 shadow-[0_24px_90px_rgba(34,211,238,0.1)] backdrop-blur-2xl">
            <Shield className="mb-5 text-cyan-200" />
            <h2 className="text-2xl font-black">Tournament Rules</h2>

            <p className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-300">
              {tournament.rules ?? "No rules provided."}
            </p>

            {registrationStatusLoading ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                  <Loader2 className="size-4 animate-spin" />
                  Checking lineup status...
                </div>
              </div>
            ) : myRegistration ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Your lineup
                </p>
                <div className="mt-3">
                  <StatusPill value={myRegistration.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {getRegistrationStatusMessage(myRegistration.status)}
                </p>
                {myRegistration.rejectReason && (
                  <p className="mt-3 rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-sm leading-6 text-red-100">
                    {myRegistration.rejectReason}
                  </p>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleOpenRegisterModal}
              disabled={
                loadingAction === "register" || !canRegister || !!myRegistration
              }
              className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loadingAction === "register" && (
                <Loader2 className="size-4 animate-spin" />
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

          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[#0b1220] p-6 shadow-[0_28px_110px_rgba(0,0,0,0.5)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
                  TEAM LINEUP
                </p>
                <h2 className="mt-2 text-3xl font-black">Register Team</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Choose exactly {tournament.teamSize} main players. Substitutes
                  are optional.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/10 hover:text-white"
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
                {teams.length > 1 && (
                  <div className="mb-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Choose team
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {teams.map((item) => {
                        const isSelected = item.id === team.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectRegistrationTeam(item)}
                            className={[
                              "rounded-2xl border px-4 py-3 text-left transition",
                              isSelected
                                ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                                : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/25 hover:bg-cyan-300/10",
                            ].join(" ")}
                          >
                            <span className="block truncate font-black">
                              {item.name}
                            </span>
                            <span className="mt-1 block truncate text-xs text-slate-500">
                              {item.game ?? "No game"} -{" "}
                              {item.region ?? "No region"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                  <p className="font-black text-cyan-100">{team.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
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
                        className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 md:grid-cols-[1fr_auto_auto]"
                      >
                        <div>
                          <p className="font-black text-white">
                            {member.user.username}
                          </p>
                          <p className="text-sm text-slate-400">
                            {member.user.email}
                          </p>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-300/20">
                          <input
                            type="checkbox"
                            checked={isMain}
                            onChange={() => toggleMainPlayer(playerId)}
                            className="size-4 accent-cyan-400"
                          />
                          Main
                        </label>

                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm font-bold text-violet-100 hover:bg-violet-300/20">
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
                  <p className="text-sm font-bold text-slate-400">
                    Main {mainPlayerIds.length}/{tournament.teamSize} /
                    Substitute {substituteIds.length}
                  </p>

                  <button
                    type="button"
                    onClick={handleRegisterTeam}
                    disabled={loadingAction === "register"}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loadingAction === "register" && (
                      <Loader2 className="size-4 animate-spin" />
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
