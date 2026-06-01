import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  GitBranch,
  Loader2,
  Lock,
  Megaphone,
  Plus,
  Radio,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import {
  approveRegistration,
  closeTournamentRegistration,
  createTournamentAnnouncement,
  createTournament,
  generateBracket,
  getMyTournaments,
  getTournamentBracket,
  getTournamentRegistrations,
  rejectRegistration,
  submitTournamentApproval,
  type AnnouncementType,
} from "@/services/tournament.service";
import { scheduleMatch, updateMatchLivestream } from "@/services/match.service";
import { getDisputes, resolveDispute } from "@/services/dispute.service";
import { getAuditLogs } from "@/services/audit-log.service";
import { uploadFile } from "@/services/upload.service";
import {
  EmptyState,
  LoadingState,
  Pagination,
  getTotalPages,
  paginateItems,
  useConfirm,
  useToast,
} from "@/components/ui";

const organizerPageSize = 5;

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

function textMatches(values: Array<string | number | null | undefined>, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function filterMatches(values: Array<string | null | undefined>, filter: string) {
  return filter === "ALL" || values.some((value) => value === filter);
}

function parseLineup(lineupData: string | null): RegistrationLineup | null {
  if (!lineupData) return null;

  try {
    return JSON.parse(lineupData) as RegistrationLineup;
  } catch {
    return null;
  }
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 16);
}

function isFutureDate(date: Date) {
  return date.getTime() > Date.now();
}

function isValidLivestreamUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function pickImageFile() {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), {
      once: true,
    });
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.click();
  });
}

type Tournament = {
  id: string;
  name: string;
  status: string;
  maxTeams: number;
  approvalRejectReason?: string | null;
};

type Registration = {
  id: string;
  status: string;
  lineupData: string | null;
  team: {
    id: string;
    name: string;
    captain: {
      username: string;
      email: string;
    };
    members: unknown[];
  };
};

type OrganizerMatch = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  status: string;
  scheduledAt: string | null;
  roomCode: string | null;
  livestreamUrl: string | null;
};

type MatchScheduleForm = {
  scheduledAt: string;
  roomCode: string;
  livestreamUrl: string;
};

type LineupPlayer = {
  id: string;
  username: string;
  email: string;
};

type RegistrationLineup = {
  mainPlayerIds?: string[];
  memberIds?: string[];
  substituteIds?: string[];
  mainPlayers?: LineupPlayer[];
  substitutes?: LineupPlayer[];
};

type Dispute = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  decision: string | null;
  matchId: string;
  match?: {
    teamAId: string | null;
    teamBId: string | null;
    pendingScoreA: number | null;
    pendingScoreB: number | null;
    resultSubmittedTeamId: string | null;
    evidences?: {
      id: string;
      imageUrl: string;
      note: string | null;
      submittedBy: string;
    }[];
    tournament?: {
      name: string;
    };
  };
};

type ResolveDecision =
  | "APPROVE_TEAM_A_RESULT"
  | "APPROVE_TEAM_B_RESULT"
  | "REMATCH";

type AuditLog = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string | null;
  createdAt: string;
};

export function OrganizerDashboardPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [matches, setMatches] = useState<OrganizerMatch[]>([]);
  const [scheduleForms, setScheduleForms] = useState<
    Record<string, MatchScheduleForm>
  >({});
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [schedulingMatchId, setSchedulingMatchId] = useState<string | null>(
    null,
  );
  const [updatingLivestreamMatchId, setUpdatingLivestreamMatchId] = useState<
    string | null
  >(null);
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementType, setAnnouncementType] =
    useState<AnnouncementType>("INFO");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tournamentQuery, setTournamentQuery] = useState("");
  const [tournamentStatusFilter, setTournamentStatusFilter] = useState("ALL");
  const [tournamentPage, setTournamentPage] = useState(1);
  const [registrationQuery, setRegistrationQuery] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState("ALL");
  const [registrationPage, setRegistrationPage] = useState(1);
  const [matchQuery, setMatchQuery] = useState("");
  const [matchStatusFilter, setMatchStatusFilter] = useState("ALL");
  const [matchPage, setMatchPage] = useState(1);
  const [disputeQuery, setDisputeQuery] = useState("");
  const [disputeStatusFilter, setDisputeStatusFilter] = useState("ALL");
  const [disputePage, setDisputePage] = useState(1);

  async function loadTournaments(keepSelectedId?: string) {
    const res = await getMyTournaments();
    const list = res.data as Tournament[];

    setTournaments(list);

    const nextSelected =
      list.find((item) => item.id === keepSelectedId) ?? list[0] ?? null;

    setSelectedTournament(nextSelected);

    if (nextSelected) {
      await loadRegistrations(nextSelected.id);
      await loadMatches(nextSelected.id);
    }
  }

  async function loadRegistrations(tournamentId: string) {
    const res = await getTournamentRegistrations(tournamentId);
    setRegistrations(res.data);
  }

  async function loadMatches(tournamentId: string) {
    try {
      const res = await getTournamentBracket(tournamentId);
      const list = res.data.matches as OrganizerMatch[];

      setMatches(list);
      setScheduleForms(() => {
        const next: Record<string, MatchScheduleForm> = {};

        list.forEach((match) => {
          next[match.id] = {
            scheduledAt: toDateTimeLocal(match.scheduledAt),
            roomCode: match.roomCode ?? "",
            livestreamUrl: match.livestreamUrl ?? "",
          };
        });

        return next;
      });
    } catch {
      setMatches([]);
      setScheduleForms({});
    }
  }

  async function loadDisputes() {
    const res = await getDisputes();
    setDisputes(res.data);
  }

  async function handleSelectTournament(tournament: Tournament) {
    setSelectedTournament(tournament);

    try {
      await loadRegistrations(tournament.id);
      await loadMatches(tournament.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load registrations."));
    }
  }

  async function handleApprove(registrationId: string) {
    if (!selectedTournament) return;

    if (selectedTournament.status === "COMPLETED") {
      toast.warning("Tournament is completed and archived.");
      return;
    }

    const registration = registrations.find((item) => item.id === registrationId);
    const confirmed = await confirm({
      title: "Approve registration?",
      description: `${registration?.team.name ?? "This team"} will be added to ${selectedTournament.name}.`,
      confirmText: "Approve",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);

      await approveRegistration(registrationId);
      await loadRegistrations(selectedTournament.id);

      toast.success("Registration approved successfully");
      await loadAuditLogs();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Approve failed. Make sure you are logged in as the organizer of this tournament.",
        ),
      );
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleReject(registrationId: string) {
    if (!selectedTournament) return;

    if (selectedTournament.status === "COMPLETED") {
      toast.warning("Tournament is completed and archived.");
      return;
    }

    const reason = prompt("Reject reason") ?? "";

    const registration = registrations.find((item) => item.id === registrationId);
    const confirmed = await confirm({
      title: "Reject registration?",
      description: `${registration?.team.name ?? "This team"} will be removed from the pending queue.`,
      confirmText: "Reject",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);

      await rejectRegistration(registrationId, reason);
      await loadRegistrations(selectedTournament.id);

      toast.success("Registration rejected successfully");
      await loadAuditLogs();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Reject failed. Make sure you are logged in as the organizer of this tournament.",
        ),
      );
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleCreateTournament() {
    const name = prompt("Tournament name");
    const game = prompt("Game");

    if (!name || !game) return;

    const maxTeams = Number(prompt("Max teams", "4"));
    const teamSize = Number(prompt("Team size", "5"));
    const format = prompt("Format", "SINGLE_ELIMINATION") ?? "";
    const startDate =
      prompt("Start date ISO", new Date().toISOString()) ??
      new Date().toISOString();
    const registrationDeadline =
      prompt("Registration deadline ISO", new Date().toISOString()) ??
      new Date().toISOString();
    const bannerFile = await pickImageFile();

    try {
      setLoadingAction(true);
      const bannerUrl = bannerFile
        ? (await uploadFile(bannerFile)).data.url
        : undefined;

      const res = await createTournament({
        name,
        game,
        bannerUrl,
        maxTeams,
        teamSize,
        format,
        startDate,
        registrationDeadline,
      });

      toast.success(res.message);
      await loadTournaments(res.data.id);
      await loadAuditLogs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Create tournament failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleCloseRegistration() {
    if (!selectedTournament) return;

    const confirmed = await confirm({
      title: "Close registration?",
      description: `${selectedTournament.name} will stop receiving new teams.`,
      confirmText: "Close registration",
      tone: "warning",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);

      await closeTournamentRegistration(selectedTournament.id);

      toast.success("Registration closed successfully");
      await loadTournaments(selectedTournament.id);
      await loadAuditLogs();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Close registration failed. Make sure you are the organizer of this tournament.",
        ),
      );
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleGenerateBracket() {
    if (!selectedTournament) return;

    const confirmed = await confirm({
      title: "Generate bracket?",
      description: `Create bracket matches for ${selectedTournament.name} from approved teams.`,
      confirmText: "Generate",
      tone: "info",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);

      await generateBracket(selectedTournament.id);

      toast.success("Bracket generated successfully");
      await loadTournaments(selectedTournament.id);
      await loadMatches(selectedTournament.id);
      await loadAuditLogs();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Generate bracket failed. Registration must be closed and at least 2 teams must be approved.",
        ),
      );
    } finally {
      setLoadingAction(false);
    }
  }

  function updateScheduleForm(
    matchId: string,
    field: keyof MatchScheduleForm,
    value: string,
  ) {
    setScheduleForms((prev) => ({
      ...prev,
      [matchId]: {
        scheduledAt: prev[matchId]?.scheduledAt ?? "",
        roomCode: prev[matchId]?.roomCode ?? "",
        livestreamUrl: prev[matchId]?.livestreamUrl ?? "",
        [field]: value,
      },
    }));
  }

  async function handleScheduleMatch(matchId: string) {
    if (!selectedTournament) return;

    if (selectedTournament.status === "COMPLETED") {
      toast.warning("Tournament is completed and archived.");
      return;
    }

    const form = scheduleForms[matchId];

    if (!form?.scheduledAt) {
      toast.warning("Choose match time before scheduling.");
      return;
    }

    if (!form.roomCode.trim()) {
      toast.warning("Room code is required.");
      return;
    }

    const scheduledAt = new Date(form.scheduledAt);

    if (Number.isNaN(scheduledAt.getTime()) || !isFutureDate(scheduledAt)) {
      toast.warning("Match time must be in the future.");
      return;
    }

    if (
      form.livestreamUrl.trim() &&
      !isValidLivestreamUrl(form.livestreamUrl.trim())
    ) {
      toast.warning("Livestream URL must start with http:// or https://.");
      return;
    }

    const match = matches.find((item) => item.id === matchId);
    const confirmed = await confirm({
      title: "Schedule match?",
      description: `Notify both teams for Round ${match?.roundNumber ?? "?"}, Match ${match?.matchNumber ?? "?"}.`,
      confirmText: "Schedule",
      tone: "info",
    });

    if (!confirmed) return;

    try {
      setSchedulingMatchId(matchId);

      const res = await scheduleMatch(matchId, {
        scheduledAt: scheduledAt.toISOString(),
        roomCode: form.roomCode.trim(),
        livestreamUrl: form.livestreamUrl.trim() || undefined,
      });

      toast.success(res.message);
      await loadMatches(selectedTournament.id);
      await loadAuditLogs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Schedule match failed."));
    } finally {
      setSchedulingMatchId(null);
    }
  }

  async function handleUpdateLivestream(matchId: string) {
    if (!selectedTournament) return;

    if (selectedTournament.status === "COMPLETED") {
      toast.warning("Tournament is completed and archived.");
      return;
    }

    const form = scheduleForms[matchId];
    const livestreamUrl = form?.livestreamUrl.trim() ?? "";

    if (!livestreamUrl) {
      toast.warning("Paste a livestream URL first.");
      return;
    }

    if (!isValidLivestreamUrl(livestreamUrl)) {
      toast.warning("Livestream URL must start with http:// or https://.");
      return;
    }

    const match = matches.find((item) => item.id === matchId);
    const confirmed = await confirm({
      title: "Publish livestream?",
      description: `Notify teams and tournament spectators for Round ${match?.roundNumber ?? "?"}, Match ${match?.matchNumber ?? "?"}.`,
      confirmText: "Publish",
      tone: "info",
    });

    if (!confirmed) return;

    try {
      setUpdatingLivestreamMatchId(matchId);

      const res = await updateMatchLivestream(matchId, {
        livestreamUrl,
      });

      toast.success(res.message);
      await loadMatches(selectedTournament.id);
      await loadAuditLogs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Update livestream failed."));
    } finally {
      setUpdatingLivestreamMatchId(null);
    }
  }

  async function handleSubmitApproval() {
    if (!selectedTournament) return;

    const confirmed = await confirm({
      title: "Submit tournament for approval?",
      description: `${selectedTournament.name} will be reviewed by an admin before registration opens.`,
      confirmText: "Submit",
      tone: "info",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);
      const res = await submitTournamentApproval(selectedTournament.id);

      toast.success(res.message);
      await loadTournaments(selectedTournament.id);
      await loadAuditLogs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Submit tournament approval failed."));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleCreateAnnouncement() {
    if (!selectedTournament) return;

    if (selectedTournament.status === "COMPLETED") {
      toast.warning("Tournament is completed and archived.");
      return;
    }

    const title = announcementTitle.trim();
    const content = announcementContent.trim();

    if (!title || !content) {
      toast.warning("Announcement title and content are required.");
      return;
    }

    const confirmed = await confirm({
      title: "Create announcement?",
      description: `Send a ${announcementType} announcement to registered teams in ${selectedTournament.name}.`,
      confirmText: "Create",
      tone: announcementType === "URGENT" ? "danger" : "info",
    });

    if (!confirmed) return;

    try {
      setCreatingAnnouncement(true);

      const res = await createTournamentAnnouncement(selectedTournament.id, {
        title,
        content,
        type: announcementType,
      });

      toast.success(res.message);
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setAnnouncementType("INFO");
      await loadAuditLogs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Create announcement failed."));
    } finally {
      setCreatingAnnouncement(false);
    }
  }

  async function handleResolveDispute(
    disputeId: string,
    decision: ResolveDecision,
  ) {
    const dispute = disputes.find((item) => item.id === disputeId);
    const confirmed = await confirm({
      title: "Resolve dispute?",
      description: `Close "${dispute?.reason ?? "this dispute"}" with your decision.`,
      confirmText: "Resolve",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);

      await resolveDispute(disputeId, { decision });

      toast.success("Dispute resolved successfully");
      await loadDisputes();
      await loadAuditLogs();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Resolve dispute failed. Make sure you are the organizer.",
        ),
      );
    } finally {
      setLoadingAction(false);
    }
  }

  async function loadAuditLogs() {
    const res = await getAuditLogs();
    setAuditLogs(res.data);
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadTournaments();
        await loadDisputes();
        await loadAuditLogs();
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, "Failed to load organizer dashboard."));
        }
      } finally {
        if (!cancelled) {
          setLoadingPage(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  function handleTournamentQueryChange(value: string) {
    setTournamentQuery(value);
    setTournamentPage(1);
  }

  function handleTournamentStatusFilterChange(value: string) {
    setTournamentStatusFilter(value);
    setTournamentPage(1);
  }

  function handleRegistrationQueryChange(value: string) {
    setRegistrationQuery(value);
    setRegistrationPage(1);
  }

  function handleRegistrationStatusFilterChange(value: string) {
    setRegistrationStatusFilter(value);
    setRegistrationPage(1);
  }

  function handleMatchQueryChange(value: string) {
    setMatchQuery(value);
    setMatchPage(1);
  }

  function handleMatchStatusFilterChange(value: string) {
    setMatchStatusFilter(value);
    setMatchPage(1);
  }

  function handleDisputeQueryChange(value: string) {
    setDisputeQuery(value);
    setDisputePage(1);
  }

  function handleDisputeStatusFilterChange(value: string) {
    setDisputeStatusFilter(value);
    setDisputePage(1);
  }

  const pendingCount = registrations.filter(
    (item) => item.status === "PENDING",
  ).length;

  const approvedCount = registrations.filter(
    (item) => item.status === "APPROVED",
  ).length;

  const openDisputesCount = disputes.filter(
    (item) => item.status === "OPEN",
  ).length;
  const isSelectedTournamentArchived =
    selectedTournament?.status === "COMPLETED";
  const tournamentStatusOptions = useMemo(
    () => Array.from(new Set(tournaments.map((item) => item.status))).sort(),
    [tournaments],
  );
  const registrationStatusOptions = useMemo(
    () => Array.from(new Set(registrations.map((item) => item.status))).sort(),
    [registrations],
  );
  const matchStatusOptions = useMemo(
    () => Array.from(new Set(matches.map((item) => item.status))).sort(),
    [matches],
  );
  const disputeStatusOptions = useMemo(
    () => Array.from(new Set(disputes.map((item) => item.status))).sort(),
    [disputes],
  );
  const filteredTournaments = useMemo(
    () =>
      tournaments.filter(
        (item) =>
          textMatches([item.name, item.status, item.maxTeams], tournamentQuery) &&
          filterMatches([item.status], tournamentStatusFilter),
      ),
    [tournamentQuery, tournamentStatusFilter, tournaments],
  );
  const filteredRegistrations = useMemo(
    () =>
      registrations.filter((item) => {
        const lineup = parseLineup(item.lineupData);

        return (
          textMatches(
            [
              item.team.name,
              item.team.captain.username,
              item.team.captain.email,
              item.status,
              ...(lineup?.mainPlayers ?? []).map((player) => player.username),
              ...(lineup?.substitutes ?? []).map((player) => player.username),
            ],
            registrationQuery,
          ) && filterMatches([item.status], registrationStatusFilter)
        );
      }),
    [registrationQuery, registrationStatusFilter, registrations],
  );
  const filteredMatches = useMemo(
    () =>
      matches.filter(
        (item) =>
          textMatches(
            [
              item.roundNumber,
              item.matchNumber,
              item.teamAId,
              item.teamBId,
              item.status,
              item.roomCode,
              item.livestreamUrl,
            ],
            matchQuery,
          ) && filterMatches([item.status], matchStatusFilter),
      ),
    [matchQuery, matchStatusFilter, matches],
  );
  const filteredDisputes = useMemo(
    () =>
      disputes.filter(
        (item) =>
          textMatches(
            [
              item.reason,
              item.description,
              item.status,
              item.matchId,
              item.match?.tournament?.name,
            ],
            disputeQuery,
          ) && filterMatches([item.status], disputeStatusFilter),
      ),
    [disputeQuery, disputeStatusFilter, disputes],
  );
  const currentTournamentPage = Math.min(
    tournamentPage,
    getTotalPages(filteredTournaments.length, organizerPageSize),
  );
  const currentRegistrationPage = Math.min(
    registrationPage,
    getTotalPages(filteredRegistrations.length, organizerPageSize),
  );
  const currentMatchPage = Math.min(
    matchPage,
    getTotalPages(filteredMatches.length, organizerPageSize),
  );
  const currentDisputePage = Math.min(
    disputePage,
    getTotalPages(filteredDisputes.length, organizerPageSize),
  );
  const pagedTournaments = paginateItems(
    filteredTournaments,
    currentTournamentPage,
    organizerPageSize,
  );
  const pagedRegistrations = paginateItems(
    filteredRegistrations,
    currentRegistrationPage,
    organizerPageSize,
  );
  const pagedMatches = paginateItems(
    filteredMatches,
    currentMatchPage,
    organizerPageSize,
  );
  const pagedDisputes = paginateItems(
    filteredDisputes,
    currentDisputePage,
    organizerPageSize,
  );

  return (
    <div className="min-h-screen bg-[#0B1020] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
              ORGANIZER DASHBOARD
            </p>
            <h1 className="mt-4 text-5xl font-black">
              Tournament Control Center
            </h1>
            <p className="mt-4 text-white/60">
              Manage registrations, approve teams, generate brackets and resolve
              match disputes.
            </p>
          </div>

          <button
            onClick={handleCreateTournament}
            disabled={loadingAction}
            className="flex w-fit items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-50"
          >
            {loadingAction ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            Create Tournament
          </button>
        </div>

        <section className="grid gap-6 md:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <Trophy className="mb-4 text-yellow-300" />
            <p className="text-sm text-white/50">Tournaments</p>
            <p className="mt-2 text-3xl font-black">{tournaments.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <Users className="mb-4 text-cyan-400" />
            <p className="text-sm text-white/50">Registrations</p>
            <p className="mt-2 text-3xl font-black">{registrations.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <CheckCircle2 className="mb-4 text-green-400" />
            <p className="text-sm text-white/50">Approved</p>
            <p className="mt-2 text-3xl font-black">{approvedCount}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <ShieldAlert className="mb-4 text-violet-400" />
            <p className="text-sm text-white/50">Pending</p>
            <p className="mt-2 text-3xl font-black">{pendingCount}</p>
          </div>

          <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-6">
            <ShieldAlert className="mb-4 text-red-400" />
            <p className="text-sm text-white/50">Open Disputes</p>
            <p className="mt-2 text-3xl font-black">{openDisputesCount}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="mb-6 text-2xl font-black">My Tournaments</h2>

            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  value={tournamentQuery}
                  onChange={(event) =>
                    handleTournamentQueryChange(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-cyan-400/50"
                  placeholder="Search tournaments"
                />
              </label>

              <label className="relative block">
                <SlidersHorizontal
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <select
                  value={tournamentStatusFilter}
                  onChange={(event) =>
                    handleTournamentStatusFilterChange(event.target.value)
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-cyan-400/50"
                >
                  <option value="ALL">All</option>
                  {tournamentStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-4">
              {filteredTournaments.length === 0 ? (
                loadingPage ? (
                  <LoadingState
                    compact
                    title="Loading tournaments..."
                    description="Preparing your organizer workspace."
                  />
                ) : (
                  <EmptyState
                    compact
                    icon={Trophy}
                    title={
                      tournaments.length === 0
                        ? "No tournaments yet"
                        : "No tournaments match"
                    }
                    description={
                      tournaments.length === 0
                        ? "Create your first event to start managing registrations."
                        : "Try another keyword or status."
                    }
                  />
                )
              ) : (
                <>
                  {pagedTournaments.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTournament(item)}
                      className={`w-full rounded-3xl p-5 text-left transition ${
                        selectedTournament?.id === item.id
                          ? "border border-cyan-400/50 bg-cyan-400/10"
                          : "bg-black/30 hover:bg-white/[0.06]"
                      }`}
                    >
                      <p className="font-black">{item.name}</p>
                      <p className="mt-1 text-sm text-white/50">
                        Status: {item.status}
                      </p>
                      <p className="mt-1 text-sm text-white/50">
                        Max Teams: {item.maxTeams}
                      </p>
                      {item.approvalRejectReason && (
                        <p className="mt-3 rounded-2xl bg-red-400/10 p-3 text-sm text-red-300">
                          {item.approvalRejectReason}
                        </p>
                      )}
                    </button>
                  ))}

                  <Pagination
                    page={currentTournamentPage}
                    pageSize={organizerPageSize}
                    totalItems={filteredTournaments.length}
                    onPageChange={setTournamentPage}
                  />
                </>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-2xl font-black">
                  {selectedTournament?.name ?? "No tournament selected"}
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Registration Management
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedTournament?.status === "DRAFT" && (
                  <button
                    onClick={handleSubmitApproval}
                    disabled={loadingAction}
                    className="flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-300 hover:bg-cyan-400/20 disabled:opacity-50"
                  >
                    {loadingAction ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    Submit Approval
                  </button>
                )}

                {selectedTournament?.status === "PENDING_APPROVAL" && (
                  <span className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-3 font-bold text-amber-200">
                    Pending Admin Approval
                  </span>
                )}

                <button
                  onClick={handleCloseRegistration}
                  disabled={
                    !selectedTournament ||
                    selectedTournament.status !== "OPEN_REGISTRATION" ||
                    loadingAction
                  }
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <Lock size={18} />
                  Close Registration
                </button>

                <button
                  onClick={handleGenerateBracket}
                  disabled={
                    !selectedTournament ||
                    selectedTournament.status !== "REGISTRATION_CLOSED" ||
                    loadingAction
                  }
                  className="flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-50"
                >
                  <GitBranch size={18} />
                  Generate Bracket
                </button>

                {selectedTournament && (
                  <Link
                    to={`/tournaments/${selectedTournament.id}`}
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-300 hover:bg-cyan-400/20"
                  >
                    View Detail
                  </Link>
                )}
              </div>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  value={registrationQuery}
                  onChange={(event) =>
                    handleRegistrationQueryChange(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-cyan-400/50"
                  placeholder="Search registrations"
                />
              </label>

              <label className="relative block">
                <SlidersHorizontal
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <select
                  value={registrationStatusFilter}
                  onChange={(event) =>
                    handleRegistrationStatusFilterChange(event.target.value)
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-cyan-400/50"
                >
                  <option value="ALL">All</option>
                  {registrationStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredRegistrations.length === 0 ? (
              loadingPage ? (
                <LoadingState
                  compact
                  title="Loading registrations..."
                  description="Checking the latest team queue."
                />
              ) : (
                <EmptyState
                  compact
                  icon={Users}
                  title={
                    selectedTournament && registrations.length === 0
                      ? "No registrations yet"
                      : registrations.length > 0
                        ? "No registrations match"
                        : "No tournament selected"
                  }
                  description={
                    selectedTournament && registrations.length === 0
                      ? "Pending teams will appear here once players register."
                      : registrations.length > 0
                        ? "Try another keyword or status."
                        : "Create or select a tournament to review registrations."
                  }
                />
              )
            ) : (
              <div className="space-y-4">
                {pagedRegistrations.map((item) => {
                  const lineup = parseLineup(item.lineupData);

                  return (
                    <div
                      key={item.id}
                      className="grid gap-4 rounded-3xl bg-black/30 p-5 md:grid-cols-[1fr_130px_120px]"
                    >
                      <div>
                        <p className="font-black">{item.team.name}</p>
                        <p className="text-sm text-white/50">
                          Captain: {item.team.captain.username}
                        </p>
                        <p className="text-sm text-white/50">
                          Members: {item.team.members.length}
                        </p>

                        {lineup ? (
                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                                Main lineup
                              </p>
                              <div className="mt-2 space-y-1">
                                {(lineup.mainPlayers ?? []).map((player) => (
                                  <p
                                    key={player.id}
                                    className="text-sm font-bold text-white/75"
                                  >
                                    {player.username}
                                  </p>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3">
                              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
                                Substitutes
                              </p>
                              <div className="mt-2 space-y-1">
                                {(lineup.substitutes ?? []).length > 0 ? (
                                  (lineup.substitutes ?? []).map((player) => (
                                    <p
                                      key={player.id}
                                      className="text-sm font-bold text-white/75"
                                    >
                                      {player.username}
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-sm text-white/40">None</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 rounded-2xl bg-red-400/10 p-3 text-sm text-red-300">
                            No lineup submitted.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-white/50">Status</p>
                        <p className="font-bold text-cyan-300">{item.status}</p>
                      </div>

                      <div className="flex items-center">
                        {item.status === "PENDING" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleApprove(item.id)}
                              disabled={
                                loadingAction ||
                                !lineup ||
                                isSelectedTournamentArchived
                              }
                              className="rounded-2xl bg-green-400 px-4 py-2 text-sm font-black text-black hover:bg-green-300 disabled:opacity-50"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => handleReject(item.id)}
                              disabled={
                                loadingAction || isSelectedTournamentArchived
                              }
                              className="rounded-2xl bg-red-400 px-4 py-2 text-sm font-black text-black hover:bg-red-300 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white/50">
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Pagination
                  page={currentRegistrationPage}
                  pageSize={organizerPageSize}
                  totalItems={filteredRegistrations.length}
                  onPageChange={setRegistrationPage}
                />
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-6 flex items-center gap-3">
            <Megaphone className="text-cyan-300" />
            <h2 className="text-2xl font-black">Announcements</h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_180px]">
            <input
              value={announcementTitle}
              onChange={(event) => setAnnouncementTitle(event.target.value)}
              disabled={isSelectedTournamentArchived}
              className="rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 outline-none"
              placeholder="Announcement title"
            />

            <select
              value={announcementType}
              onChange={(event) =>
                setAnnouncementType(event.target.value as AnnouncementType)
              }
              disabled={isSelectedTournamentArchived}
              className="rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 font-bold outline-none"
            >
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <textarea
            value={announcementContent}
            onChange={(event) => setAnnouncementContent(event.target.value)}
            disabled={isSelectedTournamentArchived}
            className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 outline-none"
            placeholder="Announcement content"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/50">
              {isSelectedTournamentArchived
                ? "Completed tournaments are archived in read-only mode."
                : "Notifications will be sent to members of registered teams."}
            </p>

            <button
              type="button"
              onClick={handleCreateAnnouncement}
              disabled={
                !selectedTournament ||
                creatingAnnouncement ||
                isSelectedTournamentArchived
              }
              className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-black hover:bg-cyan-300 disabled:opacity-50"
            >
              {creatingAnnouncement ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Megaphone size={18} />
              )}
              Create Announcement
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-6 flex items-center gap-3">
            <CalendarDays className="text-amber-300" />
            <h2 className="text-2xl font-black">Match Scheduling</h2>
          </div>

          {matches.length > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  value={matchQuery}
                  onChange={(event) =>
                    handleMatchQueryChange(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-cyan-400/50"
                  placeholder="Search matches"
                />
              </label>

              <label className="relative block">
                <SlidersHorizontal
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <select
                  value={matchStatusFilter}
                  onChange={(event) =>
                    handleMatchStatusFilterChange(event.target.value)
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-cyan-400/50"
                >
                  <option value="ALL">All</option>
                  {matchStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {filteredMatches.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarDays}
              title={
                matches.length === 0 ? "No matches to schedule" : "No matches match"
              }
              description={
                matches.length === 0
                  ? "Generate a bracket first, then schedule each match with a room code."
                  : "Try another keyword or status."
              }
            />
          ) : (
            <div className="space-y-4">
              {pagedMatches.map((match) => {
                const form = scheduleForms[match.id] ?? {
                  scheduledAt: "",
                  roomCode: "",
                  livestreamUrl: "",
                };
                const isCompleted =
                  isSelectedTournamentArchived || match.status === "COMPLETED";

                return (
                  <div
                    key={match.id}
                    className="grid gap-4 rounded-3xl bg-black/30 p-5 xl:grid-cols-[1fr_210px_170px_1fr_140px_140px]"
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                        Round {match.roundNumber} - Match {match.matchNumber}
                      </p>
                      <p className="mt-2 font-black">
                        {match.teamAId ?? "TBD"} vs {match.teamBId ?? "TBD"}
                      </p>
                      <p className="mt-1 text-sm text-white/45">
                        Status: {match.status}
                      </p>
                    </div>

                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(event) =>
                        updateScheduleForm(
                          match.id,
                          "scheduledAt",
                          event.target.value,
                        )
                      }
                      disabled={isCompleted}
                      className="rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 text-sm outline-none disabled:opacity-50"
                    />

                    <input
                      value={form.roomCode}
                      onChange={(event) =>
                        updateScheduleForm(match.id, "roomCode", event.target.value)
                      }
                      disabled={isCompleted}
                      className="rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 text-sm outline-none disabled:opacity-50"
                      placeholder="Room code"
                    />

                    <input
                      value={form.livestreamUrl}
                      onChange={(event) =>
                        updateScheduleForm(
                          match.id,
                          "livestreamUrl",
                          event.target.value,
                        )
                      }
                      disabled={isCompleted}
                      className="rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 text-sm outline-none disabled:opacity-50"
                      placeholder="Livestream URL"
                    />

                    <button
                      type="button"
                      onClick={() => handleScheduleMatch(match.id)}
                      disabled={isCompleted || schedulingMatchId === match.id}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-black hover:bg-amber-200 disabled:opacity-50"
                    >
                      {schedulingMatchId === match.id && (
                        <Loader2 size={16} className="animate-spin" />
                      )}
                      Schedule
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateLivestream(match.id)}
                      disabled={
                        isCompleted ||
                        match.status !== "IN_PROGRESS" ||
                        updatingLivestreamMatchId === match.id
                      }
                      className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50"
                    >
                      {updatingLivestreamMatchId === match.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Video size={16} />
                      )}
                      Go Live
                    </button>
                  </div>
                );
              })}
              <Pagination
                page={currentMatchPage}
                pageSize={organizerPageSize}
                totalItems={filteredMatches.length}
                onPageChange={setMatchPage}
              />
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-[2rem] border border-cyan-400/20 bg-cyan-400/10 p-6">
            <GitBranch className="mb-5 text-cyan-300" />
            <h2 className="text-2xl font-black">Bracket Engine</h2>
            <p className="mt-3 text-white/60">
              Generate brackets from approved teams after registration closes.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <Radio className="mb-5 text-red-400" />
            <h2 className="text-2xl font-black">Live Matches</h2>
            <p className="mt-3 text-white/60">
              Manage match result, evidence and disputes.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <Activity className="mb-5 text-violet-400" />
            <h2 className="text-2xl font-black">Audit Trail</h2>
            <p className="mt-3 text-white/60">
              Track important organizer actions.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-6 text-2xl font-black">Dispute Center</h2>

          {disputes.length > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  value={disputeQuery}
                  onChange={(event) =>
                    handleDisputeQueryChange(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-cyan-400/50"
                  placeholder="Search disputes"
                />
              </label>

              <label className="relative block">
                <SlidersHorizontal
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <select
                  value={disputeStatusFilter}
                  onChange={(event) =>
                    handleDisputeStatusFilterChange(event.target.value)
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-cyan-400/50"
                >
                  <option value="ALL">All</option>
                  {disputeStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {filteredDisputes.length === 0 ? (
            loadingPage ? (
              <LoadingState
                compact
                title="Loading disputes..."
                description="Scanning reports from active matches."
              />
            ) : (
              <EmptyState
                compact
                icon={ShieldAlert}
                title={disputes.length === 0 ? "No disputes yet" : "No disputes match"}
                description={
                  disputes.length === 0
                    ? "Open match reports will be routed here for review."
                    : "Try another keyword or status."
                }
              />
            )
          ) : (
            <div className="space-y-4">
              {pagedDisputes.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 rounded-3xl bg-black/30 p-5 xl:grid-cols-[1fr_120px_330px]"
                >
                  <div>
                    <p className="font-black">{item.reason}</p>

                    <p className="mt-1 text-sm text-white/50">
                      {item.description ?? "No description"}
                    </p>

                    <p className="mt-1 text-xs text-cyan-400">
                      Match: {item.matchId}
                    </p>

                    {item.match &&
                      item.match.pendingScoreA !== null &&
                      item.match.pendingScoreB !== null && (
                        <p className="mt-2 text-sm font-bold text-amber-200">
                          Pending score: {item.match.pendingScoreA} -{" "}
                          {item.match.pendingScoreB}
                        </p>
                      )}

                    {item.match?.evidences?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.match.evidences.slice(0, 4).map((evidence, index) => (
                          <a
                            key={evidence.id}
                            href={evidence.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-white/10"
                          >
                            Evidence {index + 1}
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {item.decision && (
                      <p className="mt-2 text-sm text-green-300">
                        Decision: {item.decision}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-white/50">Status</p>
                    <p className="font-bold text-cyan-300">{item.status}</p>
                  </div>

                  <div className="flex items-center">
                    {item.status === "OPEN" ? (
                      <div className="grid w-full gap-2 sm:grid-cols-3 xl:grid-cols-1">
                        <button
                          onClick={() =>
                            handleResolveDispute(
                              item.id,
                              "APPROVE_TEAM_A_RESULT",
                            )
                          }
                          disabled={loadingAction}
                          className="rounded-2xl bg-cyan-400 px-4 py-2 text-xs font-black text-black hover:bg-cyan-300 disabled:opacity-50"
                        >
                          Approve Team A
                        </button>
                        <button
                          onClick={() =>
                            handleResolveDispute(
                              item.id,
                              "APPROVE_TEAM_B_RESULT",
                            )
                          }
                          disabled={loadingAction}
                          className="rounded-2xl bg-violet-400 px-4 py-2 text-xs font-black text-black hover:bg-violet-300 disabled:opacity-50"
                        >
                          Approve Team B
                        </button>
                        <button
                          onClick={() =>
                            handleResolveDispute(item.id, "REMATCH")
                          }
                          disabled={loadingAction}
                          className="rounded-2xl bg-amber-300 px-4 py-2 text-xs font-black text-black hover:bg-amber-200 disabled:opacity-50"
                        >
                          Rematch
                        </button>
                      </div>
                    ) : (
                      <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white/50">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <Pagination
                page={currentDisputePage}
                pageSize={organizerPageSize}
                totalItems={filteredDisputes.length}
                onPageChange={setDisputePage}
              />
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-6 text-2xl font-black">Audit Logs</h2>

          {auditLogs.length === 0 ? (
            loadingPage ? (
              <LoadingState
                compact
                title="Loading audit logs..."
                description="Collecting recent organizer actions."
              />
            ) : (
              <EmptyState
                compact
                icon={Activity}
                title="No audit logs yet"
                description="Approvals, bracket changes and dispute decisions will be tracked here."
              />
            )
          ) : (
            <div className="space-y-4">
              {auditLogs.slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-3xl bg-black/30 p-5">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-black text-cyan-300">{item.action}</p>
                      <p className="mt-1 text-sm text-white/50">
                        {item.entityType} • {item.entityId}
                      </p>
                    </div>

                    <p className="text-sm text-white/40">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {item.metadata && (
                    <pre className="mt-3 overflow-x-auto rounded-2xl bg-black/40 p-3 text-xs text-white/60">
                      {item.metadata}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
