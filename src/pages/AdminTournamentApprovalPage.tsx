import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Gamepad2,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Swords,
  Trophy,
  UserRoundCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  approveAdminTournament,
  getAdminTournamentApprovals,
  rejectAdminTournament,
  type AdminTournament,
} from "@/services/admin.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { BackButton } from "@/components/ui/BackButton";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";
import { formatTournamentName } from "@/utils";

const REVIEW_FILTERS = [
  "ALL",
  "PENDING_APPROVAL",
  "OPEN_REGISTRATION",
  "DRAFT",
] as const;

type ReviewFilter = (typeof REVIEW_FILTERS)[number];

type StatusMeta = {
  label: string;
  icon: LucideIcon;
  pill: string;
  row: string;
  accent: string;
};

const statusMeta: Record<string, StatusMeta> = {
  PENDING_APPROVAL: {
    label: "Pending",
    icon: Clock3,
    pill: "border-amber-300/25 bg-amber-300/12 text-amber-100",
    row: "border-amber-300/20 bg-amber-300/[0.045]",
    accent: "bg-amber-300",
  },
  OPEN_REGISTRATION: {
    label: "Open",
    icon: BadgeCheck,
    pill: "border-emerald-300/25 bg-emerald-300/12 text-emerald-100",
    row: "border-emerald-300/20 bg-emerald-300/[0.045]",
    accent: "bg-emerald-300",
  },
  DRAFT: {
    label: "Draft",
    icon: FileText,
    pill: "border-cyan-300/25 bg-cyan-300/12 text-cyan-100",
    row: "border-cyan-300/20 bg-cyan-300/[0.04]",
    accent: "bg-cyan-300",
  },
};

const fallbackStatusMeta: StatusMeta = {
  label: "Review",
  icon: ShieldCheck,
  pill: "border-white/15 bg-white/8 text-slate-200",
  row: "border-white/10 bg-white/[0.035]",
  accent: "bg-slate-300",
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

function getStatusMeta(value: string) {
  return statusMeta[value] ?? fallbackStatusMeta;
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getCapacityPercent(tournament: AdminTournament) {
  const registered = tournament._count?.registrations ?? 0;
  const capacity = Math.max(tournament.maxTeams, 1);

  return Math.min(100, Math.round((registered / capacity) * 100));
}

function matchesSearch(tournament: AdminTournament, query: string) {
  if (!query) return true;

  const haystack = [
    tournament.name,
    tournament.game,
    tournament.description,
    tournament.format,
    tournament.status,
    tournament.organizer.username,
    tournament.organizer.email,
    tournament.rules,
    tournament.prizePool,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function StatusPill({ value }: { value: string }) {
  const meta = getStatusMeta(value);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${meta.pill}`}
    >
      <span className={`size-2 rounded-full ${meta.accent}`} />
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-[0_18px_70px_rgba(0,0,0,0.22)] ${tone}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black leading-none text-white">
            {value}
          </p>
        </div>
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function DataPill({
  icon: Icon,
  children,
  tone = "border-white/10 bg-black/20 text-slate-300",
}: {
  icon?: LucideIcon;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-black ${tone}`}
    >
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

function TournamentReviewCard({
  tournament,
  actionId,
  onApprove,
  onReject,
}: {
  tournament: AdminTournament;
  actionId: string | null;
  onApprove: (tournament: AdminTournament) => void;
  onReject: (tournament: AdminTournament) => void;
}) {
  const meta = getStatusMeta(tournament.status);
  const isPending = tournament.status === "PENDING_APPROVAL";
  const isHandling = actionId === tournament.id;
  const capacity = getCapacityPercent(tournament);
  const registered = tournament._count?.registrations ?? 0;
  const matches = tournament._count?.matches ?? 0;

  return (
    <article
      className={`overflow-hidden rounded-[1.75rem] border shadow-[0_20px_90px_rgba(0,0,0,0.26)] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/25 ${meta.row}`}
    >
      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="relative min-h-56 overflow-hidden border-b border-white/10 bg-[#060b16] lg:border-b-0 lg:border-r">
          {tournament.bannerUrl ? (
            <img
              src={tournament.bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(251,191,36,0.14)_48%,rgba(16,185,129,0.16))]" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-[#050816] via-[#050816]/55 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <StatusPill value={tournament.status} />
            <p className="mt-3 line-clamp-2 text-2xl font-black leading-tight text-white">
              {formatTournamentName(tournament.name)}
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DataPill
                  icon={Gamepad2}
                  tone="border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                >
                  {tournament.game}
                </DataPill>
                <DataPill icon={Swords}>{tournament.format}</DataPill>
                {tournament.prizePool && (
                  <DataPill
                    icon={Trophy}
                    tone="border-amber-300/20 bg-amber-300/10 text-amber-100"
                  >
                    {tournament.prizePool}
                  </DataPill>
                )}
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                {tournament.description ?? "No description provided."}
              </p>
            </div>

            {isPending && (
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:justify-end">
                <button
                  type="button"
                  onClick={() => onApprove(tournament)}
                  disabled={isHandling}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(110,231,183,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                >
                  {isHandling ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  )}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onReject(tournament)}
                  disabled={isHandling}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-300/25 bg-red-300/12 px-5 text-sm font-black text-red-100 transition duration-200 hover:-translate-y-0.5 hover:bg-red-300/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Reject
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Registration capacity
                </p>
                <p className="text-sm font-black text-white">
                  {registered}/{tournament.maxTeams}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-amber-300"
                  style={{ width: `${capacity}%` }}
                />
              </div>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <DataPill icon={Users}>
                  Team size {tournament.teamSize}
                </DataPill>
                <DataPill icon={LayoutDashboard}>{matches} matches</DataPill>
                <DataPill icon={UserRoundCheck}>
                  {tournament.organizer.username}
                </DataPill>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Schedule
              </p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Start</span>
                  <span className="font-black text-white">
                    {formatDate(tournament.startDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Deadline</span>
                  <span className="font-black text-white">
                    {formatDate(tournament.registrationDeadline)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {tournament.rules && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                <FileText className="size-4 text-cyan-200/80" />
                Rules
              </div>
              <p className="line-clamp-4 text-sm leading-6 text-slate-300">
                {tournament.rules}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function AdminTournamentApprovalPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectTarget, setRejectTarget] = useState<AdminTournament | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");

  async function loadTournaments() {
    const res = await getAdminTournamentApprovals();
    setTournaments(res.data);
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await getAdminTournamentApprovals();
        if (!cancelled) setTournaments(res.data);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            getApiErrorMessage(err, "Failed to load tournament approvals."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const stats = useMemo(() => {
    const pending = tournaments.filter(
      (item) => item.status === "PENDING_APPROVAL",
    ).length;
    const open = tournaments.filter(
      (item) => item.status === "OPEN_REGISTRATION",
    ).length;
    const totalSlots = tournaments.reduce(
      (sum, item) => sum + item.maxTeams,
      0,
    );
    const submittedGames = new Set(tournaments.map((item) => item.game)).size;

    return {
      pending,
      open,
      total: tournaments.length,
      totalSlots,
      submittedGames,
    };
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tournaments
      .filter((item) =>
        statusFilter === "ALL" ? true : item.status === statusFilter,
      )
      .filter((item) => matchesSearch(item, query))
      .sort((a, b) => {
        const aPending = a.status === "PENDING_APPROVAL" ? 0 : 1;
        const bPending = b.status === "PENDING_APPROVAL" ? 0 : 1;

        if (aPending !== bPending) return aPending - bPending;

        return (
          new Date(b.approvalSubmittedAt ?? b.createdAt).getTime() -
          new Date(a.approvalSubmittedAt ?? a.createdAt).getTime()
        );
      });
  }, [searchQuery, statusFilter, tournaments]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadTournaments();
      toast.success("Tournament approvals refreshed.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to refresh tournaments."));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleApprove(tournament: AdminTournament) {
    const confirmed = await confirm({
      title: "Approve tournament?",
      description: `${tournament.name} will move to Open Registration.`,
      confirmText: "Approve",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setActionId(tournament.id);
      const res = await approveAdminTournament(tournament.id);
      toast.success(res.message);
      await loadTournaments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Approve tournament failed."));
    } finally {
      setActionId(null);
    }
  }

  function openRejectDialog(tournament: AdminTournament) {
    setRejectTarget(tournament);
    setRejectReason(tournament.approvalRejectReason ?? "");
  }

  function closeRejectDialog() {
    if (actionId) return;

    setRejectTarget(null);
    setRejectReason("");
  }

  async function handleRejectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectTarget) return;

    try {
      setActionId(rejectTarget.id);
      const res = await rejectAdminTournament(
        rejectTarget.id,
        rejectReason.trim(),
      );
      toast.success(res.message);
      setRejectTarget(null);
      setRejectReason("");
      await loadTournaments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Reject tournament failed."));
    } finally {
      setActionId(null);
    }
  }

  const filterSummary =
    filteredTournaments.length === tournaments.length
      ? `${tournaments.length} total submissions`
      : `${filteredTournaments.length} of ${tournaments.length} submissions`;

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <BackButton fallbackTo="/admin" label="Back to admin" />

        <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[2rem] border border-white/10 bg-linear-to-br from-white/[0.09] via-white/[0.045] to-amber-300/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
              <Trophy className="size-4" aria-hidden="true" />
              Admin Approval
            </div>
            <div className="mt-7 max-w-3xl">
              <h1 className="text-4xl font-black leading-[0.95] text-white sm:text-5xl lg:text-6xl">
                Tournament Approvals
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                Review submitted drafts, validate rules and scheduling, then
                open registration only when the tournament is production ready.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <Clock3 className="size-4 text-amber-200" />
                Pending first
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <ShieldCheck className="size-4 text-emerald-200" />
                Approval trail
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={Clock3}
              label="Pending"
              value={stats.pending}
              tone="border-amber-300/20 bg-amber-300/[0.075]"
            />
            <MetricCard
              icon={BadgeCheck}
              label="Open"
              value={stats.open}
              tone="border-emerald-300/20 bg-emerald-300/[0.075]"
            />
            <MetricCard
              icon={Users}
              label="Slots"
              value={stats.totalSlots}
              tone="border-cyan-300/20 bg-cyan-300/[0.075]"
            />
            <MetricCard
              icon={Gamepad2}
              label="Games"
              value={stats.submittedGames}
              tone="border-violet-300/20 bg-violet-300/[0.075]"
            />
          </div>
        </header>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tournament, game, organizer, rules"
                className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] pl-12 pr-11 text-sm font-bold text-white outline-none transition duration-200 placeholder:text-slate-600 focus:border-amber-200/50 focus:ring-4 focus:ring-amber-300/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                {REVIEW_FILTERS.map((filter) => {
                  const active = statusFilter === filter;
                  const count =
                    filter === "ALL"
                      ? stats.total
                      : tournaments.filter((item) => item.status === filter)
                          .length;

                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={[
                        "inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-xs font-black uppercase tracking-[0.12em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200",
                        active
                          ? "bg-amber-300 text-slate-950 shadow-[0_12px_34px_rgba(251,191,36,0.22)]"
                          : "text-slate-400 hover:bg-white/8 hover:text-white",
                      ].join(" ")}
                    >
                      {filter === "ALL" ? "All" : getStatusMeta(filter).label}
                      <span className="ml-2 rounded-full bg-black/15 px-1.5 py-0.5 text-[10px]">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                aria-label="Refresh tournament approvals"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-black text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <RefreshCw
                  className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-500">
            {filterSummary}
          </p>
        </section>

        {loading ? (
          <LoadingState
            title="Loading tournament approvals..."
            description="Checking submitted tournament drafts."
          />
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No tournaments pending approval"
            description="Submitted organizer drafts will appear here."
          />
        ) : filteredTournaments.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching tournaments"
            description="Try another search term or status filter."
          />
        ) : (
          <div className="grid gap-4">
            {filteredTournaments.map((tournament) => (
              <TournamentReviewCard
                key={tournament.id}
                tournament={tournament}
                actionId={actionId}
                onApprove={handleApprove}
                onReject={openRejectDialog}
              />
            ))}
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close reject dialog"
            onClick={closeRejectDialog}
            className="absolute inset-0 bg-black/75 backdrop-blur-xl"
          />

          <form
            onSubmit={handleRejectSubmit}
            className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-red-200/15 bg-[#0f172a]/95 p-6 shadow-[0_32px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-red-200/60 to-transparent" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-red-200/20 bg-red-300/12 text-red-100">
                <XCircle className="size-6" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={closeRejectDialog}
                aria-label="Cancel reject"
                disabled={actionId === rejectTarget.id}
                className="inline-flex size-10 items-center justify-center rounded-2xl text-slate-400 transition duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <h2 className="mt-6 text-3xl font-black text-white">
              Reject tournament draft
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {rejectTarget.name} will return to Draft. Add a clear note so the
              organizer knows what to fix before resubmitting.
            </p>

            <label className="mt-6 block text-sm font-black text-slate-300">
              Review note
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={5}
                placeholder="Example: Registration deadline is too close to the start date, and rules need clearer scoring details."
                className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-[#070b16] p-4 text-sm font-medium leading-6 text-white outline-none transition duration-200 placeholder:text-slate-600 focus:border-red-200/45 focus:ring-4 focus:ring-red-300/10"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRejectDialog}
                disabled={actionId === rejectTarget.id}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-5 text-sm font-black text-slate-200 transition duration-200 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionId === rejectTarget.id}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(252,165,165,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
              >
                {actionId === rejectTarget.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <XCircle className="size-4" aria-hidden="true" />
                )}
                Reject draft
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
