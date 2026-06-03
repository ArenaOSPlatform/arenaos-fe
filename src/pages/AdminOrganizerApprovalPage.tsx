import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundCheck,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  approveAdminOrganizerRequest,
  getAdminOrganizerRequests,
  rejectAdminOrganizerRequest,
  type AdminOrganizerRequest,
} from "@/services/admin.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { BackButton } from "@/components/ui/BackButton";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";

const STATUS_ORDER = ["PENDING", "APPROVED", "REJECTED"] as const;
const REQUEST_FILTERS = ["ALL", ...STATUS_ORDER] as const;

type RequestFilter = (typeof REQUEST_FILTERS)[number];

type StatusMeta = {
  label: string;
  icon: LucideIcon;
  pill: string;
  row: string;
  accent: string;
};

const statusMeta: Record<string, StatusMeta> = {
  PENDING: {
    label: "Pending",
    icon: Clock3,
    pill: "border-amber-300/25 bg-amber-300/12 text-amber-100",
    row: "border-amber-300/20 bg-amber-300/[0.045]",
    accent: "bg-amber-300",
  },
  APPROVED: {
    label: "Approved",
    icon: BadgeCheck,
    pill: "border-emerald-300/25 bg-emerald-300/12 text-emerald-100",
    row: "border-emerald-300/20 bg-emerald-300/[0.045]",
    accent: "bg-emerald-300",
  },
  REJECTED: {
    label: "Rejected",
    icon: Ban,
    pill: "border-red-300/25 bg-red-300/12 text-red-100",
    row: "border-red-300/20 bg-red-300/[0.045]",
    accent: "bg-red-300",
  },
};

const fallbackStatusMeta: StatusMeta = {
  label: "Unknown",
  icon: ShieldCheck,
  pill: "border-slate-300/20 bg-slate-300/10 text-slate-200",
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
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");

  return initials.toUpperCase() || "U";
}

function matchesSearch(request: AdminOrganizerRequest, query: string) {
  if (!query) return true;

  const haystack = [
    request.user.username,
    request.user.email,
    request.user.role,
    request.user.status,
    request.reason,
    request.experience,
    request.portfolioUrl,
    request.reviewNote,
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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${meta.pill}`}
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
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-[0_18px_70px_rgba(0,0,0,0.22)] ${tone}`}>
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

function DetailBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        <Icon className="size-4 text-cyan-200/80" aria-hidden="true" />
        {label}
      </div>
      <div className="text-sm leading-6 text-slate-300">{children}</div>
    </div>
  );
}

function RequestCard({
  request,
  actionId,
  onApprove,
  onReject,
}: {
  request: AdminOrganizerRequest;
  actionId: string | null;
  onApprove: (request: AdminOrganizerRequest) => void;
  onReject: (request: AdminOrganizerRequest) => void;
}) {
  const meta = getStatusMeta(request.status);
  const isPending = request.status === "PENDING";
  const isHandling = actionId === request.id;

  return (
    <article
      className={`relative overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_20px_90px_rgba(0,0,0,0.26)] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/25 ${meta.row}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${meta.accent}`} />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {getInitials(request.user.username)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="truncate text-2xl font-black text-white">
                {request.user.username}
              </h2>
              <StatusPill value={request.status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
              <span className="inline-flex min-w-0 items-center gap-2">
                <Mail className="size-4 shrink-0 text-cyan-200/80" />
                <span className="truncate">{request.user.email}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <UserRoundCheck className="size-4 text-cyan-200/80" />
                {request.user.role}
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-cyan-200/80" />
                {request.user.status}
              </span>
            </div>
          </div>
        </div>

        {isPending && (
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:justify-end">
            <button
              type="button"
              onClick={() => onApprove(request)}
              disabled={isHandling}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(110,231,183,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            >
              {isHandling ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              )}
              Approve
            </button>
            <button
              type="button"
              onClick={() => onReject(request)}
              disabled={isHandling}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-300/25 bg-red-300/12 px-5 text-sm font-black text-red-100 transition duration-200 hover:-translate-y-0.5 hover:bg-red-300/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            >
              <XCircle className="size-4" aria-hidden="true" />
              Reject
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 lg:grid-cols-3">
        <DetailBlock icon={FileText} label="Reason">
          {request.reason || "No reason provided."}
        </DetailBlock>

        <DetailBlock icon={BriefcaseBusiness} label="Experience">
          {request.experience || "No experience details provided."}
        </DetailBlock>

        <DetailBlock icon={ExternalLink} label="Portfolio">
          {request.portfolioUrl ? (
            <a
              href={request.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 font-bold text-cyan-200 transition duration-200 hover:text-white"
            >
              <span className="truncate">{request.portfolioUrl}</span>
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            "No portfolio attached."
          )}
        </DetailBlock>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4 text-xs font-bold text-slate-400">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
          <CalendarClock className="size-3.5 text-cyan-200/80" />
          Submitted {formatDate(request.createdAt)}
        </span>
        {request.reviewedAt && (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
            <ShieldCheck className="size-3.5 text-cyan-200/80" />
            Reviewed {formatDate(request.reviewedAt)}
          </span>
        )}
        {request.reviewer && (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
            <UserCheck className="size-3.5 text-cyan-200/80" />
            {request.reviewer.username}
          </span>
        )}
      </div>

      {request.reviewNote && (
        <p className="mt-4 border-l-2 border-red-300/60 pl-4 text-sm leading-6 text-red-100/80">
          {request.reviewNote}
        </p>
      )}
    </article>
  );
}

export function AdminOrganizerApprovalPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [requests, setRequests] = useState<AdminOrganizerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectTarget, setRejectTarget] =
    useState<AdminOrganizerRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function loadRequests() {
    const res = await getAdminOrganizerRequests();
    setRequests(res.data);
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await getAdminOrganizerRequests();
        if (!cancelled) setRequests(res.data);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            getApiErrorMessage(err, "Failed to load organizer requests."),
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
    const pending = requests.filter((item) => item.status === "PENDING").length;
    const approved = requests.filter(
      (item) => item.status === "APPROVED",
    ).length;
    const rejected = requests.filter(
      (item) => item.status === "REJECTED",
    ).length;

    return {
      total: requests.length,
      pending,
      approved,
      rejected,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return requests
      .filter((item) =>
        statusFilter === "ALL" ? true : item.status === statusFilter,
      )
      .filter((item) => matchesSearch(item, query))
      .sort((a, b) => {
        const statusA = STATUS_ORDER.indexOf(
          a.status as (typeof STATUS_ORDER)[number],
        );
        const statusB = STATUS_ORDER.indexOf(
          b.status as (typeof STATUS_ORDER)[number],
        );
        const safeStatusA = statusA === -1 ? STATUS_ORDER.length : statusA;
        const safeStatusB = statusB === -1 ? STATUS_ORDER.length : statusB;

        if (safeStatusA !== safeStatusB) return safeStatusA - safeStatusB;

        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [requests, searchQuery, statusFilter]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadRequests();
      toast.success("Organizer requests refreshed.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to refresh requests."));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleApprove(request: AdminOrganizerRequest) {
    const confirmed = await confirm({
      title: "Approve organizer?",
      description: `${request.user.username} will receive ORGANIZER access.`,
      confirmText: "Approve",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setActionId(request.id);
      const res = await approveAdminOrganizerRequest(request.id);
      toast.success(res.message);
      await loadRequests();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Approve organizer request failed."));
    } finally {
      setActionId(null);
    }
  }

  function openRejectDialog(request: AdminOrganizerRequest) {
    setRejectTarget(request);
    setRejectReason("");
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
      const res = await rejectAdminOrganizerRequest(
        rejectTarget.id,
        rejectReason.trim(),
      );
      toast.success(res.message);
      setRejectTarget(null);
      setRejectReason("");
      await loadRequests();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Reject organizer request failed."));
    } finally {
      setActionId(null);
    }
  }

  const filterSummary =
    filteredRequests.length === requests.length
      ? `${requests.length} total requests`
      : `${filteredRequests.length} of ${requests.length} requests`;

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <BackButton fallbackTo="/admin" label="Back to admin" />

        <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[2rem] border border-white/10 bg-linear-to-br from-white/[0.09] via-white/[0.045] to-cyan-300/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Admin Approval
            </div>
            <div className="mt-7 max-w-3xl">
              <h1 className="text-4xl font-black leading-[0.95] text-white sm:text-5xl lg:text-6xl">
                Organizer Requests
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                Review applications, inspect experience, and grant organizer
                permissions with a clear approval trail.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <UserCheck className="size-4 text-emerald-200" />
                Role elevation queue
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <Clock3 className="size-4 text-amber-200" />
                Pending first
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={UserCheck}
              label="Pending"
              value={stats.pending}
              tone="border-amber-300/20 bg-amber-300/[0.075]"
            />
            <MetricCard
              icon={BadgeCheck}
              label="Approved"
              value={stats.approved}
              tone="border-emerald-300/20 bg-emerald-300/[0.075]"
            />
            <MetricCard
              icon={Ban}
              label="Rejected"
              value={stats.rejected}
              tone="border-red-300/20 bg-red-300/[0.075]"
            />
            <MetricCard
              icon={ShieldCheck}
              label="Total"
              value={stats.total}
              tone="border-cyan-300/20 bg-cyan-300/[0.075]"
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
                placeholder="Search username, email, reason, experience"
                className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] pl-12 pr-11 text-sm font-bold text-white outline-none transition duration-200 placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                <Filter className="ml-2 hidden size-4 text-slate-500 sm:block" />
                {REQUEST_FILTERS.map((filter) => {
                  const active = statusFilter === filter;
                  const count =
                    filter === "ALL"
                      ? stats.total
                      : requests.filter((item) => item.status === filter)
                          .length;

                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={[
                        "inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-xs font-black uppercase tracking-[0.12em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200",
                        active
                          ? "bg-cyan-300 text-slate-950 shadow-[0_12px_34px_rgba(103,232,249,0.22)]"
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
                aria-label="Refresh organizer requests"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-black text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
            title="Loading organizer requests..."
            description="Collecting pending player submissions."
          />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No organizer requests"
            description="Player requests for organizer access will appear here."
          />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching requests"
            description="Try another search term or status filter."
          />
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
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
              Reject organizer request
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {rejectTarget.user.username} will remain a player. Add a clear
              review note so the decision is easy to audit later.
            </p>

            <label className="mt-6 block text-sm font-black text-slate-300">
              Review note
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={5}
                placeholder="Example: Need tournament hosting history or a clearer portfolio before approval."
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
                Reject request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
