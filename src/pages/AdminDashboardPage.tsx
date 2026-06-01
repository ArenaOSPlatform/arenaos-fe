import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Layers3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";
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
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  getTotalPages,
  paginateItems,
  useConfirm,
  useToast,
} from "@/components/ui";

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

function getInitialSectionPages(): Record<AdminListSection, number> {
  return {
    users: 1,
    teams: 1,
    tournaments: 1,
    disputes: 1,
    auditLogs: 1,
  };
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

  return new Date(value).toLocaleString();
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "ACTIVE" || value === "RESOLVED" || value === "COMPLETED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : value === "BANNED" || value === "OPEN" || value === "DISPUTED"
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${tone}`}
    >
      {value}
    </span>
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
      const message = getApiErrorMessage(err, "Failed to load admin dashboard.");

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
            [dispute.status, dispute.match.status, dispute.match.tournament?.status],
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

  return (
    <div className="min-h-screen bg-[#0B1020] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
              ADMIN CONTROL CENTER
            </p>
            <h1 className="mt-3 text-4xl font-black">System Management</h1>
          </div>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex w-fit items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <Users className="mb-3 text-cyan-400" />
            <p className="text-sm text-white/50">Users</p>
            <p className="mt-1 text-3xl font-black">{users.length}</p>
            <p className="mt-1 text-xs text-white/40">{activeUsers} active</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <Layers3 className="mb-3 text-violet-400" />
            <p className="text-sm text-white/50">Teams</p>
            <p className="mt-1 text-3xl font-black">{teams.length}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <Trophy className="mb-3 text-yellow-300" />
            <p className="text-sm text-white/50">Tournaments</p>
            <p className="mt-1 text-3xl font-black">{tournaments.length}</p>
          </div>

          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
            <AlertTriangle className="mb-3 text-red-400" />
            <p className="text-sm text-white/50">Disputes</p>
            <p className="mt-1 text-3xl font-black">{disputes.length}</p>
            <p className="mt-1 text-xs text-white/40">{openDisputes} open</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <Activity className="mb-3 text-emerald-300" />
            <p className="text-sm text-white/50">Audit Logs</p>
            <p className="mt-1 text-3xl font-black">{auditLogs.length}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_240px]">
          <label className="relative block">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              value={dashboardQuery}
              onChange={(event) =>
                handleDashboardQueryChange(event.target.value)
              }
              className="w-full rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-12 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-cyan-400/50"
              placeholder="Search admin data"
            />
          </label>

          <label className="relative block">
            <SlidersHorizontal
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <select
              value={dashboardFilter}
              onChange={(event) =>
                handleDashboardFilterChange(event.target.value)
              }
              className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-12 pr-4 text-sm font-bold outline-none focus:border-cyan-400/50"
            >
              {adminFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All filters" : option}
                </option>
              ))}
            </select>
          </label>
        </section>

        {pageError && !loading && (
          <ErrorState
            compact
            title="Admin data could not refresh"
            description={pageError}
            action={
              <button
                type="button"
                onClick={loadDashboard}
                className="flex items-center gap-2 rounded-2xl bg-red-300 px-5 py-3 font-black text-black hover:bg-red-200"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            }
            className="mt-6"
          />
        )}

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-6 flex items-center gap-3">
            <UserCog className="text-cyan-400" />
            <h2 className="text-2xl font-black">Users</h2>
          </div>

          {filteredUsers.length === 0 ? (
            loading ? (
              <LoadingState
                compact
                title="Loading users..."
                description="Reading accounts, roles and team counts."
              />
            ) : (
              <EmptyState
                compact
                title={users.length === 0 ? "No users found" : "No users match"}
                description={
                  users.length === 0
                    ? "New accounts will appear here after registration."
                    : "Try another keyword or filter."
                }
              />
            )
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-separate border-spacing-y-3 text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.2em] text-white/40">
                      <th className="px-4">User</th>
                      <th className="px-4">Role</th>
                      <th className="px-4">Status</th>
                      <th className="px-4">Teams</th>
                      <th className="px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map((user) => (
                      <tr key={user.id} className="bg-black/30">
                        <td className="rounded-l-2xl px-4 py-4">
                          <p className="font-black">{user.username}</p>
                          <p className="mt-1 text-sm text-white/50">
                            {user.email}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={user.role}
                            disabled={updatingUserId === user.id}
                            onChange={(event) =>
                              handleRoleChange(
                                user.id,
                                event.target.value as UserRole,
                              )
                            }
                            className="w-36 rounded-xl border border-white/10 bg-[#0B1020] px-3 py-2 text-sm font-bold outline-none"
                          >
                            {userRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={user.status}
                            disabled={updatingUserId === user.id}
                            onChange={(event) =>
                              handleStatusChange(
                                user.id,
                                event.target.value as UserStatus,
                              )
                            }
                            className="w-36 rounded-xl border border-white/10 bg-[#0B1020] px-3 py-2 text-sm font-bold outline-none"
                          >
                            {userStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 text-sm text-white/60">
                          Captain {user._count?.captainTeams ?? 0} / Member{" "}
                          {user._count?.teamMembers ?? 0}
                        </td>
                        <td className="rounded-r-2xl px-4 py-4 text-sm text-white/50">
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
                onPageChange={(nextPage) => updateSectionPage("users", nextPage)}
                className="mt-4"
              />
            </>
          )}
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Layers3 className="text-violet-400" />
              <h2 className="text-2xl font-black">Teams</h2>
            </div>

            <div className="space-y-4">
              {filteredTeams.length === 0 ? (
                loading ? (
                  <LoadingState
                    compact
                    title="Loading teams..."
                    description="Gathering team rosters and captain data."
                  />
                ) : (
                  <EmptyState
                    compact
                    title={teams.length === 0 ? "No teams found" : "No teams match"}
                    description={
                      teams.length === 0
                        ? "Teams created by players will be listed here."
                        : "Try another keyword or filter."
                    }
                  />
                )
              ) : (
                <>
                  {pagedTeams.map((team) => (
                    <div key={team.id} className="rounded-2xl bg-black/30 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black">{team.name}</p>
                          <p className="mt-1 text-sm text-white/50">
                            Captain {team.captain.username}
                          </p>
                        </div>
                        <StatusPill value={`${team._count?.members ?? 0} members`} />
                      </div>
                      <p className="mt-3 text-sm text-white/45">
                        {team.description ?? "No description"}
                      </p>
                    </div>
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
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Trophy className="text-yellow-300" />
              <h2 className="text-2xl font-black">Tournaments</h2>
            </div>

            <div className="space-y-4">
              {filteredTournaments.length === 0 ? (
                loading ? (
                  <LoadingState
                    compact
                    title="Loading tournaments..."
                    description="Checking active and archived events."
                  />
                ) : (
                  <EmptyState
                    compact
                    title={
                      tournaments.length === 0
                        ? "No tournaments found"
                        : "No tournaments match"
                    }
                    description={
                      tournaments.length === 0
                        ? "Organizer-created tournaments will appear here."
                        : "Try another keyword or filter."
                    }
                  />
                )
              ) : (
                <>
                  {pagedTournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="rounded-2xl bg-black/30 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-black">{tournament.name}</p>
                          <p className="mt-1 text-sm text-white/50">
                            {tournament.game} by {tournament.organizer.username}
                          </p>
                        </div>
                        <StatusPill value={tournament.status} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-white/50 md:grid-cols-3">
                        <p>{tournament._count?.registrations ?? 0} registrations</p>
                        <p>{tournament._count?.matches ?? 0} matches</p>
                        <p>{tournament.maxTeams} slots</p>
                      </div>
                    </div>
                  ))}

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
          </div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-6 flex items-center gap-3">
              <ShieldCheck className="text-red-400" />
              <h2 className="text-2xl font-black">Disputes</h2>
            </div>

            <div className="space-y-4">
              {filteredDisputes.length === 0 ? (
                loading ? (
                  <LoadingState
                    compact
                    title="Loading disputes..."
                    description="Scanning open reports across matches."
                  />
                ) : (
                  <EmptyState
                    compact
                    title={
                      disputes.length === 0 ? "No disputes found" : "No disputes match"
                    }
                    description={
                      disputes.length === 0
                        ? "When players report a match issue, it lands here."
                        : "Try another keyword or filter."
                    }
                  />
                )
              ) : (
                <>
                  {pagedDisputes.map((dispute) => (
                    <div
                      key={dispute.id}
                      className="rounded-2xl bg-black/30 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-black">{dispute.reason}</p>
                          <p className="mt-1 text-sm text-white/50">
                            {dispute.match.tournament?.name ?? dispute.matchId}
                          </p>
                        </div>
                        <StatusPill value={dispute.status} />
                      </div>
                      <p className="mt-3 text-sm text-white/45">
                        {dispute.description ?? "No description"}
                      </p>
                      {dispute.match.pendingScoreA !== null &&
                        dispute.match.pendingScoreB !== null && (
                          <p className="mt-3 text-sm font-bold text-amber-200">
                            Pending score: {dispute.match.pendingScoreA} -{" "}
                            {dispute.match.pendingScoreB}
                          </p>
                        )}
                      {dispute.match.evidences?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {dispute.match.evidences
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
                      <p className="mt-3 text-xs text-white/35">
                        Created {formatDate(dispute.createdAt)}
                      </p>

                      {dispute.status === "OPEN" && (
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleResolveDispute(
                                dispute.id,
                                "APPROVE_TEAM_A_RESULT",
                              )
                            }
                            disabled={resolvingDisputeId === dispute.id}
                            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-black hover:bg-cyan-300 disabled:opacity-50"
                          >
                            {resolvingDisputeId === dispute.id && (
                              <Loader2 size={14} className="animate-spin" />
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
                            className="flex items-center justify-center gap-2 rounded-xl bg-violet-400 px-3 py-2 text-xs font-black text-black hover:bg-violet-300 disabled:opacity-50"
                          >
                            {resolvingDisputeId === dispute.id && (
                              <Loader2 size={14} className="animate-spin" />
                            )}
                            Team B
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleResolveDispute(dispute.id, "REMATCH")
                            }
                            disabled={resolvingDisputeId === dispute.id}
                            className="flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-black hover:bg-amber-200 disabled:opacity-50"
                          >
                            {resolvingDisputeId === dispute.id && (
                              <Loader2 size={14} className="animate-spin" />
                            )}
                            Rematch
                          </button>
                        </div>
                      )}
                    </div>
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
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-6 flex items-center gap-3">
              <ClipboardList className="text-emerald-300" />
              <h2 className="text-2xl font-black">Audit Logs</h2>
            </div>

            <div className="space-y-4">
              {filteredAuditLogs.length === 0 ? (
                loading ? (
                  <LoadingState
                    compact
                    title="Loading audit logs..."
                    description="Collecting the latest administrative activity."
                  />
                ) : (
                  <EmptyState
                    compact
                    title={
                      auditLogs.length === 0
                        ? "No audit logs found"
                        : "No audit logs match"
                    }
                    description={
                      auditLogs.length === 0
                        ? "Sensitive system actions will be recorded here."
                        : "Try another keyword or filter."
                    }
                  />
                )
              ) : (
                <>
                  {pagedAuditLogs.map((log) => (
                    <div key={log.id} className="rounded-2xl bg-black/30 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-black">{log.action}</p>
                          <p className="mt-1 text-sm text-white/50">
                            {log.entityType} - {log.entityId}
                          </p>
                        </div>
                        <p className="text-xs text-white/35">
                          {formatDate(log.createdAt)}
                        </p>
                      </div>
                      {log.metadata && (
                        <p className="mt-3 break-all rounded-xl bg-white/5 p-3 text-xs text-white/45">
                          {log.metadata}
                        </p>
                      )}
                    </div>
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
          </div>
        </section>
      </div>
    </div>
  );
}
