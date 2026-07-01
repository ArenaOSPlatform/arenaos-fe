import { type ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileImage,
  Flag,
  Gamepad2,
  Hash,
  ImagePlus,
  Loader2,
  LogIn,
  Medal,
  Play,
  Radio,
  ShieldAlert,
  ShieldX,
  Swords,
  Trophy,
  Upload,
  UploadCloud,
  Video,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getMatchEvidences,
  submitMatchEvidence,
} from "@/services/evidence.service";
import {
  checkInMatch,
  confirmMatchResult,
  disputeMatchResult,
  getMatchById,
  startMatch,
  submitMatchResult,
} from "@/services/match.service";
import { uploadFile } from "@/services/upload.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { BackButton } from "@/components/ui/BackButton";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";
import { connectSocket, socket } from "@/sockets/socket";
import { formatTournamentName } from "@/utils";

type Match = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
  pendingScoreA: number | null;
  pendingScoreB: number | null;
  resultStatus: string | null;
  resultSubmittedBy: string | null;
  resultSubmittedTeamId: string | null;
  resultSubmittedAt: string | null;
  resultEvidenceId: string | null;
  status: string;
  teamACheckedInAt: string | null;
  teamBCheckedInAt: string | null;
  teamACheckedInBy: string | null;
  teamBCheckedInBy: string | null;
  scheduledAt: string | null;
  livestreamUrl: string | null;
  roomCode: string | null;
  bestOf: string | null;
  teamA: MatchTeam | null;
  teamB: MatchTeam | null;
  winnerTeam: MatchTeam | null;
  tournament: {
    name: string;
    game: string;
    format: string;
  };
};

type MatchTeam = {
  id: string;
  name: string;
  logoUrl: string | null;
};

type Evidence = {
  id: string;
  imageUrl: string;
  note: string | null;
  submittedBy: string;
  createdAt: string;
};

type StatusMeta = {
  label: string;
  icon: LucideIcon;
  pill: string;
  panel: string;
};

const statusMeta: Record<string, StatusMeta> = {
  PENDING_SCHEDULE: {
    label: "Pending schedule",
    icon: CalendarClock,
    pill: "border-white/15 bg-white/8 text-slate-200",
    panel: "border-white/10 bg-white/[0.045]",
  },
  SCHEDULED: {
    label: "Scheduled",
    icon: CalendarClock,
    pill: "border-cyan-300/25 bg-cyan-300/12 text-cyan-100",
    panel: "border-cyan-300/20 bg-cyan-300/[0.045]",
  },
  READY: {
    label: "Ready",
    icon: CheckCircle2,
    pill: "border-emerald-300/25 bg-emerald-300/12 text-emerald-100",
    panel: "border-emerald-300/20 bg-emerald-300/[0.045]",
  },
  CHECK_IN_OPEN: {
    label: "Check-in open",
    icon: Clock3,
    pill: "border-amber-300/25 bg-amber-300/12 text-amber-100",
    panel: "border-amber-300/20 bg-amber-300/[0.045]",
  },
  LIVE: {
    label: "Live",
    icon: Radio,
    pill: "border-red-300/25 bg-red-300/12 text-red-100",
    panel: "border-red-300/20 bg-red-300/[0.045]",
  },
  IN_PROGRESS: {
    label: "Live",
    icon: Radio,
    pill: "border-red-300/25 bg-red-300/12 text-red-100",
    panel: "border-red-300/20 bg-red-300/[0.045]",
  },
  PENDING_CONFIRMATION: {
    label: "Pending",
    icon: Clock3,
    pill: "border-amber-300/25 bg-amber-300/12 text-amber-100",
    panel: "border-amber-300/20 bg-amber-300/[0.045]",
  },
  WAITING_CONFIRMATION: {
    label: "Pending",
    icon: Clock3,
    pill: "border-amber-300/25 bg-amber-300/12 text-amber-100",
    panel: "border-amber-300/20 bg-amber-300/[0.045]",
  },
  DISPUTED: {
    label: "Disputed",
    icon: ShieldAlert,
    pill: "border-red-300/25 bg-red-300/12 text-red-100",
    panel: "border-red-300/20 bg-red-300/[0.045]",
  },
  COMPLETED: {
    label: "Completed",
    icon: Medal,
    pill: "border-emerald-300/25 bg-emerald-300/12 text-emerald-100",
    panel: "border-emerald-300/20 bg-emerald-300/[0.045]",
  },
};

const fallbackStatusMeta: StatusMeta = {
  label: "Match",
  icon: Swords,
  pill: "border-white/15 bg-white/8 text-slate-200",
  panel: "border-white/10 bg-white/[0.045]",
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

function getApiErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { status?: unknown } }).response;

    return typeof response?.status === "number" ? response.status : null;
  }

  return null;
}

function getBestOfValue(bestOf?: string | null) {
  const normalized = (bestOf ?? "BO1").trim().toUpperCase();
  const match = normalized.match(/^BO([135])$/);
  return match ? Number(match[1]) : 1;
}

function formatValidScores(winsRequired: number) {
  return Array.from({ length: winsRequired }, (_, loserScore) => {
    return `${winsRequired}-${loserScore}`;
  }).join(", ");
}

function getScoreValidationMessage(
  bestOf: string | null | undefined,
  scoreA: number,
  scoreB: number,
) {
  const bestOfValue = getBestOfValue(bestOf);
  const winsRequired = Math.floor(bestOfValue / 2) + 1;
  const winnerScore = Math.max(scoreA, scoreB);
  const loserScore = Math.min(scoreA, scoreB);

  if (scoreA === scoreB) return "Draw result is not allowed.";

  if (winnerScore !== winsRequired || loserScore >= winsRequired) {
    return `BO${bestOfValue} result must be one of: ${formatValidScores(
      winsRequired,
    )}.`;
  }

  return null;
}

function getStatusMeta(value: string) {
  return statusMeta[value] ?? fallbackStatusMeta;
}

function isLiveStatus(status: string) {
  return status === "LIVE" || status === "IN_PROGRESS";
}

function isWaitingConfirmationStatus(status: string) {
  return status === "WAITING_CONFIRMATION" || status === "PENDING_CONFIRMATION";
}

function formatDate(value?: string | null) {
  if (!value) return "TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "T"
  );
}

function StatusPill({ value }: { value: string }) {
  const meta = getStatusMeta(value);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${meta.pill}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function InfoTile({
  icon: Icon,
  label,
  children,
  tone = "border-white/10 bg-black/20 text-slate-300",
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <Icon className="mb-3 size-5 text-cyan-200" aria-hidden="true" />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 text-sm font-black leading-6 text-white">
        {children}
      </div>
    </div>
  );
}

function TeamScoreCard({
  name,
  label,
  score,
  checkedIn,
  logoUrl,
  tone,
}: {
  name: string;
  label: string;
  score: number;
  checkedIn: boolean;
  logoUrl: string | null | undefined;
  tone: "cyan" | "violet";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-300/25 bg-cyan-300/[0.075] text-cyan-100"
      : "border-violet-300/25 bg-violet-300/[0.075] text-violet-100";
  const scoreClass = tone === "cyan" ? "text-cyan-200" : "text-violet-200";

  return (
    <article
      className={`rounded-[1.75rem] border p-5 text-center shadow-[0_18px_70px_rgba(0,0,0,0.22)] ${toneClass}`}
    >
      <div className="mx-auto flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20 text-xl font-black">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          getInitials(name)
        )}
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <h2 className="mt-2 line-clamp-2 min-h-16 text-3xl font-black leading-tight text-white">
        {name}
      </h2>
      <span
        className={[
          "mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em]",
          checkedIn
            ? "border-emerald-300/25 bg-emerald-300/12 text-emerald-100"
            : "border-white/10 bg-white/8 text-slate-400",
        ].join(" ")}
      >
        {checkedIn ? "Checked in" : "Waiting"}
      </span>
      <p className={`mt-6 text-7xl font-black leading-none ${scoreClass}`}>
        {score}
      </p>
    </article>
  );
}

function FileInput({
  label,
  tone,
  onChange,
}: {
  label: string;
  tone: "cyan" | "red";
  onChange: (file: File | null) => void;
}) {
  const fileTone =
    tone === "cyan"
      ? "file:bg-cyan-300 file:text-slate-950"
      : "file:bg-red-300 file:text-slate-950";

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-300">
        {label}
      </span>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className={`w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm text-slate-300 outline-none file:mr-4 file:rounded-xl file:border-0 file:px-3 file:py-2 file:font-black ${fileTone}`}
      />
    </label>
  );
}

export function MatchRoomPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [match, setMatch] = useState<Match | null>(null);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [disputeEvidenceNote, setDisputeEvidenceNote] = useState("");
  const [resultEvidenceFile, setResultEvidenceFile] = useState<File | null>(
    null,
  );
  const [disputeEvidenceFile, setDisputeEvidenceFile] = useState<File | null>(
    null,
  );
  const [archiveEvidenceFile, setArchiveEvidenceFile] = useState<File | null>(
    null,
  );
  const [archiveEvidenceNote, setArchiveEvidenceNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [pageError, setPageError] = useState("");
  const [pageErrorStatus, setPageErrorStatus] = useState<number | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function loadMatch(matchId: string) {
    const [matchRes, evidenceRes] = await Promise.all([
      getMatchById(matchId),
      getMatchEvidences(matchId),
    ]);

    setMatch(matchRes.data);
    setEvidences(evidenceRes.data);
    setScoreA(String(matchRes.data.pendingScoreA ?? matchRes.data.scoreA));
    setScoreB(String(matchRes.data.pendingScoreB ?? matchRes.data.scoreB));
  }

  useEffect(() => {
    if (!id) return;
    const matchId = id;
    let cancelled = false;

    async function fetchMatch() {
      try {
        setPageError("");
        setPageErrorStatus(null);
        await loadMatch(matchId);
      } catch (err) {
        if (!cancelled) {
          setPageErrorStatus(getApiErrorStatus(err));
          setPageError(getApiErrorMessage(err, "Match not found."));
        }
      }
    }

    void fetchMatch();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    if (!connectSocket()) return;

    socket.emit("join:match", id);

    const refreshMatch = () => {
      void loadMatch(id);
    };

    socket.on("match:scheduled", refreshMatch);
    socket.on("match:checkin_updated", refreshMatch);
    socket.on("match:live", refreshMatch);
    socket.on("match:score_submitted", refreshMatch);
    socket.on("match:completed", refreshMatch);
    socket.on("match:disputed", refreshMatch);

    return () => {
      socket.off("match:scheduled", refreshMatch);
      socket.off("match:checkin_updated", refreshMatch);
      socket.off("match:live", refreshMatch);
      socket.off("match:score_submitted", refreshMatch);
      socket.off("match:completed", refreshMatch);
      socket.off("match:disputed", refreshMatch);
    };
  }, [id]);

  const matchLoadError =
    pageErrorStatus === 401
      ? {
          title: "Login required",
          description:
            "Sign in with an account assigned to this match to open the room and evidence archive.",
          icon: LogIn,
          action: (
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
            >
              <LogIn className="size-4" aria-hidden="true" />
              Login
            </Link>
          ),
        }
      : pageErrorStatus === 403
        ? {
            title: "Access denied",
            description:
              "Only assigned team members, the organizer, or an admin can access this match room.",
            icon: ShieldX,
            action: (
              <Link
                to="/tournaments"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-cyan-100 transition hover:bg-white/[0.1]"
              >
                <Trophy className="size-4" aria-hidden="true" />
                Browse tournaments
              </Link>
            ),
          }
        : {
            title: "Match unavailable",
            description: pageError,
            icon: AlertTriangle,
            action: null,
          };

  async function handleSubmitResult() {
    if (!id || !match) return;

    if (scoreA === "" || scoreB === "") {
      toast.warning("Enter both team scores before submitting.");
      return;
    }

    const nextScoreA = Number(scoreA);
    const nextScoreB = Number(scoreB);

    if (
      !Number.isInteger(nextScoreA) ||
      !Number.isInteger(nextScoreB) ||
      nextScoreA < 0 ||
      nextScoreB < 0
    ) {
      toast.warning("Scores must be whole numbers.");
      return;
    }

    const scoreValidationMessage = getScoreValidationMessage(
      match.bestOf,
      nextScoreA,
      nextScoreB,
    );

    if (scoreValidationMessage) {
      toast.warning(scoreValidationMessage);
      return;
    }

    if (!resultEvidenceFile) {
      toast.warning("Choose an evidence image before submitting result.");
      return;
    }

    const confirmed = await confirm({
      title: "Submit result for confirmation?",
      description: `Send ${scoreA || "0"} - ${scoreB || "0"} to the opposing captain for confirmation.`,
      confirmText: "Submit result",
      tone: "warning",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("score");
      const evidenceUrl = (await uploadFile(resultEvidenceFile)).data.url;

      const res = await submitMatchResult(id, {
        scoreA: nextScoreA,
        scoreB: nextScoreB,
        imageUrl: evidenceUrl,
        note: evidenceNote || undefined,
      });

      toast.success(res.message);
      setResultEvidenceFile(null);
      setEvidenceNote("");
      await loadMatch(id);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Submit result failed. Only a match captain can submit results.",
        ),
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUploadEvidence() {
    if (!id) return;

    if (!archiveEvidenceFile) {
      toast.warning("Choose an evidence image before uploading.");
      return;
    }

    try {
      setLoadingAction("upload-evidence");
      const evidenceUrl = (await uploadFile(archiveEvidenceFile)).data.url;

      const res = await submitMatchEvidence(id, {
        imageUrl: evidenceUrl,
        note: archiveEvidenceNote.trim() || undefined,
      });

      toast.success(res.message);
      setArchiveEvidenceFile(null);
      setArchiveEvidenceNote("");
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload evidence failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleConfirmResult() {
    if (!id || !match) return;

    const confirmed = await confirm({
      title: "Confirm match result?",
      description: `Confirm ${match.pendingScoreA ?? 0} - ${match.pendingScoreB ?? 0}. This will complete the match.`,
      confirmText: "Confirm result",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("confirm-result");
      const res = await confirmMatchResult(id);
      toast.success(res.message);
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Confirm result failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCheckIn() {
    if (!id) return;

    const confirmed = await confirm({
      title: "Check in for match?",
      description:
        "Only the captain of Team A or Team B can check in for this match.",
      confirmText: "Check in",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("check-in");
      const res = await checkInMatch(id);
      toast.success(res.message);
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Check-in failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleStartMatch() {
    if (!id) return;

    const confirmed = await confirm({
      title: "Start match?",
      description:
        "Both captains have checked in. Starting the match will notify both teams.",
      confirmText: "Start match",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("start");
      const res = await startMatch(id);
      toast.success(res.message);
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Start match failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDisputeResult() {
    if (!id) return;

    if (!disputeReason.trim()) {
      toast.warning("Add a dispute reason before submitting.");
      return;
    }

    const confirmed = await confirm({
      title: "Dispute submitted result?",
      description: "Send this pending result to the organizer for review.",
      confirmText: "Dispute result",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("dispute");
      const disputeEvidenceUrl = disputeEvidenceFile
        ? (await uploadFile(disputeEvidenceFile)).data.url
        : undefined;

      const res = await disputeMatchResult(id, {
        reason: disputeReason,
        imageUrl: disputeEvidenceUrl,
        note: disputeEvidenceNote || undefined,
      });

      toast.success(res.message);
      setDisputeReason("");
      setDisputeEvidenceFile(null);
      setDisputeEvidenceNote("");
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Dispute result failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <BackButton fallbackTo="/tournaments" label="Back" />
          {pageError ? (
            <ErrorState
              icon={matchLoadError.icon}
              title={matchLoadError.title}
              description={matchLoadError.description}
              action={matchLoadError.action}
            />
          ) : (
            <LoadingState
              title="Loading match..."
              description="Fetching scoreboard, evidence and match room details."
            />
          )}
        </div>
      </div>
    );
  }

  const isPendingConfirmation =
    isWaitingConfirmationStatus(match.status) ||
    match.resultStatus === "PENDING_CONFIRMATION";
  const pendingEvidence = evidences.find(
    (item) => item.id === match.resultEvidenceId,
  );
  const resultSubmittedSlot =
    match.resultSubmittedTeamId === match.teamAId
      ? (match.teamA?.name ?? "Team A")
      : match.resultSubmittedTeamId === match.teamBId
        ? (match.teamB?.name ?? "Team B")
        : "Unknown team";
  const teamAName = formatTournamentName(match.teamA?.name ?? match.teamAId ?? "TBD");
  const teamBName = formatTournamentName(match.teamB?.name ?? match.teamBId ?? "TBD");
  const winnerName = formatTournamentName(match.winnerTeam?.name ?? match.winnerId ?? "TBD");
  const meta = getStatusMeta(match.status);
  const StatusIcon = meta.icon;
  const checkInDisabled =
    loadingAction === "check-in" ||
    match.status === "READY" ||
    isLiveStatus(match.status) ||
    isWaitingConfirmationStatus(match.status) ||
    match.status === "DISPUTED" ||
    match.status === "COMPLETED" ||
    match.status === "CANCELLED";
  const canStart = match.status === "READY";

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <BackButton fallbackTo="/tournaments" label="Back" />

        <header
          className={`rounded-[2rem] border p-5 shadow-[0_24px_100px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-6 ${meta.panel}`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                  <Swords className="size-4" aria-hidden="true" />
                  Match Room
                </span>
                <StatusPill value={match.status} />
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl">
                {teamAName} <span className="text-slate-500">vs</span>{" "}
                {teamBName}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <Trophy className="size-4 text-amber-200" />
                  {formatTournamentName(match.tournament.name)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Gamepad2 className="size-4 text-cyan-200" />
                  {match.tournament.game}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Hash className="size-4 text-cyan-200" />
                  Round {match.roundNumber}, Match {match.matchNumber}
                </span>
              </p>
            </div>

            <div className="flex min-w-60 items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <span
                className={`inline-flex size-12 items-center justify-center rounded-2xl border ${meta.pill}`}
              >
                <StatusIcon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Match state
                </p>
                <p className="mt-1 font-black text-white">{meta.label}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
          <main className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Scoreboard
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Scores finalize after captain confirmation.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-black text-cyan-100">
                  <Wifi className="size-4" aria-hidden="true" />
                  Realtime Match
                </div>
              </div>

              <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_88px_1fr]">
                <TeamScoreCard
                  name={teamAName}
                  label="Team A"
                  score={match.scoreA}
                  checkedIn={Boolean(match.teamACheckedInAt)}
                  logoUrl={match.teamA?.logoUrl}
                  tone="cyan"
                />

                <div className="flex items-center justify-center">
                  <span className="inline-flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-xl font-black text-slate-500">
                    VS
                  </span>
                </div>

                <TeamScoreCard
                  name={teamBName}
                  label="Team B"
                  score={match.scoreB}
                  checkedIn={Boolean(match.teamBCheckedInAt)}
                  logoUrl={match.teamB?.logoUrl}
                  tone="violet"
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <InfoTile icon={CalendarClock} label="Scheduled">
                  {formatDate(match.scheduledAt)}
                </InfoTile>

                <InfoTile icon={Video} label="Stream">
                  {isLiveStatus(match.status) && match.livestreamUrl ? (
                    <a
                      href={match.livestreamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-red-100 transition hover:text-white"
                    >
                      Watch Live
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  ) : (
                    (match.livestreamUrl ?? "TBA")
                  )}
                </InfoTile>

                <InfoTile icon={Radio} label="Room Code">
                  {match.roomCode ?? "TBA"}
                </InfoTile>

                <InfoTile icon={Swords} label="Format">
                  {match.bestOf ?? "BO1"}
                </InfoTile>

                <InfoTile icon={Medal} label="Winner">
                  {winnerName}
                </InfoTile>
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.055] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    Captain Check-in
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Match becomes READY after both captains check in, then the
                    organizer can start live play.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={checkInDisabled}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loadingAction === "check-in" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Check in
                  </button>

                  <button
                    type="button"
                    onClick={handleStartMatch}
                    disabled={loadingAction === "start" || !canStart}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loadingAction === "start" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    Start Match
                  </button>
                </div>
              </div>
            </section>

            {isPendingConfirmation && (
              <section className="rounded-[2rem] border border-amber-300/25 bg-amber-300/[0.075] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Clock3 className="mb-4 size-6 text-amber-200" />
                    <h2 className="text-2xl font-black text-white">
                      Pending Confirmation
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Submitted by {resultSubmittedSlot}. Confirm to complete
                      the match or dispute for organizer review.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Pending score
                    </p>
                    <p className="mt-2 text-5xl font-black text-amber-100">
                      {match.pendingScoreA ?? 0} - {match.pendingScoreB ?? 0}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(match.resultSubmittedAt)}
                    </p>
                  </div>
                </div>

                {pendingEvidence && (
                  <a
                    href={pendingEvidence.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-cyan-100 transition hover:bg-white/[0.1]"
                  >
                    <FileImage className="size-4" />
                    View Submitted Evidence
                  </a>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleConfirmResult}
                    disabled={loadingAction === "confirm-result"}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loadingAction === "confirm-result" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Confirm Result
                  </button>

                  <button
                    type="button"
                    onClick={handleDisputeResult}
                    disabled={loadingAction === "dispute"}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loadingAction === "dispute" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="size-4" />
                    )}
                    Dispute
                  </button>
                </div>
              </section>
            )}
          </main>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
              <h2 className="flex items-center gap-3 text-2xl font-black text-white">
                <Flag className="size-6 text-cyan-200" />
                Submit Result
              </h2>

              {isLiveStatus(match.status) ? (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Team A
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={scoreA}
                        onChange={(event) => setScoreA(event.target.value)}
                        className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm font-black text-white outline-none focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10"
                        placeholder="0"
                      />
                    </label>
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Team B
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={scoreB}
                        onChange={(event) => setScoreB(event.target.value)}
                        className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm font-black text-white outline-none focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10"
                        placeholder="0"
                      />
                    </label>
                  </div>

                  <FileInput
                    label="Result evidence"
                    tone="cyan"
                    onChange={setResultEvidenceFile}
                  />

                  <input
                    value={evidenceNote}
                    onChange={(event) => setEvidenceNote(event.target.value)}
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10"
                    placeholder="Evidence note"
                  />

                  <button
                    type="button"
                    onClick={handleSubmitResult}
                    disabled={loadingAction === "score"}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loadingAction === "score" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UploadCloud className="size-4" />
                    )}
                    Submit for Confirmation
                  </button>
                </div>
              ) : (
                <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                  Result submission opens when the match is live.
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
              <h2 className="flex items-center gap-3 text-2xl font-black text-white">
                <ImagePlus className="size-6 text-cyan-200" />
                Evidence Archive
              </h2>

              <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.055] p-4">
                <p className="font-black text-white">Upload Evidence</p>
                <div className="mt-3 space-y-3">
                  <FileInput
                    label="Evidence image"
                    tone="cyan"
                    onChange={setArchiveEvidenceFile}
                  />
                  <input
                    value={archiveEvidenceNote}
                    onChange={(event) =>
                      setArchiveEvidenceNote(event.target.value)
                    }
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10"
                    placeholder="Evidence note"
                  />
                  <button
                    type="button"
                    onClick={handleUploadEvidence}
                    disabled={loadingAction === "upload-evidence"}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingAction === "upload-evidence" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    Upload Evidence
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {evidences.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Upload}
                    title="No evidence uploaded"
                    description="Screenshots and supporting notes will appear here."
                  />
                ) : (
                  evidences.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <a
                        href={item.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 font-black text-cyan-100 transition hover:text-white"
                      >
                        <FileImage className="size-4" />
                        Evidence image
                        <ExternalLink className="size-4" />
                      </a>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {item.note ?? "No note"} by {item.submittedBy}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatDate(item.createdAt)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-red-300/20 bg-red-300/[0.055] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
              <h2 className="flex items-center gap-3 text-2xl font-black text-white">
                <ShieldAlert className="size-6 text-red-200" />
                Dispute Center
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Disputes are only available while a submitted result is waiting
                for confirmation.
              </p>

              <input
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
                className="mt-5 h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-200/50 focus:ring-4 focus:ring-red-300/10"
                placeholder="Dispute reason"
              />

              {isPendingConfirmation && (
                <div className="mt-3 space-y-3">
                  <FileInput
                    label="Dispute evidence"
                    tone="red"
                    onChange={setDisputeEvidenceFile}
                  />
                  <input
                    value={disputeEvidenceNote}
                    onChange={(event) =>
                      setDisputeEvidenceNote(event.target.value)
                    }
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-200/50 focus:ring-4 focus:ring-red-300/10"
                    placeholder="Evidence note"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleDisputeResult}
                disabled={loadingAction === "dispute" || !isPendingConfirmation}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loadingAction === "dispute" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <AlertTriangle className="size-4" />
                )}
                Dispute Pending Result
              </button>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
