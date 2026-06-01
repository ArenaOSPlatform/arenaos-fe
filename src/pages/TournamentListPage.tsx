import { getTournaments } from "@/services/tournament.service";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  getTotalPages,
  paginateItems,
  useToast,
} from "@/components/ui";
import {
  CalendarDays,
  Gamepad2,
  RotateCw,
  Search,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

  return (
    <div className="min-h-screen bg-[#0B1020] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12">
          <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
            TOURNAMENTS
          </p>
          <h1 className="mt-4 text-5xl font-black">Live Arena</h1>
          <p className="mt-4 max-w-2xl text-white/60">
            Browse esports tournaments, join competitions and follow live
            brackets in realtime.
          </p>
        </div>

        <div className="mb-8 grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              value={searchQuery}
              onChange={(event) =>
                handleSearchQueryChange(event.target.value)
              }
              className="w-full rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-12 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-cyan-400/50"
              placeholder="Search tournaments"
            />
          </label>

          <label className="relative block">
            <SlidersHorizontal
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatusFilterChange(event.target.value)
              }
              className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0B1020] py-3 pl-12 pr-4 text-sm font-bold outline-none focus:border-cyan-400/50"
            >
              <option value="ALL">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

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
                className="flex items-center gap-2 rounded-2xl bg-red-300 px-5 py-3 font-black text-black hover:bg-red-200"
              >
                <RotateCw size={16} />
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
            <div className="grid gap-6 md:grid-cols-3">
              {pagedTournaments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition hover:-translate-y-2 hover:border-cyan-400/50"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
                      {item.status}
                    </span>
                    <Gamepad2 className="text-cyan-400" />
                  </div>

                  <h2 className="text-2xl font-black">{item.name}</h2>
                  <p className="mt-2 text-white/50">{item.game}</p>

                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-3 text-white/70">
                      <Users size={18} className="text-cyan-400" />
                      <span>{item.maxTeams} teams</span>
                    </div>

                    <div className="flex items-center gap-3 text-white/70">
                      <Trophy size={18} className="text-violet-400" />
                      <span>{item.prizePool || "TBA"} prize pool</span>
                    </div>

                    <div className="flex items-center gap-3 text-white/70">
                      <CalendarDays size={18} className="text-rose-400" />
                      {new Date(item.startDate).toLocaleDateString()}
                    </div>
                  </div>

                  <Link
                    to={`/tournaments/${item.id}`}
                    className="mt-8 block rounded-2xl bg-cyan-400 px-5 py-3 text-center font-bold text-black hover:bg-cyan-300"
                  >
                    View Tournament
                  </Link>
                </div>
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
