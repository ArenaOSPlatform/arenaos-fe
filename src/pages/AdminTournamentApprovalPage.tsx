import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Trophy, XCircle } from "lucide-react";
import {
  approveAdminTournament,
  getAdminTournamentApprovals,
  rejectAdminTournament,
  type AdminTournament,
} from "@/services/admin.service";
import { EmptyState, LoadingState, useConfirm, useToast } from "@/components/ui";

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

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "OPEN_REGISTRATION"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : value === "PENDING_APPROVAL"
        ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
        : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${tone}`}>
      {value}
    </span>
  );
}

export function AdminTournamentApprovalPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

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

  async function handleReject(tournament: AdminTournament) {
    const reason = prompt("Reject reason") ?? "";
    const confirmed = await confirm({
      title: "Reject tournament?",
      description: `${tournament.name} will return to Draft for organizer edits.`,
      confirmText: "Reject",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setActionId(tournament.id);
      const res = await rejectAdminTournament(tournament.id, reason);
      toast.success(res.message);
      await loadTournaments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Reject tournament failed."));
    } finally {
      setActionId(null);
    }
  }

  const pendingCount = tournaments.filter(
    (item) => item.status === "PENDING_APPROVAL",
  ).length;

  return (
    <div className="min-h-screen bg-[#0B1020] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
              ADMIN APPROVAL
            </p>
            <h1 className="mt-4 text-5xl font-black">Tournament Approvals</h1>
            <p className="mt-4 max-w-2xl text-white/60">
              Approve submitted drafts before registration opens.
            </p>
          </div>

          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <Trophy className="mb-3 text-amber-200" />
            <p className="text-sm text-white/50">Pending</p>
            <p className="mt-1 text-3xl font-black">{pendingCount}</p>
          </div>
        </div>

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
        ) : (
          <div className="space-y-4">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black">{tournament.name}</h2>
                      <StatusPill value={tournament.status} />
                    </div>
                    <p className="mt-1 text-sm text-white/50">
                      {tournament.game} · {tournament.organizer.username} ·{" "}
                      {tournament.maxTeams} slots
                    </p>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">
                      {tournament.description ?? "No description provided."}
                    </p>
                    <div className="mt-4 grid gap-3 text-sm text-white/50 md:grid-cols-3">
                      <p>Format: {tournament.format}</p>
                      <p>
                        Start:{" "}
                        {new Date(tournament.startDate).toLocaleDateString()}
                      </p>
                      <p>
                        Deadline:{" "}
                        {new Date(
                          tournament.registrationDeadline,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {tournament.rules && (
                      <p className="mt-4 rounded-2xl bg-black/30 p-3 text-sm text-white/55">
                        {tournament.rules}
                      </p>
                    )}
                  </div>

                  {tournament.status === "PENDING_APPROVAL" && (
                    <div className="flex shrink-0 flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleApprove(tournament)}
                        disabled={actionId === tournament.id}
                        className="flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black hover:bg-emerald-300 disabled:opacity-50"
                      >
                        {actionId === tournament.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(tournament)}
                        disabled={actionId === tournament.id}
                        className="flex items-center gap-2 rounded-2xl bg-red-400 px-5 py-3 text-sm font-black text-black hover:bg-red-300 disabled:opacity-50"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
