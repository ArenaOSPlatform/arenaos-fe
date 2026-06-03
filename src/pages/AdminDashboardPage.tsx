import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Database,
  Gavel,
  Hash,
  Layers3,
  Link2,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  UserCog,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { UserRole } from "@/routes/route-role";
import {
  getAdminAuditLogs,
  getAdminDisputes,
  getAdminTeams,
  getAdminTournaments,
  getAdminUsers,
  type AdminAuditLog,
  type AdminDispute,
  type AdminTeam,
  type AdminTournament,
  type AdminUser,
  type UserStatus,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "@/services/admin.service";
import {
  resolveDispute,
  type ResolveDisputeDecision,
} from "@/services/dispute.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";
import { getTotalPages, paginateItems } from "@/utils/paginationUtils";
import { formatTournamentName } from "@/utils";

const userRoles: UserRole[] = ["PLAYER", "ORGANIZER", "ADMIN"];
const userStatuses: UserStatus[] = ["ACTIVE", "SUSPENDED", "BANNED"];
const adminPageSize = 6;

const adminFilterOptions = [
  "ALL",
  "PLAYER",
  "ORGANIZER",
  "ADMIN",
  "ACTIVE",
  "SUSPENDED",
  "BANNED",
  "DRAFT",
  "PENDING_APPROVAL",
  "OPEN_REGISTRATION",
  "REGISTRATION_CLOSED",
  "BRACKET_GENERATED",
  "MATCH_SCHEDULED",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "OPEN",
  "RESOLVED",
  "DISPUTED",
] as const;

type AdminListSection =
  | "users"
  | "teams"
  | "tournaments"
  | "disputes"
  | "auditLogs";

type Tone = "cyan" | "emerald" | "amber" | "red" | "violet" | "slate";

const UI = {
  motion: {
    duration: 0.5,
    stagger: 0.045,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 22,
    filter: "blur(8px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: UI.motion.duration,
      ease: UI.motion.ease,
    },
  },
};

const toneClasses: Record<Tone, string> = {
  cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  red: "border-red-300/20 bg-red-300/10 text-red-100",
  violet: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  slate: "border-white/10 bg-white/[0.055] text-slate-200",
};

function getInitialSectionPages(): Record<AdminListSection, number> {
  return {
    users: 1,
    teams: 1,
    tournaments: 1,
    disputes: 1,
    auditLogs: 1,
  };
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

function formatDate(value: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "U";
}

function getStatusTone(value: string): Tone {
  if (
    ["ACTIVE", "RESOLVED", "COMPLETED", "READY", "APPROVED"].includes(value)
  ) {
    return "emerald";
  }

  if (["BANNED", "OPEN", "DISPUTED", "REJECTED"].includes(value)) {
    return "red";
  }

  if (
    [
      "SUSPENDED",
      "PENDING_APPROVAL",
      "MATCH_SCHEDULED",
      "IN_PROGRESS",
    ].includes(value)
  ) {
    return "amber";
  }

  if (["ORGANIZER", "ADMIN", "BRACKET_GENERATED"].includes(value)) {
    return "violet";
  }

  return "cyan";
}

function getTournamentCapacity(tournament: AdminTournament) {
  const registered = tournament._count?.registrations ?? 0;
  const capacity = Math.max(tournament.maxTeams, 1);

  return Math.min(100, Math.round((registered / capacity) * 100));
}

function StatusPill({ value }: { value: string }) {
  const tone = getStatusTone(value);

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${toneClasses[tone]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

function DataPill({
  icon,
  children,
  tone = "slate",
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-black ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

function KpiCard({
  icon,
  label,
  value,
  helper,
  tone,
  index,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone: Tone;
  index: number;
}) {
  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * UI.motion.stagger }}
      className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.065]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-4xl font-black leading-none tracking-[-0.04em] text-white">
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
      <div className="mt-5 h-1.5 rounded-full bg-black/25">
        <div
          className={[
            "h-full rounded-full",
            tone === "cyan"
              ? "bg-cyan-300"
              : tone === "emerald"
                ? "bg-emerald-300"
                : tone === "amber"
                  ? "bg-amber-300"
                  : tone === "red"
                    ? "bg-red-300"
                    : "bg-violet-300",
          ].join(" ")}
          style={{ width: "64%" }}
        />
      </div>
    </motion.article>
  );
}

function Panel({
  id,
  icon,
  title,
  description,
  count,
  children,
  className = "",
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  count?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={[
        "scroll-mt-28 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl",
        className,
      ].join(" ")}
    >
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              {icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black tracking-[-0.035em] text-white">
                {title}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                {description}
              </p>
            </div>
          </div>

          {count && (
            <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 text-xs font-black uppercase tracking-[0.16em] text-slate-300">
              {count}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </motion.section>
  );
}

function EmptyOrLoading({
  loading,
  isEmpty,
  emptyTitle,
  emptyDescription,
  loadingTitle,
  loadingDescription,
}: {
  loading: boolean;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  loadingTitle: string;
  loadingDescription: string;
}) {
  if (loading) {
    return (
      <LoadingState
        compact
        title={loadingTitle}
        description={loadingDescription}
      />
    );
  }

  return (
    <EmptyState
      compact
      title={emptyTitle}
      description={emptyDescription}
      icon={isEmpty ? Database : Search}
    />
  );
}

async function fetchAdminDashboard() {
  const [usersRes, teamsRes, tournamentsRes, disputesRes, auditRes] =
    await Promise.all([
      getAdminUsers(),
      getAdminTeams(),
      getAdminTournaments(),
      getAdminDisputes(),
      getAdminAuditLogs(),
    ]);

  return {
    users: usersRes.data,
    teams: teamsRes.data,
    tournaments: tournamentsRes.data,
    disputes: disputesRes.data,
    auditLogs: auditRes.data,
  };
}

export function AdminDashboardPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const shouldReduceMotion = useReducedMotion();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [dashboardQuery, setDashboardQuery] = useState("");
  const [dashboardFilter, setDashboardFilter] = useState("ALL");
  const [sectionPages, setSectionPages] = useState<
    Record<AdminListSection, number>
  >(getInitialSectionPages);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(
    null,
  );

  async function loadDashboard() {
    try {
      setLoading(true);

      const dashboard = await fetchAdminDashboard();

      setUsers(dashboard.users);
      setTeams(dashboard.teams);
      setTournaments(dashboard.tournaments);
      setDisputes(dashboard.disputes);
      setAuditLogs(dashboard.auditLogs);
      setPageError("");
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to load admin dashboard.",
      );

      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialDashboard() {
      try {
        const dashboard = await fetchAdminDashboard();

        if (cancelled) return;

        setUsers(dashboard.users);
        setTeams(dashboard.teams);
        setTournaments(dashboard.tournaments);
        setDisputes(dashboard.disputes);
        setAuditLogs(dashboard.auditLogs);
        setPageError("");
      } catch (err) {
        if (cancelled) return;

        const message = getApiErrorMessage(
          err,
          "Failed to load admin dashboard.",
        );

        setPageError(message);
        toast.error(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialDashboard();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  function updateSectionPage(section: AdminListSection, page: number) {
    setSectionPages((prev) => ({
      ...prev,
      [section]: page,
    }));
  }

  function resetSectionPages() {
    setSectionPages(getInitialSectionPages());
  }

  function handleDashboardQueryChange(value: string) {
    setDashboardQuery(value);
    resetSectionPages();
  }

  function handleDashboardFilterChange(value: string) {
    setDashboardFilter(value);
    resetSectionPages();
  }

  function replaceUser(updatedUser: AdminUser) {
    setUsers((prev) =>
      prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    );
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    const user = users.find((item) => item.id === userId);
    const confirmed = await confirm({
      title: "Change user role?",
      description: `Set ${user?.username ?? "this user"} to ${role}. This can change what they can access.`,
      confirmText: "Change role",
      tone: "warning",
    });

    if (!confirmed) return;

    try {
      setUpdatingUserId(userId);

      const res = await updateAdminUserRole(userId, role);
      replaceUser(res.data);
      toast.success(res.message);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update user role."));
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleStatusChange(userId: string, status: UserStatus) {
    const user = users.find((item) => item.id === userId);
    const confirmed = await confirm({
      title: "Change account status?",
      description: `Set ${user?.username ?? "this user"} to ${status}. Suspended or banned users may lose access immediately.`,
      confirmText: "Update status",
      tone: status === "ACTIVE" ? "success" : "danger",
    });

    if (!confirmed) return;

    try {
      setUpdatingUserId(userId);

      const res = await updateAdminUserStatus(userId, status);
      replaceUser(res.data);
      toast.success(res.message);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update user status."));
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleResolveDispute(
    disputeId: string,
    decision: ResolveDisputeDecision,
  ) {
    const dispute = disputes.find((item) => item.id === disputeId);
    const confirmed = await confirm({
      title: "Resolve dispute?",
      description: `Apply ${decision} to "${dispute?.reason ?? "this dispute"}".`,
      confirmText: "Resolve",
      tone: decision === "REMATCH" ? "warning" : "success",
    });

    if (!confirmed) return;

    try {
      setResolvingDisputeId(disputeId);
      const res = await resolveDispute(disputeId, { decision });
      toast.success(res.message);
      await loadDashboard();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to resolve dispute."));
    } finally {
      setResolvingDisputeId(null);
    }
  }

  const openDisputes = disputes.filter((item) => item.status === "OPEN").length;
  const activeUsers = users.filter((item) => item.status === "ACTIVE").length;
  const suspendedUsers = users.filter(
    (item) => item.status === "SUSPENDED",
  ).length;
  const bannedUsers = users.filter((item) => item.status === "BANNED").length;
  const pendingTournaments = tournaments.filter(
    (item) => item.status === "PENDING_APPROVAL",
  ).length;
  const runningTournaments = tournaments.filter((item) =>
    ["READY", "MATCH_SCHEDULED", "IN_PROGRESS"].includes(item.status),
  ).length;

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          textMatches(
            [user.username, user.email, user.role, user.status],
            dashboardQuery,
          ) && filterMatches([user.role, user.status], dashboardFilter),
      ),
    [dashboardFilter, dashboardQuery, users],
  );

  const filteredTeams = useMemo(
    () =>
      teams.filter(
        (team) =>
          textMatches(
            [
              team.name,
              team.description,
              team.captain.username,
              team.captain.email,
              team.captain.status,
            ],
            dashboardQuery,
          ) &&
          filterMatches(
            [team.captain.role, team.captain.status],
            dashboardFilter,
          ),
      ),
    [dashboardFilter, dashboardQuery, teams],
  );

  const filteredTournaments = useMemo(
    () =>
      tournaments.filter(
        (tournament) =>
          textMatches(
            [
              tournament.name,
              tournament.game,
              tournament.status,
              tournament.organizer.username,
              tournament.organizer.email,
            ],
            dashboardQuery,
          ) &&
          filterMatches(
            [
              tournament.status,
              tournament.organizer.role,
              tournament.organizer.status,
            ],
            dashboardFilter,
          ),
      ),
    [dashboardFilter, dashboardQuery, tournaments],
  );

  const filteredDisputes = useMemo(
    () =>
      disputes.filter(
        (dispute) =>
          textMatches(
            [
              dispute.reason,
              dispute.description,
              dispute.status,
              dispute.match.tournament?.name,
              dispute.match.tournament?.game,
              dispute.matchId,
            ],
            dashboardQuery,
          ) &&
          filterMatches(
            [
              dispute.status,
              dispute.match.status,
              dispute.match.tournament?.status,
            ],
            dashboardFilter,
          ),
      ),
    [dashboardFilter, dashboardQuery, disputes],
  );

  const filteredAuditLogs = useMemo(
    () =>
      auditLogs.filter(
        (log) =>
          textMatches(
            [log.action, log.entityType, log.entityId, log.metadata],
            dashboardQuery,
          ) && filterMatches([log.action, log.entityType], dashboardFilter),
      ),
    [auditLogs, dashboardFilter, dashboardQuery],
  );

  const userPage = Math.min(
    sectionPages.users,
    getTotalPages(filteredUsers.length, adminPageSize),
  );
  const teamPage = Math.min(
    sectionPages.teams,
    getTotalPages(filteredTeams.length, adminPageSize),
  );
  const tournamentPage = Math.min(
    sectionPages.tournaments,
    getTotalPages(filteredTournaments.length, adminPageSize),
  );
  const disputePage = Math.min(
    sectionPages.disputes,
    getTotalPages(filteredDisputes.length, adminPageSize),
  );
  const auditLogPage = Math.min(
    sectionPages.auditLogs,
    getTotalPages(filteredAuditLogs.length, adminPageSize),
  );

  const pagedUsers = paginateItems(filteredUsers, userPage, adminPageSize);
  const pagedTeams = paginateItems(filteredTeams, teamPage, adminPageSize);
  const pagedTournaments = paginateItems(
    filteredTournaments,
    tournamentPage,
    adminPageSize,
  );
  const pagedDisputes = paginateItems(
    filteredDisputes,
    disputePage,
    adminPageSize,
  );
  const pagedAuditLogs = paginateItems(
    filteredAuditLogs,
    auditLogPage,
    adminPageSize,
  );

  const totalFiltered =
    filteredUsers.length +
    filteredTeams.length +
    filteredTournaments.length +
    filteredDisputes.length +
    filteredAuditLogs.length;

  const sectionLinks = [
    {
      href: "#admin-users",
      label: "Users",
      count: filteredUsers.length,
      icon: <UserCog className="size-4" />,
    },
    {
      href: "#admin-teams",
      label: "Teams",
      count: filteredTeams.length,
      icon: <Layers3 className="size-4" />,
    },
    {
      href: "#admin-tournaments",
      label: "Tournaments",
      count: filteredTournaments.length,
      icon: <Trophy className="size-4" />,
    },
    {
      href: "#admin-disputes",
      label: "Disputes",
      count: filteredDisputes.length,
      icon: <Gavel className="size-4" />,
    },
    {
      href: "#admin-audit",
      label: "Audit",
      count: filteredAuditLogs.length,
      icon: <ClipboardList className="size-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_42%,#050816_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />

      <div className="mx-auto max-w-7xl">
        <motion.header
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]"
        >
          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
                <ShieldCheck className="size-4" />
                Admin Control Center
              </span>
              {pageError ? (
                <DataPill tone="red" icon={<ShieldAlert className="size-3.5" />}>
                  degraded
                </DataPill>
              ) : (
                <DataPill
                  tone="emerald"
                  icon={<BadgeCheck className="size-3.5" />}
                >
                  operational
                </DataPill>
              )}
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              System Management
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
              Monitor accounts, teams, tournaments, disputes, and sensitive
              activity from a single operations surface built for quick admin
              decisions.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <DataPill tone="cyan" icon={<Activity className="size-3.5" />}>
                {totalFiltered} visible records
              </DataPill>
              <DataPill tone="amber" icon={<AlertTriangle className="size-3.5" />}>
                {openDisputes} open disputes
              </DataPill>
              <DataPill tone="violet" icon={<Trophy className="size-3.5" />}>
                {runningTournaments} live events
              </DataPill>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-[#09111f]/85 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  System pulse
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {pageError ? "Needs attention" : "Clear to operate"}
                </p>
              </div>
              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(34,211,238,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`size-4 ${loading && !shouldReduceMotion ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                <span className="text-sm font-bold text-slate-400">
                  Active users
                </span>
                <span className="font-black text-emerald-100">
                  {activeUsers}/{users.length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                <span className="text-sm font-bold text-slate-400">
                  Restricted accounts
                </span>
                <span className="font-black text-red-100">
                  {suspendedUsers + bannedUsers}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                <span className="text-sm font-bold text-slate-400">
                  Pending approvals
                </span>
                <span className="font-black text-amber-100">
                  {pendingTournaments}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                <span className="text-sm font-bold text-slate-400">
                  Latest audit
                </span>
                <span className="max-w-40 truncate text-right text-sm font-black text-cyan-100">
                  {auditLogs[0]?.action ?? "N/A"}
                </span>
              </div>
            </div>
          </section>
        </motion.header>

        <section className="mt-5 grid gap-4 md:grid-cols-5">
          <KpiCard
            index={0}
            icon={<Users className="size-5" />}
            label="Users"
            value={users.length}
            helper={`${activeUsers} active`}
            tone="cyan"
          />
          <KpiCard
            index={1}
            icon={<Layers3 className="size-5" />}
            label="Teams"
            value={teams.length}
            helper={`${teams.reduce((sum, team) => sum + (team._count?.members ?? 0), 0)} members`}
            tone="violet"
          />
          <KpiCard
            index={2}
            icon={<Trophy className="size-5" />}
            label="Tournaments"
            value={tournaments.length}
            helper={`${runningTournaments} running`}
            tone="amber"
          />
          <KpiCard
            index={3}
            icon={<Gavel className="size-5" />}
            label="Disputes"
            value={disputes.length}
            helper={`${openDisputes} open`}
            tone="red"
          />
          <KpiCard
            index={4}
            icon={<ClipboardList className="size-5" />}
            label="Audit Logs"
            value={auditLogs.length}
            helper="tracked actions"
            tone="emerald"
          />
        </section>

        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="sticky top-4 z-20 mt-5 rounded-[1.5rem] border border-white/10 bg-[#081120]/92 p-3 shadow-[0_18px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl"
        >
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
              <input
                value={dashboardQuery}
                onChange={(event) =>
                  handleDashboardQueryChange(event.target.value)
                }
                className="min-h-12 w-full rounded-2xl border border-white/10 bg-[#050816]/85 py-3 pl-12 pr-12 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/10"
                placeholder="Search users, teams, tournaments, disputes, audit logs"
              />
              {dashboardQuery && (
                <button
                  type="button"
                  onClick={() => handleDashboardQueryChange("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  <X className="size-4" />
                </button>
              )}
            </label>

            <label className="relative block">
              <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
              <select
                value={dashboardFilter}
                onChange={(event) =>
                  handleDashboardFilterChange(event.target.value)
                }
                className="min-h-12 w-full appearance-none rounded-2xl border border-white/10 bg-[#050816]/85 py-3 pl-12 pr-4 text-sm font-black text-white outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/10"
              >
                {adminFilterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALL" ? "All filters" : option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {sectionLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                {item.icon}
                {item.label}
                <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] text-cyan-100">
                  {item.count}
                </span>
              </a>
            ))}
          </div>
        </motion.section>

        {pageError && !loading && (
          <ErrorState
            compact
            title="Admin data could not refresh"
            description={pageError}
            action={
              <button
                type="button"
                onClick={loadDashboard}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-red-300 px-5 text-sm font-black text-black transition hover:bg-red-200"
              >
                <RefreshCw className="size-4" />
                Retry
              </button>
            }
            className="mt-6"
          />
        )}

        <Panel
          id="admin-users"
          icon={<UserCog className="size-6" />}
          title="Users"
          description="Manage roles, account access, and team participation for every registered player."
          count={`${filteredUsers.length} records`}
          className="mt-6"
        >
          {filteredUsers.length === 0 ? (
            <EmptyOrLoading
              loading={loading}
              isEmpty={users.length === 0}
              loadingTitle="Loading users..."
              loadingDescription="Reading accounts, roles and team counts."
              emptyTitle={users.length === 0 ? "No users found" : "No users match"}
              emptyDescription={
                users.length === 0
                  ? "New accounts will appear here after registration."
                  : "Try another keyword or filter."
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] border-separate border-spacing-y-3 text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-4">User</th>
                      <th className="px-4">Role</th>
                      <th className="px-4">Status</th>
                      <th className="px-4">Teams</th>
                      <th className="px-4">Joined</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagedUsers.map((user) => (
                      <tr key={user.id} className="group">
                        <td className="rounded-l-2xl border-y border-l border-white/10 bg-black/25 px-4 py-4 transition group-hover:bg-white/[0.055]">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-black text-cyan-100">
                              {getInitials(user.username)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-black text-white">
                                {user.username}
                              </p>
                              <p className="mt-1 flex items-center gap-2 truncate text-sm text-slate-400">
                                <Mail className="size-3.5 shrink-0" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="border-y border-white/10 bg-black/25 px-4 py-4 transition group-hover:bg-white/[0.055]">
                          <select
                            value={user.role}
                            disabled={updatingUserId === user.id}
                            onChange={(event) =>
                              handleRoleChange(
                                user.id,
                                event.target.value as UserRole,
                              )
                            }
                            className="min-h-11 w-40 rounded-2xl border border-white/10 bg-[#050816] px-3 text-sm font-black text-white outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-50"
                          >
                            {userRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border-y border-white/10 bg-black/25 px-4 py-4 transition group-hover:bg-white/[0.055]">
                          <select
                            value={user.status}
                            disabled={updatingUserId === user.id}
                            onChange={(event) =>
                              handleStatusChange(
                                user.id,
                                event.target.value as UserStatus,
                              )
                            }
                            className="min-h-11 w-40 rounded-2xl border border-white/10 bg-[#050816] px-3 text-sm font-black text-white outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-50"
                          >
                            {userStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border-y border-white/10 bg-black/25 px-4 py-4 text-sm text-slate-300 transition group-hover:bg-white/[0.055]">
                          <div className="flex flex-wrap gap-2">
                            <DataPill tone="cyan">
                              Captain {user._count?.captainTeams ?? 0}
                            </DataPill>
                            <DataPill tone="slate">
                              Member {user._count?.teamMembers ?? 0}
                            </DataPill>
                          </div>
                        </td>

                        <td className="rounded-r-2xl border-y border-r border-white/10 bg-black/25 px-4 py-4 text-sm text-slate-500 transition group-hover:bg-white/[0.055]">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={userPage}
                pageSize={adminPageSize}
                totalItems={filteredUsers.length}
                onPageChange={(nextPage) =>
                  updateSectionPage("users", nextPage)
                }
                className="mt-4"
              />
            </>
          )}
        </Panel>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel
            id="admin-teams"
            icon={<Layers3 className="size-6" />}
            title="Teams"
            description="Inspect captains, roster size, invites, and tournament registration activity."
            count={`${filteredTeams.length} teams`}
          >
            <div className="space-y-4">
              {filteredTeams.length === 0 ? (
                <EmptyOrLoading
                  loading={loading}
                  isEmpty={teams.length === 0}
                  loadingTitle="Loading teams..."
                  loadingDescription="Gathering team rosters and captain data."
                  emptyTitle={teams.length === 0 ? "No teams found" : "No teams match"}
                  emptyDescription={
                    teams.length === 0
                      ? "Teams created by players will be listed here."
                      : "Try another keyword or filter."
                  }
                />
              ) : (
                <>
                  {pagedTeams.map((team) => (
                    <article
                      key={team.id}
                      className="rounded-2xl border border-white/10 bg-black/25 p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.055]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-sm font-black text-violet-100">
                          {getInitials(team.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-lg font-black text-white">
                                {team.name}
                              </p>
                              <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                                <UserRoundCheck className="size-4" />
                                Captain {team.captain.username}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <DataPill tone="violet">
                                {team._count?.members ?? 0} members
                              </DataPill>
                              <DataPill tone="cyan">
                                {team._count?.registrations ?? 0} registrations
                              </DataPill>
                            </div>
                          </div>

                          <p className="mt-4 text-sm leading-6 text-slate-400">
                            {team.description ?? "No description"}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <DataPill icon={<Mail className="size-3.5" />}>
                              {team.captain.email}
                            </DataPill>
                            <DataPill icon={<Hash className="size-3.5" />}>
                              {team._count?.invites ?? 0} invites
                            </DataPill>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}

                  <Pagination
                    page={teamPage}
                    pageSize={adminPageSize}
                    totalItems={filteredTeams.length}
                    onPageChange={(nextPage) =>
                      updateSectionPage("teams", nextPage)
                    }
                  />
                </>
              )}
            </div>
          </Panel>

          <Panel
            id="admin-tournaments"
            icon={<Trophy className="size-6" />}
            title="Tournaments"
            description="Review lifecycle state, organizer ownership, capacity, and match volume."
            count={`${filteredTournaments.length} events`}
          >
            <div className="space-y-4">
              {filteredTournaments.length === 0 ? (
                <EmptyOrLoading
                  loading={loading}
                  isEmpty={tournaments.length === 0}
                  loadingTitle="Loading tournaments..."
                  loadingDescription="Checking active and archived events."
                  emptyTitle={
                    tournaments.length === 0
                      ? "No tournaments found"
                      : "No tournaments match"
                  }
                  emptyDescription={
                    tournaments.length === 0
                      ? "Organizer-created tournaments will appear here."
                      : "Try another keyword or filter."
                  }
                />
              ) : (
                <>
                  {pagedTournaments.map((tournament) => {
                    const capacity = getTournamentCapacity(tournament);
                    const registered = tournament._count?.registrations ?? 0;

                    return (
                      <article
                        key={tournament.id}
                        className="rounded-2xl border border-white/10 bg-black/25 p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.055]"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black text-white">
                              {formatTournamentName(tournament.name)}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {tournament.game} by{" "}
                              {tournament.organizer.username}
                            </p>
                          </div>
                          <StatusPill value={tournament.status} />
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                            <span>Capacity</span>
                            <span>
                              {registered}/{tournament.maxTeams}
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-amber-300"
                              style={{ width: `${capacity}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-3">
                          <DataPill tone="amber">
                            {tournament._count?.matches ?? 0} matches
                          </DataPill>
                          <DataPill tone="cyan">
                            Team size {tournament.teamSize}
                          </DataPill>
                          <DataPill tone="slate">
                            Starts {formatDate(tournament.startDate)}
                          </DataPill>
                        </div>
                      </article>
                    );
                  })}

                  <Pagination
                    page={tournamentPage}
                    pageSize={adminPageSize}
                    totalItems={filteredTournaments.length}
                    onPageChange={(nextPage) =>
                      updateSectionPage("tournaments", nextPage)
                    }
                  />
                </>
              )}
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel
            id="admin-disputes"
            icon={<Gavel className="size-6" />}
            title="Disputes"
            description="Resolve contested matches with scores, reports, and evidence links in view."
            count={`${filteredDisputes.length} reports`}
          >
            <div className="space-y-4">
              {filteredDisputes.length === 0 ? (
                <EmptyOrLoading
                  loading={loading}
                  isEmpty={disputes.length === 0}
                  loadingTitle="Loading disputes..."
                  loadingDescription="Scanning open reports across matches."
                  emptyTitle={
                    disputes.length === 0 ? "No disputes found" : "No disputes match"
                  }
                  emptyDescription={
                    disputes.length === 0
                      ? "When players report a match issue, it lands here."
                      : "Try another keyword or filter."
                  }
                />
              ) : (
                <>
                  {pagedDisputes.map((dispute) => (
                    <article
                      key={dispute.id}
                      className="rounded-2xl border border-white/10 bg-black/25 p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.055]"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black text-white">
                            {dispute.reason}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {dispute.match.tournament?.name
                              ? formatTournamentName(dispute.match.tournament.name)
                              : `Match #${dispute.matchId.slice(0, 8)}`}
                          </p>
                        </div>
                        <StatusPill value={dispute.status} />
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-400">
                        {dispute.description ?? "No description"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <DataPill icon={<CalendarClock className="size-3.5" />}>
                          {formatDate(dispute.createdAt)}
                        </DataPill>
                        {dispute.match.pendingScoreA !== null &&
                          dispute.match.pendingScoreB !== null && (
                            <DataPill tone="amber">
                              Pending score {dispute.match.pendingScoreA} -{" "}
                              {dispute.match.pendingScoreB}
                            </DataPill>
                          )}
                      </div>

                      {dispute.match.evidences?.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {dispute.match.evidences
                            .slice(0, 4)
                            .map((evidence, index) => (
                              <a
                                key={evidence.id}
                                href={evidence.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-cyan-100 transition hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                              >
                                <Link2 className="size-3.5" />
                                Evidence {index + 1}
                              </a>
                            ))}
                        </div>
                      ) : null}

                      {dispute.status === "OPEN" && (
                        <div className="mt-5 grid gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleResolveDispute(
                                dispute.id,
                                "APPROVE_TEAM_A_RESULT",
                              )
                            }
                            disabled={resolvingDisputeId === dispute.id}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-3 text-xs font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                          >
                            {resolvingDisputeId === dispute.id && (
                              <Loader2 className="size-4 animate-spin" />
                            )}
                            Team A
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleResolveDispute(
                                dispute.id,
                                "APPROVE_TEAM_B_RESULT",
                              )
                            }
                            disabled={resolvingDisputeId === dispute.id}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-violet-300 px-3 text-xs font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                          >
                            {resolvingDisputeId === dispute.id && (
                              <Loader2 className="size-4 animate-spin" />
                            )}
                            Team B
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleResolveDispute(dispute.id, "REMATCH")
                            }
                            disabled={resolvingDisputeId === dispute.id}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-3 text-xs font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                          >
                            {resolvingDisputeId === dispute.id && (
                              <Loader2 className="size-4 animate-spin" />
                            )}
                            Rematch
                          </button>
                        </div>
                      )}
                    </article>
                  ))}

                  <Pagination
                    page={disputePage}
                    pageSize={adminPageSize}
                    totalItems={filteredDisputes.length}
                    onPageChange={(nextPage) =>
                      updateSectionPage("disputes", nextPage)
                    }
                  />
                </>
              )}
            </div>
          </Panel>

          <Panel
            id="admin-audit"
            icon={<ClipboardList className="size-6" />}
            title="Audit Logs"
            description="Trace sensitive admin operations with entity targets and raw metadata."
            count={`${filteredAuditLogs.length} events`}
          >
            <div className="space-y-3">
              {filteredAuditLogs.length === 0 ? (
                <EmptyOrLoading
                  loading={loading}
                  isEmpty={auditLogs.length === 0}
                  loadingTitle="Loading audit logs..."
                  loadingDescription="Collecting the latest administrative activity."
                  emptyTitle={
                    auditLogs.length === 0
                      ? "No audit logs found"
                      : "No audit logs match"
                  }
                  emptyDescription={
                    auditLogs.length === 0
                      ? "Sensitive system actions will be recorded here."
                      : "Try another keyword or filter."
                  }
                />
              ) : (
                <>
                  {pagedAuditLogs.map((log) => (
                    <article
                      key={log.id}
                      className="relative rounded-2xl border border-white/10 bg-black/25 p-5 pl-6 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.055]"
                    >
                      <div className="absolute bottom-5 left-0 top-5 w-1 rounded-r-full bg-emerald-300" />
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">
                            {log.action}
                          </p>
                          <p className="mt-1 flex flex-wrap gap-2 text-sm text-slate-400">
                            <DataPill icon={<Database className="size-3.5" />}>
                              {log.entityType}
                            </DataPill>
                            <DataPill icon={<Hash className="size-3.5" />}>
                              #{log.entityId.slice(0, 8)}
                            </DataPill>
                          </p>
                        </div>

                        <p className="shrink-0 text-xs font-bold text-slate-500">
                          {formatDate(log.createdAt)}
                        </p>
                      </div>

                      {log.metadata && (
                        <p className="mt-4 max-h-32 overflow-auto break-all rounded-xl border border-white/10 bg-white/[0.055] p-3 font-mono text-xs leading-5 text-slate-400">
                          {log.metadata}
                        </p>
                      )}
                    </article>
                  ))}

                  <Pagination
                    page={auditLogPage}
                    pageSize={adminPageSize}
                    totalItems={filteredAuditLogs.length}
                    onPageChange={(nextPage) =>
                      updateSectionPage("auditLogs", nextPage)
                    }
                  />
                </>
              )}
            </div>
          </Panel>
        </section>
      </div>
    </div>
  );
}
