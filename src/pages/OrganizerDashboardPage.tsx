import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  GitBranch,
  ImagePlus,
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
  X,
} from "lucide-react";
import {
  approveRegistration,
  closeTournamentRegistration,
  createTournamentAnnouncement,
  createTournament,
  generateBracket,
  getMyTournaments,
  getTournamentAnnouncements,
  getTournamentBracket,
  getTournamentRegistrations,
  rejectRegistration,
  submitTournamentApproval,
  type AnnouncementDelivery,
  type AnnouncementType,
  type TournamentAnnouncement,
} from "@/services/tournament.service";
import { scheduleMatch, updateMatchLivestream } from "@/services/match.service";
import { getDisputes, resolveDispute } from "@/services/dispute.service";
import { getAuditLogs } from "@/services/audit-log.service";
import { uploadFile } from "@/services/upload.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";
import { getTotalPages, paginateItems } from "@/utils/paginationUtils";

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

function textMatches(
  values: Array<string | number | null | undefined>,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function filterMatches(
  values: Array<string | null | undefined>,
  filter: string,
) {
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
      "READY",
      "LIVE",
      "IN_PROGRESS",
      "ONGOING",
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

  if (["REJECTED", "DISPUTED", "OPEN", "CANCELLED"].includes(status)) {
    return "red";
  }

  if (["BRACKET_GENERATED", "REGISTRATION_CLOSED", "LOCKED"].includes(status)) {
    return "violet";
  }

  return "cyan";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";

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

function MetricCard({
  icon,
  label,
  value,
  helper,
  tone,
  barPercent,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone: Tone;
  barPercent?: number;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="font-display mt-3 text-4xl font-black leading-none text-white">
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
      {barPercent !== undefined && (
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/25">
          <div
            className={[
              "h-full rounded-full transition-all duration-1000",
              tone === "cyan"
                ? "bg-gradient-to-r from-cyan-400 to-sky-300"
                : tone === "emerald"
                  ? "bg-gradient-to-r from-emerald-400 to-green-300"
                  : tone === "amber"
                    ? "bg-gradient-to-r from-amber-400 to-yellow-300"
                    : tone === "red"
                      ? "bg-gradient-to-r from-red-400 to-rose-300"
                      : "bg-gradient-to-r from-violet-400 to-purple-300",
            ].join(" ")}
            style={{ width: `${Math.max(4, Math.min(100, barPercent))}%` }}
          />
        </div>
      )}
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
  bestOf: string | null;
  note: string | null;
};

type MatchScheduleForm = {
  scheduledAt: string;
  roomCode: string;
  livestreamUrl: string;
  bestOf: string;
  note: string;
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

type CreateTournamentForm = {
  name: string;
  game: string;
  maxTeams: string;
  teamSize: string;
  format: string;
  region: string;
  description: string;
  prizePool: string;
  rules: string;
  livestreamUrl: string;
  startDate: string;
  registrationDeadline: string;
  bannerFile: File | null;
};

function getDefaultCreateTournamentForm(): CreateTournamentForm {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return {
    name: "",
    game: "",
    maxTeams: "4",
    teamSize: "5",
    format: "SINGLE_ELIMINATION",
    region: "Global",
    description: "",
    prizePool: "",
    rules: "",
    livestreamUrl: "",
    startDate: toDateTimeLocal(new Date(now + 7 * day).toISOString()),
    registrationDeadline: toDateTimeLocal(
      new Date(now + 3 * day).toISOString(),
    ),
    bannerFile: null,
  };
}

const modalInputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50";

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ModalShell({
  title,
  eyebrow,
  icon,
  children,
  onClose,
  maxWidth = "max-w-3xl",
}: {
  title: string;
  eyebrow: string;
  icon: ReactNode;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6"
      role="presentation"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-xl"
      />

      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={
          shouldReduceMotion
            ? false
            : { opacity: 0, y: 22, scale: 0.96, filter: "blur(10px)" }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
        }
        exit={
          shouldReduceMotion
            ? undefined
            : { opacity: 0, y: 14, scale: 0.97, filter: "blur(8px)" }
        }
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={`relative max-h-[92vh] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a]/95 shadow-[0_32px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl ${maxWidth}`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-200/70 to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                {eyebrow}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            aria-label="Close dialog"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="relative max-h-[calc(92vh-92px)] overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </motion.section>
    </motion.div>
  );
}

function CreateTournamentModal({
  form,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  form: CreateTournamentForm;
  loading: boolean;
  onChange: (form: CreateTournamentForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function update<K extends keyof CreateTournamentForm>(
    field: K,
    value: CreateTournamentForm[K],
  ) {
    onChange({ ...form, [field]: value });
  }

  return (
    <ModalShell
      title="Create Tournament"
      eyebrow="New event"
      icon={<Plus className="size-6" />}
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Tournament name">
            <input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              className={modalInputClass}
              placeholder="ArenaOS Invitational"
              autoFocus
            />
          </FormField>

          <FormField label="Game">
            <input
              value={form.game}
              onChange={(event) => update("game", event.target.value)}
              className={modalInputClass}
              placeholder="Valorant"
            />
          </FormField>

          <FormField label="Max teams">
            <input
              type="number"
              min={2}
              value={form.maxTeams}
              onChange={(event) => update("maxTeams", event.target.value)}
              className={modalInputClass}
            />
          </FormField>

          <FormField label="Team size">
            <input
              type="number"
              min={1}
              value={form.teamSize}
              onChange={(event) => update("teamSize", event.target.value)}
              className={modalInputClass}
            />
          </FormField>

          <FormField label="Format">
            <select
              value={form.format}
              onChange={(event) => update("format", event.target.value)}
              className={modalInputClass}
            >
              <option value="SINGLE_ELIMINATION">Single elimination</option>
              <option value="DOUBLE_ELIMINATION">Double elimination</option>
              <option value="ROUND_ROBIN">Round robin</option>
            </select>
          </FormField>

          <FormField label="Region">
            <input
              value={form.region}
              onChange={(event) => update("region", event.target.value)}
              className={modalInputClass}
              placeholder="Global"
            />
          </FormField>

          <FormField label="Start date">
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(event) => update("startDate", event.target.value)}
              className={modalInputClass}
            />
          </FormField>

          <FormField label="Registration deadline">
            <input
              type="datetime-local"
              value={form.registrationDeadline}
              onChange={(event) =>
                update("registrationDeadline", event.target.value)
              }
              className={modalInputClass}
            />
          </FormField>

          <FormField label="Prize pool">
            <input
              value={form.prizePool}
              onChange={(event) => update("prizePool", event.target.value)}
              className={modalInputClass}
              placeholder="$1,000"
            />
          </FormField>

          <FormField label="Livestream">
            <input
              value={form.livestreamUrl}
              onChange={(event) => update("livestreamUrl", event.target.value)}
              className={modalInputClass}
              placeholder="https://..."
            />
          </FormField>
        </div>

        <FormField label="Banner image">
          <label className="mt-2 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/[0.055] px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/10">
            <span className="flex min-w-0 items-center gap-3">
              <ImagePlus className="size-5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {form.bannerFile?.name ?? "Select banner image"}
              </span>
            </span>
            <span className="rounded-xl bg-cyan-300 px-3 py-1.5 text-xs text-slate-950">
              Browse
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) =>
                update("bannerFile", event.target.files?.[0] ?? null)
              }
            />
          </label>
        </FormField>

        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className={`${modalInputClass} min-h-24 resize-none font-medium leading-6`}
            placeholder="Tournament overview"
          />
        </FormField>

        <FormField label="Rules">
          <textarea
            value={form.rules}
            onChange={(event) => update("rules", event.target.value)}
            className={`${modalInputClass} min-h-24 resize-none font-medium leading-6`}
            placeholder="Match rules, check-in policy, dispute policy"
          />
        </FormField>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-slate-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.2)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create Tournament
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function RejectRegistrationModal({
  teamName,
  reason,
  loading,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  teamName: string;
  reason: string;
  loading: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <ModalShell
      title="Reject Registration"
      eyebrow={teamName}
      icon={<ShieldAlert className="size-6" />}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <FormField label="Reason">
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            className={`${modalInputClass} min-h-32 resize-none font-medium leading-6 focus:border-red-300/60 focus:ring-red-300/10`}
            placeholder="Lineup invalid, missing info, or other review note"
            autoFocus
          />
        </FormField>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-slate-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(252,165,165,0.2)] transition hover:-translate-y-0.5 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldAlert className="size-4" />
            )}
            Reject Registration
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function OrganizerDashboardPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [matches, setMatches] = useState<OrganizerMatch[]>([]);
  const [bracketStatus, setBracketStatus] = useState<string | null>(null);
  const [scheduleForms, setScheduleForms] = useState<
    Record<string, MatchScheduleForm>
  >({});
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false);
  const [createTournamentForm, setCreateTournamentForm] =
    useState<CreateTournamentForm>(() => getDefaultCreateTournamentForm());
  const [rejectRegistrationTarget, setRejectRegistrationTarget] =
    useState<Registration | null>(null);
  const [rejectReason, setRejectReason] = useState("");
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
  const [announcements, setAnnouncements] = useState<TournamentAnnouncement[]>(
    [],
  );
  const [announcementDelivery, setAnnouncementDelivery] =
    useState<AnnouncementDelivery | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tournamentQuery, setTournamentQuery] = useState("");
  const [tournamentStatusFilter, setTournamentStatusFilter] = useState("ALL");
  const [tournamentPage, setTournamentPage] = useState(1);
  const [registrationQuery, setRegistrationQuery] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] =
    useState("ALL");
  const [registrationPage, setRegistrationPage] = useState(1);
  const [matchQuery, setMatchQuery] = useState("");
  const [matchStatusFilter, setMatchStatusFilter] = useState("ALL");
  const [matchPage, setMatchPage] = useState(1);
  const [disputeQuery, setDisputeQuery] = useState("");
  const [disputeStatusFilter, setDisputeStatusFilter] = useState("ALL");
  const [disputePage, setDisputePage] = useState(1);

  const loadRegistrations = useCallback(async (tournamentId: string) => {
    const res = await getTournamentRegistrations(tournamentId);
    setRegistrations(res.data);
  }, []);

  const loadMatches = useCallback(async (tournamentId: string) => {
    try {
      const res = await getTournamentBracket(tournamentId);
      const list = res.data.matches as OrganizerMatch[];

      setMatches(list);
      setBracketStatus(typeof res.data.status === "string" ? res.data.status : null);
      setScheduleForms(() => {
        const next: Record<string, MatchScheduleForm> = {};

        list.forEach((match) => {
          next[match.id] = {
            scheduledAt: toDateTimeLocal(match.scheduledAt),
            roomCode: match.roomCode ?? "",
            livestreamUrl: match.livestreamUrl ?? "",
            bestOf: match.bestOf ?? "BO1",
            note: match.note ?? "",
          };
        });

        return next;
      });
    } catch {
      setMatches([]);
      setBracketStatus(null);
      setScheduleForms({});
    }
  }, []);

  const loadAnnouncements = useCallback(async (tournamentId: string) => {
    const res = await getTournamentAnnouncements(tournamentId);
    setAnnouncements(res.data);
    setAnnouncementDelivery(null);
  }, []);

  const loadDisputes = useCallback(async () => {
    const res = await getDisputes();
    setDisputes(res.data);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    const res = await getAuditLogs();
    setAuditLogs(res.data);
  }, []);

  const loadTournaments = useCallback(
    async (keepSelectedId?: string) => {
      const res = await getMyTournaments();
      const list = res.data as Tournament[];

      setTournaments(list);

      const nextSelected =
        list.find((item) => item.id === keepSelectedId) ?? list[0] ?? null;

      setSelectedTournament(nextSelected);

      if (nextSelected) {
        await loadRegistrations(nextSelected.id);
        await loadMatches(nextSelected.id);
        await loadAnnouncements(nextSelected.id);
      } else {
        setRegistrations([]);
        setMatches([]);
        setAnnouncements([]);
      }
    },
    [loadAnnouncements, loadMatches, loadRegistrations],
  );

  async function handleSelectTournament(tournament: Tournament) {
    setSelectedTournament(tournament);

    try {
      await loadRegistrations(tournament.id);
      await loadMatches(tournament.id);
      await loadAnnouncements(tournament.id);
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

    const registration = registrations.find(
      (item) => item.id === registrationId,
    );
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

  function handleReject(registrationId: string) {
    if (!selectedTournament) return;

    if (selectedTournament.status === "COMPLETED") {
      toast.warning("Tournament is completed and archived.");
      return;
    }

    const registration = registrations.find(
      (item) => item.id === registrationId,
    );

    if (!registration) {
      toast.error("Registration not found.");
      return;
    }

    setRejectReason("");
    setRejectRegistrationTarget(registration);
  }

  async function handleRejectRegistrationSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!selectedTournament || !rejectRegistrationTarget) return;

    try {
      setLoadingAction(true);

      await rejectRegistration(rejectRegistrationTarget.id, rejectReason.trim());
      await loadRegistrations(selectedTournament.id);

      toast.success("Registration rejected successfully");
      setRejectRegistrationTarget(null);
      setRejectReason("");
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

  function handleCreateTournament() {
    setCreateTournamentForm(getDefaultCreateTournamentForm());
    setCreateTournamentOpen(true);
  }

  async function handleCreateTournamentSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const name = createTournamentForm.name.trim();
    const game = createTournamentForm.game.trim();
    const format = createTournamentForm.format.trim();
    const maxTeams = Number(createTournamentForm.maxTeams);
    const teamSize = Number(createTournamentForm.teamSize);
    const startDate = new Date(createTournamentForm.startDate);
    const registrationDeadline = new Date(
      createTournamentForm.registrationDeadline,
    );
    const livestreamUrl = createTournamentForm.livestreamUrl.trim();

    if (!name || !game) {
      toast.warning("Tournament name and game are required.");
      return;
    }

    if (!Number.isInteger(maxTeams) || maxTeams < 2) {
      toast.warning("Max teams must be at least 2.");
      return;
    }

    if (!Number.isInteger(teamSize) || teamSize < 1) {
      toast.warning("Team size must be at least 1.");
      return;
    }

    if (!format) {
      toast.warning("Tournament format is required.");
      return;
    }

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(registrationDeadline.getTime())
    ) {
      toast.warning("Choose valid dates before creating the tournament.");
      return;
    }

    if (!isFutureDate(startDate)) {
      toast.warning("Start date must be in the future.");
      return;
    }

    if (!isFutureDate(registrationDeadline)) {
      toast.warning("Registration deadline must be in the future.");
      return;
    }

    if (registrationDeadline.getTime() >= startDate.getTime()) {
      toast.warning("Registration deadline must be before start date.");
      return;
    }

    if (livestreamUrl && !isValidLivestreamUrl(livestreamUrl)) {
      toast.warning("Livestream link must be a valid http or https URL.");
      return;
    }

    try {
      setLoadingAction(true);
      const bannerUrl = createTournamentForm.bannerFile
        ? (await uploadFile(createTournamentForm.bannerFile)).data.url
        : undefined;

      const res = await createTournament({
        name,
        game,
        bannerUrl,
        maxTeams,
        teamSize,
        format,
        region: createTournamentForm.region.trim() || undefined,
        description: createTournamentForm.description.trim() || undefined,
        prizePool: createTournamentForm.prizePool.trim() || undefined,
        rules: createTournamentForm.rules.trim() || undefined,
        livestreamUrl: livestreamUrl || undefined,
        startDate: startDate.toISOString(),
        registrationDeadline: registrationDeadline.toISOString(),
      });

      toast.success(res.message);
      setCreateTournamentOpen(false);
      setCreateTournamentForm(getDefaultCreateTournamentForm());
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
        bestOf: prev[matchId]?.bestOf ?? "BO1",
        note: prev[matchId]?.note ?? "",
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
        bestOf: form.bestOf,
        note: form.note.trim() || undefined,
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
      toast.error(
        getApiErrorMessage(err, "Submit tournament approval failed."),
      );
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
      description: `Publish a ${announcementType} announcement for ${selectedTournament.name}. Discord will receive it, and registered team members will get in-app notifications when available.`,
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

      const { announcement, delivery } = res.data;
      const discordLabel = !delivery.discord.configured
        ? "Discord not configured"
        : delivery.discord.sent
          ? "Discord sent"
          : "Discord failed";
      const memberLabel = `${delivery.inAppRecipients} member${delivery.inAppRecipients === 1 ? "" : "s"} notified`;
      const deliveryMessage = `${discordLabel} · ${memberLabel}`;

      if (delivery.discord.configured && !delivery.discord.sent) {
        toast.warning(deliveryMessage, res.message);
      } else {
        toast.success(deliveryMessage, res.message);
      }

      setAnnouncements((prev) => [
        announcement,
        ...prev.filter((item) => item.id !== announcement.id),
      ]);
      setAnnouncementDelivery(delivery);
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
    const decisionReason = `Organizer resolved this dispute with ${formatStatus(
      decision,
    ).toLowerCase()}.`;
    const confirmed = await confirm({
      title: "Resolve dispute?",
      description: `Close "${dispute?.reason ?? "this dispute"}" with your decision.`,
      confirmText: "Resolve",
      tone: decision === "REMATCH" ? "warning" : "success",
    });

    if (!confirmed) return;

    try {
      setLoadingAction(true);

      await resolveDispute(disputeId, { decision, decisionReason });

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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadTournaments();
        await loadDisputes();
        await loadAuditLogs();
      } catch (err) {
        if (!cancelled) {
          toast.error(
            getApiErrorMessage(err, "Failed to load organizer dashboard."),
          );
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
  }, [loadAuditLogs, loadDisputes, loadTournaments, toast]);

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
          textMatches(
            [item.name, item.status, item.maxTeams],
            tournamentQuery,
          ) && filterMatches([item.status], tournamentStatusFilter),
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
  const matchTeamNameById = useMemo(
    () => new Map(registrations.map((item) => [item.team.id, item.team.name])),
    [registrations],
  );
  const getMatchTeamLabel = useCallback(
    (teamId: string | null) =>
      teamId ? (matchTeamNameById.get(teamId) ?? teamId) : "TBD",
    [matchTeamNameById],
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
              getMatchTeamLabel(item.teamAId),
              getMatchTeamLabel(item.teamBId),
              item.status,
              item.roomCode,
              item.livestreamUrl,
            ],
            matchQuery,
          ) && filterMatches([item.status], matchStatusFilter),
      ),
    [getMatchTeamLabel, matchQuery, matchStatusFilter, matches],
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
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_46%,#050816_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
              <Trophy className="size-4" aria-hidden="true" />
              Organizer Dashboard
            </span>

            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-5xl lg:text-6xl">
              Tournament Control Center
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
              Manage registrations, approvals, brackets, match scheduling,
              livestreams, announcements and disputes from one operator surface.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <GitBranch className="size-4 text-cyan-200" />
                Bracket engine
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <Radio className="size-4 text-red-200" />
                Live operations
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <Activity className="size-4 text-violet-200" />
                Audit trail
              </span>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#09111f]/85 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Selected event
            </p>
            <h2 className="mt-3 line-clamp-2 text-2xl font-black text-white">
              {selectedTournament?.name ?? "No tournament selected"}
            </h2>
            <div className="mt-4">
              {selectedTournament ? (
                <StatusPill value={selectedTournament.status} />
              ) : (
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${toneClasses.slate}`}>
                  Select one
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCreateTournament}
              disabled={loadingAction}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loadingAction ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create Tournament
            </button>
          </section>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <MetricCard
            icon={<Trophy className="size-5" />}
            label="Tournaments"
            value={tournaments.length}
            helper="managed events"
            tone="amber"
            barPercent={Math.min(100, tournaments.length * 10)}
          />
          <MetricCard
            icon={<Users className="size-5" />}
            label="Registrations"
            value={registrations.length}
            helper={`${pendingCount} pending`}
            tone="cyan"
            barPercent={registrations.length > 0 ? Math.round(((registrations.length - pendingCount) / registrations.length) * 100) : 0}
          />
          <MetricCard
            icon={<CheckCircle2 className="size-5" />}
            label="Approved"
            value={approvedCount}
            helper="accepted teams"
            tone="emerald"
            barPercent={registrations.length > 0 ? Math.round((approvedCount / registrations.length) * 100) : 0}
          />
          <MetricCard
            icon={<ShieldAlert className="size-5" />}
            label="Pending"
            value={pendingCount}
            helper="needs review"
            tone="violet"
            barPercent={registrations.length > 0 ? Math.round((pendingCount / registrations.length) * 100) : 0}
          />
          <MetricCard
            icon={<ShieldAlert className="size-5" />}
            label="Open Disputes"
            value={openDisputesCount}
            helper="match reports"
            tone="red"
            barPercent={disputes.length > 0 ? Math.round((openDisputesCount / disputes.length) * 100) : 0}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <PanelShell
            icon={<Trophy className="size-6" />}
            title="My Tournaments"
            description="Search, filter and switch between events without leaving the operator desk."
          >
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
                  className="w-full rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
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
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
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
                      className={`w-full rounded-[1.35rem] border p-5 text-left shadow-[0_18px_70px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 ${
                        selectedTournament?.id === item.id
                          ? "border-cyan-300/45 bg-cyan-300/10 shadow-[0_18px_70px_rgba(34,211,238,0.13)]"
                          : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/[0.055]"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <p className="min-w-0 text-lg font-black leading-6 text-white">
                          {item.name}
                        </p>
                        <StatusPill value={item.status} />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-400">
                        Max Teams:{" "}
                        <span className="text-slate-100">{item.maxTeams}</span>
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
          </PanelShell>

          <PanelShell
            icon={<Users className="size-6" />}
            title={selectedTournament?.name ?? "No tournament selected"}
            description="Registration Management"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Current queue
                </p>
                <div className="mt-2">
                  {selectedTournament ? (
                    <StatusPill value={selectedTournament.status} />
                  ) : (
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${toneClasses.slate}`}
                    >
                      Waiting for selection
                    </span>
                  )}
                </div>
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
                  className="w-full rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
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
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
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
                      className="grid gap-4 rounded-[1.35rem] border border-white/10 bg-black/25 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.16)] md:grid-cols-[1fr_140px_130px]"
                    >
                      <div>
                        <p className="text-lg font-black text-white">
                          {item.team.name}
                        </p>
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
                        <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                          Status
                        </p>
                        <StatusPill value={item.status} />
                      </div>

                      <div className="flex items-center">
                        {item.status === "PENDING" ? (
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/teams/${item.team.id}`}
                              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/20"
                            >
                              View Team
                            </Link>

                            <button
                              onClick={() => handleApprove(item.id)}
                              disabled={
                                loadingAction ||
                                !lineup ||
                                isSelectedTournamentArchived
                              }
                              className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => handleReject(item.id)}
                              disabled={
                                loadingAction || isSelectedTournamentArchived
                              }
                              className="rounded-2xl bg-red-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-red-200 disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/teams/${item.team.id}`}
                              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/20"
                            >
                              View Team
                            </Link>
                            <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white/50">
                              Done
                            </span>
                          </div>
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
          </PanelShell>
        </section>

        <PanelShell
          icon={<Megaphone className="size-6" />}
          title="Announcements"
          description="Publish updates to Discord and notify registered team members when available."
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_180px]">
            <input
              value={announcementTitle}
              onChange={(event) => setAnnouncementTitle(event.target.value)}
              disabled={isSelectedTournamentArchived}
              className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-50"
              placeholder="Announcement title"
            />

            <select
              value={announcementType}
              onChange={(event) =>
                setAnnouncementType(event.target.value as AnnouncementType)
              }
              disabled={isSelectedTournamentArchived}
              className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 font-bold outline-none transition focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-50"
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
            className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-50"
            placeholder="Announcement content"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/50">
              {isSelectedTournamentArchived
                ? "Completed tournaments are archived in read-only mode."
                : "Discord receives every announcement; in-app notifications go to registered team members."}
            </p>

            <button
              type="button"
              onClick={handleCreateAnnouncement}
              disabled={
                !selectedTournament ||
                creatingAnnouncement ||
                isSelectedTournamentArchived
              }
              className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-black text-slate-950 shadow-[0_16px_45px_rgba(103,232,249,0.16)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {creatingAnnouncement ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Megaphone size={18} />
              )}
              Create Announcement
            </button>
          </div>

          {announcementDelivery && (
            <div
              className={[
                "mt-5 grid gap-3 rounded-2xl border p-4 text-sm font-bold sm:grid-cols-3",
                announcementDelivery.discord.configured &&
                !announcementDelivery.discord.sent
                  ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                  : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
              ].join(" ")}
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
                  Discord
                </p>
                <p className="mt-1">
                  {!announcementDelivery.discord.configured
                    ? "Not configured"
                    : announcementDelivery.discord.sent
                      ? "Sent"
                      : "Failed"}
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
                  In-app
                </p>
                <p className="mt-1">
                  {announcementDelivery.inAppRecipients} member
                  {announcementDelivery.inAppRecipients === 1 ? "" : "s"}{" "}
                  notified
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
                  Status
                </p>
                <p className="mt-1">Announcement saved</p>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Recent announcements
              </p>
              <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-slate-300">
                {announcements.length}
              </span>
            </div>

            {announcements.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-semibold text-slate-400">
                No announcements published yet.
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 4).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-black text-white">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">
                          {item.content}
                        </p>
                      </div>
                      <StatusPill value={item.type} />
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </PanelShell>

        <PanelShell
          icon={<CalendarDays className="size-6" />}
          title="Match Scheduling"
          description="Assign start times, room codes and livestream links for generated matches."
        >
          {bracketStatus && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Bracket status
              </span>
              <StatusPill value={bracketStatus} />
            </div>
          )}

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
                  className="w-full rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
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
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
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
                matches.length === 0
                  ? "No matches to schedule"
                  : "No matches match"
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
                  bestOf: "BO1",
                  note: "",
                };
                const isCompleted =
                  isSelectedTournamentArchived || match.status === "COMPLETED";

                return (
                  <div
                    key={match.id}
                    className="grid gap-4 rounded-[1.35rem] border border-white/10 bg-black/25 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.16)] sm:grid-cols-2 xl:grid-cols-[minmax(180px,1.2fr)_minmax(190px,1fr)_minmax(110px,0.7fr)_minmax(130px,0.8fr)] [&>*]:min-w-0"
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                        Round {match.roundNumber} - Match {match.matchNumber}
                      </p>
                      <p className="mt-2 font-black">
                        {getMatchTeamLabel(match.teamAId)} vs{" "}
                        {getMatchTeamLabel(match.teamBId)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusPill value={match.status} />
                        <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-bold text-slate-300">
                          {formatDateTime(match.scheduledAt)}
                        </span>
                      </div>
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
                      className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm outline-none transition focus:border-amber-200/60 focus:ring-4 focus:ring-amber-200/10 disabled:opacity-50"
                    />

                    <select
                      value={form.bestOf}
                      onChange={(event) =>
                        updateScheduleForm(
                          match.id,
                          "bestOf",
                          event.target.value,
                        )
                      }
                      disabled={isCompleted}
                      className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm font-bold outline-none transition focus:border-amber-200/60 focus:ring-4 focus:ring-amber-200/10 disabled:opacity-50"
                    >
                      <option value="BO1">BO1</option>
                      <option value="BO3">BO3</option>
                      <option value="BO5">BO5</option>
                    </select>

                    <input
                      value={form.roomCode}
                      onChange={(event) =>
                        updateScheduleForm(
                          match.id,
                          "roomCode",
                          event.target.value,
                        )
                      }
                      disabled={isCompleted}
                      className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm outline-none transition placeholder:text-white/35 focus:border-amber-200/60 focus:ring-4 focus:ring-amber-200/10 disabled:opacity-50"
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
                      className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-50"
                      placeholder="Livestream URL"
                    />

                    <input
                      value={form.note}
                      onChange={(event) =>
                        updateScheduleForm(
                          match.id,
                          "note",
                          event.target.value,
                        )
                      }
                      disabled={isCompleted}
                      className="rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm outline-none transition placeholder:text-white/35 focus:border-violet-300/60 focus:ring-4 focus:ring-violet-300/10 disabled:opacity-50"
                      placeholder="Note"
                    />

                    <button
                      type="button"
                      onClick={() => handleScheduleMatch(match.id)}
                      disabled={isCompleted || schedulingMatchId === match.id}
                      className="flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:opacity-50 disabled:hover:translate-y-0"
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
                        !["LIVE", "IN_PROGRESS"].includes(match.status) ||
                        updatingLivestreamMatchId === match.id
                      }
                      className="flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/20 disabled:opacity-50 disabled:hover:translate-y-0"
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
        </PanelShell>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 p-6 shadow-[0_18px_70px_rgba(34,211,238,0.1)]">
            <GitBranch className="mb-5 text-cyan-200" />
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-black">Bracket Engine</h2>
              {bracketStatus && <StatusPill value={bracketStatus} />}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Generate brackets from approved teams after registration closes.
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-red-300/15 bg-red-300/10 p-6 shadow-[0_18px_70px_rgba(248,113,113,0.08)]">
            <Radio className="mb-5 text-red-200" />
            <h2 className="text-xl font-black">Live Matches</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Manage match result, evidence and disputes.
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-violet-300/15 bg-violet-300/10 p-6 shadow-[0_18px_70px_rgba(167,139,250,0.08)]">
            <Activity className="mb-5 text-violet-200" />
            <h2 className="text-xl font-black">Audit Trail</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Track important organizer actions.
            </p>
          </article>
        </section>

        <PanelShell
          icon={<ShieldAlert className="size-6" />}
          title="Dispute Center"
          description="Review open match reports, inspect evidence and close decisions quickly."
        >
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
                  className="w-full rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
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
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
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
                title={
                  disputes.length === 0
                    ? "No disputes yet"
                    : "No disputes match"
                }
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
                  className="grid gap-4 rounded-[1.35rem] border border-white/10 bg-black/25 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.16)] xl:grid-cols-[1fr_140px_330px]"
                >
                  <div>
                    <p className="text-lg font-black text-white">
                      {item.reason}
                    </p>

                    <p className="mt-1 text-sm text-white/50">
                      {item.description ?? "No description"}
                    </p>

                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">
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
                        {item.match.evidences
                          .slice(0, 4)
                          .map((evidence, index) => (
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
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </p>
                    <StatusPill value={item.status} />
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
                          className="rounded-2xl bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50 disabled:hover:translate-y-0"
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
                          className="rounded-2xl bg-violet-300 px-4 py-2 text-xs font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-violet-200 disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                          Approve Team B
                        </button>
                        <button
                          onClick={() =>
                            handleResolveDispute(item.id, "REMATCH")
                          }
                          disabled={loadingAction}
                          className="rounded-2xl bg-amber-300 px-4 py-2 text-xs font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:opacity-50 disabled:hover:translate-y-0"
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
        </PanelShell>

        <PanelShell
          icon={<Activity className="size-6" />}
          title="Audit Logs"
          description="Recent organizer actions and metadata for traceability."
        >
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
                <div
                  key={item.id}
                  className="rounded-[1.35rem] border border-white/10 bg-black/25 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-black text-cyan-300">{item.action}</p>
                      <p className="mt-1 text-sm text-white/50">
                        {item.entityType} - {item.entityId}
                      </p>
                    </div>

                    <p className="text-sm text-white/40">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>

                  {item.metadata && (
                    <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-slate-300">
                      {item.metadata}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </PanelShell>
      </div>

      <AnimatePresence>
        {createTournamentOpen && (
          <CreateTournamentModal
            key="create-tournament"
            form={createTournamentForm}
            loading={loadingAction}
            onChange={setCreateTournamentForm}
            onClose={() => {
              if (!loadingAction) setCreateTournamentOpen(false);
            }}
            onSubmit={handleCreateTournamentSubmit}
          />
        )}

        {rejectRegistrationTarget && (
          <RejectRegistrationModal
            key="reject-registration"
            teamName={rejectRegistrationTarget.team.name}
            reason={rejectReason}
            loading={loadingAction}
            onReasonChange={setRejectReason}
            onClose={() => {
              if (!loadingAction) setRejectRegistrationTarget(null);
            }}
            onSubmit={handleRejectRegistrationSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
