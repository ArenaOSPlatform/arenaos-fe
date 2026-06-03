import type { LandingTopTeam } from "@/services/landing.service";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Crown, Shield, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type TopTeamsSectionProps = {
  loading: boolean;
  teams: LandingTopTeam[];
};

const UI = {
  skeletonRows: 5,
  motion: {
    duration: 0.65,
    stagger: 0.07,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 28,
    filter: "blur(10px)",
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

function ChampionStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function ChampionCard({
  champion,
  loading,
}: {
  champion: LandingTopTeam | null;
  loading: boolean;
}) {
  return (
    <motion.aside
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.085] p-7 shadow-[0_28px_90px_rgba(8,145,178,0.16)] backdrop-blur-2xl sm:p-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative mb-6 flex size-16 items-center justify-center rounded-3xl bg-cyan-300 text-slate-950 shadow-[0_24px_70px_rgba(34,211,238,0.28)]">
        <Crown className="size-8" aria-hidden="true" />
      </div>

      <p className="relative text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
        CURRENT CHAMPION
      </p>

      <h3 className="relative mt-4 text-balance text-4xl font-black tracking-[-0.045em] text-white">
        {loading ? "Loading..." : (champion?.name ?? "No teams yet")}
      </h3>

      <p className="relative mt-4 text-sm leading-7 text-slate-300">
        Ranked from real ArenaOS team statistics, including wins, losses and
        champion count.
      </p>

      <div className="relative mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <ChampionStat label="Wins" value={champion?.wins ?? 0} />
        <ChampionStat label="Winrate" value={`${champion?.winRate ?? 0}%`} />
        <ChampionStat label="Titles" value={champion?.championCount ?? 0} />
      </div>
    </motion.aside>
  );
}

function RankingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: UI.skeletonRows }).map((_, index) => (
        <div
          key={index}
          className="grid items-center gap-4 rounded-3xl border border-white/10 bg-black/25 p-5 md:grid-cols-[70px_1fr_120px_120px_120px]"
        >
          <div className="size-12 animate-pulse rounded-2xl bg-white/10" />

          <div className="flex items-center gap-4">
            <div className="size-12 animate-pulse rounded-2xl bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>

          <div className="h-8 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-8 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-8 animate-pulse rounded-2xl bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function EmptyRankingState() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center">
      <p className="text-lg font-black text-white">No team ranking data yet.</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
        Team performance will appear here after tournaments have match results.
      </p>
    </div>
  );
}

function RankingMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="font-bold text-white">{value}</p>
    </div>
  );
}

function RankingRow({
  team,
  index,
  reduceMotion,
}: {
  team: LandingTopTeam;
  index: number;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.article
      initial={
        reduceMotion ? false : { opacity: 0, y: 24, filter: "blur(10px)" }
      }
      whileInView={
        reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      transition={{
        delay: index * UI.motion.stagger,
        duration: UI.motion.duration,
        ease: UI.motion.ease,
      }}
      viewport={{ once: true, margin: "-80px" }}
      className="group grid items-center gap-4 rounded-3xl border border-white/10 bg-black/25 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/45 hover:bg-white/[0.06] md:grid-cols-[70px_1fr_120px_120px_120px]"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-lg font-black text-white">
        #{team.rank}
      </div>

      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-violet-200 transition duration-300 group-hover:bg-violet-300 group-hover:text-slate-950">
          <Shield className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <p className="truncate font-black text-white">{team.name}</p>
          <p className="text-sm text-slate-400">{team.matchesPlayed} matches</p>
        </div>
      </div>

      <RankingMetric label="Wins" value={team.wins} />
      <RankingMetric label="Losses" value={team.losses} />

      <div className="flex items-center gap-2 text-cyan-200">
        <TrendingUp className="size-5" aria-hidden="true" />
        <p className="font-black">{team.winRate}%</p>
      </div>
    </motion.article>
  );
}

export function TopTeamsSection({ loading, teams }: TopTeamsSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const champion = teams[0] ?? null;

  return (
    <section className="relative isolate overflow-hidden border-t border-white/10 bg-[#050816] px-5 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_86%_28%,rgba(139,92,246,0.16),transparent_30%),linear-gradient(180deg,#050816_0%,#0B1020_50%,#050816_100%)]" />

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />

      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-200 backdrop-blur-xl">
              LEADERBOARD
            </p>

            <h2 className="mt-5 text-balance text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
              Top performing teams
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Track the most dominant teams across live tournaments, ranked by
              wins, consistency and tournament performance.
            </p>
          </div>

          <Link
            to="/tournaments"
            className="group inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.065] px-5 py-3 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0"
          >
            Full Ranking
            <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <ChampionCard champion={champion} loading={loading} />

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-6"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />

            {loading ? (
              <RankingSkeleton />
            ) : teams.length === 0 ? (
              <EmptyRankingState />
            ) : (
              <div className="space-y-4">
                {teams.map((team, index) => (
                  <RankingRow
                    key={team.id}
                    team={team}
                    index={index}
                    reduceMotion={shouldReduceMotion}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
