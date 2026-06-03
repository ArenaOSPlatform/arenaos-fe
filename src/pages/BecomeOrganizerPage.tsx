import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  History,
  Link2,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  createOrganizerRequest,
  getMyOrganizerRequests,
  type OrganizerRequest,
} from "@/services/organizer-request.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { BackButton } from "@/components/ui/BackButton";
import { useToast } from "@/hooks/useToast";

type StatusMeta = {
  label: string;
  icon: LucideIcon;
  pill: string;
  accent: string;
  panel: string;
};

const statusMeta: Record<string, StatusMeta> = {
  APPROVED: {
    label: "Approved",
    icon: BadgeCheck,
    pill: "border-emerald-300/25 bg-emerald-300/12 text-emerald-100",
    accent: "bg-emerald-300",
    panel: "border-emerald-300/20 bg-emerald-300/[0.055]",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    pill: "border-red-300/25 bg-red-300/12 text-red-100",
    accent: "bg-red-300",
    panel: "border-red-300/20 bg-red-300/[0.055]",
  },
  PENDING: {
    label: "Pending",
    icon: Clock3,
    pill: "border-amber-300/25 bg-amber-300/12 text-amber-100",
    accent: "bg-amber-300",
    panel: "border-amber-300/20 bg-amber-300/[0.055]",
  },
};

const fallbackStatusMeta: StatusMeta = {
  label: "Submitted",
  icon: ClipboardCheck,
  pill: "border-cyan-300/25 bg-cyan-300/12 text-cyan-100",
  accent: "bg-cyan-300",
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

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
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

function FieldShell({
  icon: Icon,
  label,
  helper,
  children,
}: {
  icon: LucideIcon;
  label: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-black text-slate-200">
          <Icon className="size-4 text-cyan-200" aria-hidden="true" />
          {label}
        </span>
        <span className="text-xs font-bold text-slate-500">{helper}</span>
      </div>
      {children}
    </label>
  );
}

function RequestTimelineItem({ request }: { request: OrganizerRequest }) {
  const meta = getStatusMeta(request.status);

  return (
    <article
      className={`relative rounded-2xl border p-5 pl-6 shadow-[0_16px_60px_rgba(0,0,0,0.18)] ${meta.panel}`}
    >
      <div className={`absolute bottom-5 left-0 top-5 w-1 rounded-r-full ${meta.accent}`} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-white">
            <CalendarClock className="size-4 text-cyan-200" aria-hidden="true" />
            {formatDate(request.createdAt)}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {request.reason ?? "No reason provided."}
          </p>
        </div>
        <StatusPill value={request.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {request.organizationName && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <BriefcaseBusiness className="size-3.5 text-cyan-200" />
              Organization
            </p>
            <p className="line-clamp-2 text-sm leading-6 text-slate-300">
              {request.organizationName}
            </p>
          </div>
        )}

        {request.contactEmail && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <UserRoundCheck className="size-3.5 text-cyan-200" />
              Contact
            </p>
            <p className="line-clamp-2 text-sm leading-6 text-slate-300">
              {request.contactEmail}
            </p>
          </div>
        )}

        {request.experience && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <BriefcaseBusiness className="size-3.5 text-cyan-200" />
              Experience
            </p>
            <p className="line-clamp-3 text-sm leading-6 text-slate-300">
              {request.experience}
            </p>
          </div>
        )}

        {request.socialLink && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <Link2 className="size-3.5 text-cyan-200" />
              Social
            </p>
            <a
              href={request.socialLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-cyan-100 transition hover:text-white"
            >
              <span className="truncate">{request.socialLink}</span>
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            </a>
          </div>
        )}

        {request.evidenceUrl && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <FileText className="size-3.5 text-cyan-200" />
              Evidence
            </p>
            <a
              href={request.evidenceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-cyan-100 transition hover:text-white"
            >
              <span className="truncate">{request.evidenceUrl}</span>
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            </a>
          </div>
        )}

        {request.portfolioUrl && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <Link2 className="size-3.5 text-cyan-200" />
              Portfolio
            </p>
            <a
              href={request.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-cyan-100 transition hover:text-white"
            >
              <span className="truncate">{request.portfolioUrl}</span>
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      {request.reviewNote && (
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-300">
          {request.reviewNote}
        </p>
      )}
    </article>
  );
}

export function BecomeOrganizerPage() {
  const toast = useToast();
  const [requests, setRequests] = useState<OrganizerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reason.trim()) {
      toast.warning("Add a short reason before submitting.");
      return;
    }

    if (!organizationName.trim() || !contactEmail.trim()) {
      toast.warning("Organization name and contact email are required.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await createOrganizerRequest({
        organizationName: organizationName.trim(),
        contactEmail: contactEmail.trim(),
        socialLink: socialLink.trim() || undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
        reason: reason.trim(),
        experience: experience.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });

      toast.success(res.message);
      setOrganizationName("");
      setContactEmail("");
      setSocialLink("");
      setEvidenceUrl("");
      setReason("");
      setExperience("");
      setPortfolioUrl("");
      await loadRequests();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Submit organizer request failed."));
    } finally {
      setSubmitting(false);
    }
  }

  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [requests],
  );

  const latestRequest = sortedRequests[0];
  const hasPending = requests.some((item) => item.status === "PENDING");
  const approvedCount = requests.filter((item) => item.status === "APPROVED").length;
  const rejectedCount = requests.filter((item) => item.status === "REJECTED").length;
  const reasonWords = countWords(reason);
  const experienceWords = countWords(experience);
  const completionScore =
    (organizationName.trim() ? 20 : 0) +
    (contactEmail.trim() ? 20 : 0) +
    (reason.trim() ? 25 : 0) +
    (experience.trim() ? 20 : 0) +
    (socialLink.trim() || evidenceUrl.trim() || portfolioUrl.trim() ? 15 : 0);
  const isFormDisabled = hasPending || submitting;
  const statusMetaForLatest = latestRequest
    ? getStatusMeta(latestRequest.status)
    : fallbackStatusMeta;
  const LatestStatusIcon = statusMetaForLatest.icon;

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <BackButton fallbackTo="/team" label="Back to team" />

        <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[2rem] border border-white/10 bg-linear-to-br from-white/[0.09] via-white/[0.045] to-cyan-300/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Organizer Access
            </div>

            <div className="mt-7 max-w-3xl">
              <h1 className="text-4xl font-black leading-[0.95] text-white sm:text-5xl lg:text-6xl">
                Become Organizer
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                Submit a focused organizer application for admin review before
                creating tournaments on ArenaOS.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <Trophy className="size-4 text-amber-200" />
                Tournament operator role
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <ClipboardCheck className="size-4 text-emerald-200" />
                Admin approval required
              </span>
            </div>
          </section>

          <section
            className={`rounded-[2rem] border p-5 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl ${statusMetaForLatest.panel}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Latest status
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {latestRequest ? statusMetaForLatest.label : "Not submitted"}
                </p>
              </div>
              <span
                className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border ${statusMetaForLatest.pill}`}
              >
                <LatestStatusIcon className="size-6" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-bold text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-black">{requests.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-bold text-slate-500">Approved</p>
                <p className="mt-1 text-2xl font-black text-emerald-100">
                  {approvedCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-bold text-slate-500">Rejected</p>
                <p className="mt-1 text-2xl font-black text-red-100">
                  {rejectedCount}
                </p>
              </div>
            </div>

            {latestRequest?.status === "APPROVED" && (
              <p className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-bold leading-6 text-emerald-100">
                Organizer access approved. Refresh your session if the
                organizer workspace is not visible yet.
              </p>
            )}
          </section>
        </header>

        {loading ? (
          <LoadingState
            title="Loading request status..."
            description="Checking your latest organizer approval state."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                    <ShieldCheck className="size-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      Request Form
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {hasPending
                        ? "Your current request is waiting for admin review."
                        : "Your application is ready for a fresh submission."}
                    </p>
                  </div>
                </div>

                <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 sm:w-40">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <span>Ready</span>
                    <span>{completionScore}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-300 transition-all duration-300"
                      style={{ width: `${completionScore}%` }}
                    />
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <FieldShell
                  icon={BriefcaseBusiness}
                  label="Organization"
                  helper={organizationName.trim() ? "Ready" : "Required"}
                >
                  <input
                    value={organizationName}
                    onChange={(event) =>
                      setOrganizationName(event.target.value)
                    }
                    disabled={isFormDisabled}
                    placeholder="Organization name"
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </FieldShell>

                <FieldShell
                  icon={UserRoundCheck}
                  label="Contact Email"
                  helper={contactEmail.trim() ? "Ready" : "Required"}
                >
                  <input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    disabled={isFormDisabled}
                    placeholder="organizer@example.com"
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </FieldShell>

                <FieldShell
                  icon={FileText}
                  label="Reason"
                  helper={`${reasonWords} words`}
                >
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    disabled={isFormDisabled}
                    placeholder="Why do you want organizer access?"
                    className="min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </FieldShell>

                <FieldShell
                  icon={BriefcaseBusiness}
                  label="Experience"
                  helper={`${experienceWords} words`}
                >
                  <textarea
                    value={experience}
                    onChange={(event) => setExperience(event.target.value)}
                    disabled={isFormDisabled}
                    placeholder="Tournament or community experience"
                    className="min-h-32 w-full resize-none rounded-2xl border border-white/10 bg-[#070b16] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </FieldShell>

                <FieldShell
                  icon={Link2}
                  label="Social Link"
                  helper={socialLink.trim() ? "Attached" : "Optional"}
                >
                  <input
                    value={socialLink}
                    onChange={(event) => setSocialLink(event.target.value)}
                    disabled={isFormDisabled}
                    placeholder="Discord, X, Facebook, or community URL"
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </FieldShell>

                <FieldShell
                  icon={FileText}
                  label="Evidence Link"
                  helper={evidenceUrl.trim() ? "Attached" : "Optional"}
                >
                  <input
                    value={evidenceUrl}
                    onChange={(event) => setEvidenceUrl(event.target.value)}
                    disabled={isFormDisabled}
                    placeholder="Evidence file or deck URL"
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </FieldShell>

                <FieldShell
                  icon={Link2}
                  label="Portfolio"
                  helper={portfolioUrl.trim() ? "Attached" : "Optional"}
                >
                  <input
                    value={portfolioUrl}
                    onChange={(event) => setPortfolioUrl(event.target.value)}
                    disabled={isFormDisabled}
                    placeholder="Portfolio or past tournament URL"
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </FieldShell>

                {hasPending && (
                  <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-bold leading-6 text-amber-100">
                    You already have a pending organizer request.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isFormDisabled}
                  className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-4" aria-hidden="true" />
                  )}
                  Submit Request
                </button>
              </form>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                  <History className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">
                    Approval Status
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {sortedRequests.length} submitted request
                    {sortedRequests.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {sortedRequests.length === 0 ? (
                <EmptyState
                  compact
                  icon={Clock3}
                  title="No request submitted"
                  description="Your submitted organizer requests will be listed here."
                />
              ) : (
                <div className="space-y-4">
                  {sortedRequests.map((request) => (
                    <RequestTimelineItem key={request.id} request={request} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <Sparkles className="mb-4 size-6 text-cyan-200" />
            <p className="font-black text-white">Clear positioning</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              A strong reason helps admins understand what kind of events you
              plan to run.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <UserRoundCheck className="mb-4 size-6 text-emerald-200" />
            <p className="font-black text-white">Community proof</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Experience and portfolio links make organizer approval easier to
              evaluate.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <Trophy className="mb-4 size-6 text-amber-200" />
            <p className="font-black text-white">Tournament readiness</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Approved organizers can create and submit tournaments for review.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
