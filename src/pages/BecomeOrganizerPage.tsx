import { useEffect, useState } from "react";
import { ClipboardCheck, Clock, Loader2, Send, ShieldCheck } from "lucide-react";
import {
  createOrganizerRequest,
  getMyOrganizerRequests,
  type OrganizerRequest,
} from "@/services/organizer-request.service";
import { EmptyState, LoadingState, useToast } from "@/components/ui";

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

export function BecomeOrganizerPage() {
  const toast = useToast();
  const [requests, setRequests] = useState<OrganizerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [experience, setExperience] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  async function loadRequests() {
    const res = await getMyOrganizerRequests();
    setRequests(res.data);
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await getMyOrganizerRequests();
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

  async function handleSubmit() {
    if (!reason.trim()) {
      toast.warning("Add a short reason before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await createOrganizerRequest({
        reason: reason.trim(),
        experience: experience.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });

      toast.success(res.message);
      setReason("");
      setExperience("");
      setPortfolioUrl("");
      await loadRequests();
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Submit organizer request failed."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const latestRequest = requests[0];
  const hasPending = requests.some((item) => item.status === "PENDING");

  return (
    <div className="min-h-screen bg-[#0B1020] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
            ORGANIZER ACCESS
          </p>
          <h1 className="mt-4 text-5xl font-black">Become Organizer</h1>
          <p className="mt-4 max-w-2xl text-white/60">
            Submit your request for admin review before creating tournaments.
          </p>
        </div>

        {loading ? (
          <LoadingState
            title="Loading request status..."
            description="Checking your latest organizer approval state."
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-6 flex items-center gap-3">
                <ShieldCheck className="text-cyan-300" />
                <h2 className="text-2xl font-black">Request Form</h2>
              </div>

              <div className="space-y-4">
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={hasPending || submitting}
                  placeholder="Why do you want organizer access?"
                  className="min-h-32 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-50"
                />

                <textarea
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                  disabled={hasPending || submitting}
                  placeholder="Tournament or community experience"
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-50"
                />

                <input
                  value={portfolioUrl}
                  onChange={(event) => setPortfolioUrl(event.target.value)}
                  disabled={hasPending || submitting}
                  placeholder="Portfolio or community URL"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={hasPending || submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:bg-cyan-300 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  Submit Request
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-6 flex items-center gap-3">
                <ClipboardCheck className="text-emerald-300" />
                <h2 className="text-2xl font-black">Approval Status</h2>
              </div>

              {requests.length === 0 ? (
                <EmptyState
                  compact
                  icon={Clock}
                  title="No request submitted"
                  description="Your submitted organizer requests will be listed here."
                />
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="rounded-3xl bg-black/30 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black">
                            {new Date(request.createdAt).toLocaleString()}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/55">
                            {request.reason ?? "No reason provided"}
                          </p>
                        </div>
                        <StatusPill value={request.status} />
                      </div>

                      {request.reviewNote && (
                        <p className="mt-4 rounded-2xl bg-white/5 p-3 text-sm text-white/60">
                          {request.reviewNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {latestRequest?.status === "APPROVED" && (
                <p className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-300">
                  Organizer access approved. Refresh your session if the organizer
                  workspace is not visible yet.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
