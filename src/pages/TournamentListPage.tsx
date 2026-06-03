import { getTournaments } from "@/services/tournament.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { formatTournamentName } from "@/utils";
import { useToast } from "@/hooks/useToast";
import { getTotalPages, paginateItems } from "@/utils/paginationUtils";
import {
  ArrowRight,
  CalendarDays,
  Gamepad2,
  Radio,
  RotateCw,
  Search,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Tournament = {
  id: string;
  name: string;
  game: string;
  status: string;
  maxTeams: number;
  prizePool: string | null;
  startDate: string;
};

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
  if (["OPEN_REGISTRATION", "IN_PROGRESS", "COMPLETED"].includes(status)) {
    return "emerald";
  }

  if (["PENDING", "PENDING_APPROVAL", "MATCH_SCHEDULED"].includes(status)) {
    return "amber";
  }

  if (["REJECTED", "DISPUTED", "CANCELLED"].includes(status)) {
    return "red";
  }

  if (["BRACKET_GENERATED", "REGISTRATION_CLOSED"].includes(status)) {
    return "violet";
  }

  return "cyan";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone: Tone;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-4xl font-black leading-none text-white">
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
    </article>
  );
}

export function TournamentListPage() {
  const toast = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  async function fetchTournaments() {
    try {
      setLoading(true);

      const res = await getTournaments();

      setTournaments(res.data);
      setPageError("");
      setPage(1);
    } catch {
      const message = "Failed to load tournaments.";
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTournaments() {
      try {
        const res = await getTournaments();

        if (cancelled) return;

        setTournaments(res.data);
        setPageError("");
      } catch {
        if (cancelled) return;

        const message = "Failed to load tournaments.";
        setPageError(message);
        toast.error(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTournaments();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const statusOptions = useMemo(
    () => Array.from(new Set(tournaments.map((item) => item.status))).sort(),
    [tournaments],
  );

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    setPage(1);
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  const filteredTournaments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tournaments.filter((item) => {
      const matchesQuery =
        !query ||
        [item.name, item.game, item.status, item.prizePool ?? ""].some(
          (value) => value.toLowerCase().includes(query),
        );
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [searchQuery, statusFilter, tournaments]);

  const totalPages = getTotalPages(filteredTournaments.length, pageSize);
  const currentPage = Math.min(page, totalPages);
  const pagedTournaments = paginateItems(
    filteredTournaments,
    currentPage,
    pageSize,
  );
  const openCount = tournaments.filter(
    (item) => item.status === "OPEN_REGISTRATION",
  ).length;
  const liveCount = tournaments.filter((item) =>
    ["IN_PROGRESS", "BRACKET_GENERATED"].includes(item.status),
  ).length;
  const gamesCount = new Set(tournaments.map((item) => item.game)).size;

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#050816_0%,#08111f_46%,#050816_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      {/* Top accent gradient */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
              <Trophy className="size-4" aria-hidden="true" />
              Tournaments
            </span>

            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-5xl lg:text-6xl">
              Live Arena
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
              Browse esports tournaments, join competitions and follow live
              brackets in realtime.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <Radio className="size-4 text-red-200" />
                {liveCount} live bracket{liveCount === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <Users className="size-4 text-cyan-200" />
                {openCount} open registration{openCount === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                <Gamepad2 className="size-4 text-violet-200" />
                {gamesCount} game{gamesCount === 1 ? "" : "s"}
              </span>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#09111f]/85 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Arena Index
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold text-slate-500">Total</p>
                <p className="mt-2 text-3xl font-black">
                  {tournaments.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold text-slate-500">Showing</p>
                <p className="mt-2 text-3xl font-black">
                  {filteredTournaments.length}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchTournaments}
              disabled={loading}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 text-sm font-black text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <RotateCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Arena
            </button>
          </section>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<Trophy className="size-5" />}
            label="Published"
            value={tournaments.length}
            helper="total tournaments"
            tone="amber"
          />
          <MetricCard
            icon={<Users className="size-5" />}
            label="Open"
            value={openCount}
            helper="can join now"
            tone="cyan"
          />
          <MetricCard
            icon={<Radio className="size-5" />}
            label="Live"
            value={liveCount}
            helper="bracket activity"
            tone="red"
          />
        </section>

        <section className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.18)] backdrop-blur-2xl md:grid-cols-[1fr_240px]">
          <label className="relative block">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={searchQuery}
              onChange={(event) => handleSearchQueryChange(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
              placeholder="Search tournaments"
            />
          </label>

          <label className="relative block">
            <SlidersHorizontal
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <select
              value={statusFilter}
              onChange={(event) => handleStatusFilterChange(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070b16] py-3 pl-12 pr-4 text-sm font-bold outline-none transition focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
            >
              <option value="ALL">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
        </section>

        {loading ? (
          <LoadingState
            title="Loading tournaments..."
            description="Finding live and upcoming competitions."
          />
        ) : pageError ? (
          <ErrorState
            icon={Trophy}
            title="Could not load tournaments"
            description={pageError}
            action={
              <button
                type="button"
                onClick={fetchTournaments}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-300 px-5 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-red-200"
              >
                <RotateCw className="size-4" />
                Retry
              </button>
            }
          />
        ) : filteredTournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={
              tournaments.length === 0
                ? "No tournaments available"
                : "No tournaments match"
            }
            description={
              tournaments.length === 0
                ? "When organizers publish tournaments, they will appear in this arena."
                : "Try another keyword or status."
            }
          />
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {pagedTournaments.map((item) => (
                <article
                  key={item.id}
                  className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_22px_90px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1.5 hover:border-cyan-300/35 hover:bg-white/[0.065] hover:shadow-[0_28px_80px_rgba(34,211,238,0.08)]"
                >
                  <div className="mb-7 flex items-start justify-between gap-4">
                    <StatusPill value={item.status} />
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                      <Gamepad2 className="size-5" />
                    </span>
                  </div>

                  <h2 className="mb-3 line-clamp-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                    <Link
                      to={`/tournaments/${item.id}`}
                      className="transition hover:text-cyan-300"
                    >
                      {formatTournamentName(item.name)}
                    </Link>
                  </h2>

                  <p className="text-sm font-bold text-slate-400">
                    {item.game}
                  </p>

                  <div className="mt-7 grid gap-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                      <Users className="size-4 text-cyan-200" />
                      <span className="font-bold">{item.maxTeams} teams</span>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                      <Trophy className="size-4 text-amber-200" />
                      <span className="font-bold">
                        {item.prizePool || "TBA"} prize pool
                      </span>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                      <CalendarDays className="size-4 text-violet-200" />
                      <span className="font-bold">
                        {formatDate(item.startDate)}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/tournaments/${item.id}`}
                    className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(103,232,249,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
                  >
                    View Tournament
                    <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </Link>
                </article>
              ))}
            </div>

            <Pagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={filteredTournaments.length}
              onPageChange={setPage}
              className="mt-6"
            />
          </>
        )}
      </div>
    </div>
  );
}
