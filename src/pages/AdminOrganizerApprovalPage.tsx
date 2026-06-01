import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import {
  approveAdminOrganizerRequest,
  getAdminOrganizerRequests,
  rejectAdminOrganizerRequest,
  type AdminOrganizerRequest,
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
    value === "APPROVED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : value === "REJECTED"
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : "border-amber-300/20 bg-amber-300/10 text-amber-200";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${tone}`}>
      {value}
    </span>
  );
}

export function AdminOrganizerApprovalPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [requests, setRequests] = useState<AdminOrganizerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

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

  async function handleReject(request: AdminOrganizerRequest) {
    const reason = prompt("Reject reason") ?? "";
    const confirmed = await confirm({
      title: "Reject organizer request?",
      description: `${request.user.username} will remain a player.`,
      confirmText: "Reject",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setActionId(request.id);
      const res = await rejectAdminOrganizerRequest(request.id, reason);
      toast.success(res.message);
      await loadRequests();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Reject organizer request failed."));
    } finally {
      setActionId(null);
    }
  }

  const pendingRequests = requests.filter((item) => item.status === "PENDING");

  return (
    <div className="min-h-screen bg-[#0B1020] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
              ADMIN APPROVAL
            </p>
            <h1 className="mt-4 text-5xl font-black">Organizer Requests</h1>
            <p className="mt-4 max-w-2xl text-white/60">
              Review player requests before granting organizer permissions.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
            <UserCheck className="mb-3 text-cyan-300" />
            <p className="text-sm text-white/50">Pending</p>
            <p className="mt-1 text-3xl font-black">{pendingRequests.length}</p>
          </div>
        </div>

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
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black">
                        {request.user.username}
                      </h2>
                      <StatusPill value={request.status} />
                    </div>
                    <p className="mt-1 text-sm text-white/50">
                      {request.user.email} · {request.user.role} ·{" "}
                      {request.user.status}
                    </p>
                    <p className="mt-4 text-sm leading-6 text-white/65">
                      {request.reason ?? "No reason provided"}
                    </p>
                    {request.experience && (
                      <p className="mt-3 rounded-2xl bg-black/30 p-3 text-sm text-white/55">
                        {request.experience}
                      </p>
                    )}
                    {request.portfolioUrl && (
                      <a
                        href={request.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm font-bold text-cyan-300 hover:text-cyan-200"
                      >
                        {request.portfolioUrl}
                      </a>
                    )}
                    {request.reviewNote && (
                      <p className="mt-3 text-sm text-red-300">
                        {request.reviewNote}
                      </p>
                    )}
                  </div>

                  {request.status === "PENDING" && (
                    <div className="flex shrink-0 flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleApprove(request)}
                        disabled={actionId === request.id}
                        className="flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black hover:bg-emerald-300 disabled:opacity-50"
                      >
                        {actionId === request.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(request)}
                        disabled={actionId === request.id}
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
