import type { LandingTournament } from "@/services/landing.service";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, Radio, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatTournamentName } from "@/utils";

type LiveTournamentsSectionProps = {
  loading: boolean;
  tournaments: LandingTournament[];
};

const UI = {
  skeletonCards: 3,
  motion: {
    duration: 0.65,
    stagger: 0.08,
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

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function EmptyTournamentState() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
      <p className="text-lg font-black text-white">
        No public tournaments yet.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
        Public tournaments will appear here once organizers publish active
        events.
      </p>
    </div>
  );
}

function TournamentSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {Array.from({ length: UI.skeletonCards }).map((_, index) => (
        <div
          key={index}
          className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl"
        >
          <div className="mb-8 flex items-center justify-between">
            <div className="h-7 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="size-6 animate-pulse rounded-full bg-white/10" />
          </div>

          <div className="h-8 w-3/4 animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-white/10" />

          <div className="mt-8 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="rounded-2xl border border-white/10 bg-black/25 p-3"
              >
                <div className="mb-3 size-4 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-12 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-4 w-10 animate-pulse rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="mb-2">{icon}</div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function TournamentCard({
  item,
  index,
  reduceMotion,
}: {
  item: LandingTournament;
  index: number;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.article
      initial={
        reduceMotion ? false : { opacity: 0, y: 30, filter: "blur(10px)" }
      }
      whileInView={
        reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      transition={{
        delay: index * UI.motion.stagger,
        duration: UI.motion.duration,
        ease: UI.motion.ease,
      }}
      viewport={{ once: true, margin: "-90px" }}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl transition duration-300 hover:-translate-y-2 hover:border-cyan-300/50 hover:bg-white/[0.07]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-cyan-300/10 blur-3xl opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="relative mb-8 flex items-center justify-between gap-4">
        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-cyan-200">
          {formatStatus(item.status)}
        </span>

        <div className="flex size-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Radio className="size-5" aria-hidden="true" />
        </div>
      </div>

      <h3 className="relative line-clamp-2 text-2xl font-black tracking-[-0.03em] text-white">
        {formatTournamentName(item.name)}
      </h3>

      <p className="relative mt-2 line-clamp-1 text-sm font-medium text-slate-400">
        {item.game}
      </p>

      <div className="relative mt-8 grid grid-cols-3 gap-3">
        <StatBox
          icon={<Users className="size-4 text-cyan-300" aria-hidden="true" />}
          label="Teams"
          value={`${item.teams}/${item.maxTeams}`}
        />

        <StatBox
          icon={
            <Trophy className="size-4 text-violet-300" aria-hidden="true" />
          }
          label="Prize"
          value={item.prize ?? "TBD"}
        />

        <StatBox
          icon={
            <CalendarDays className="size-4 text-rose-300" aria-hidden="true" />
          }
          label="Rules"
          value={item.rules ?? "TBD"}
        />
      </div>
    </motion.article>
  );
}

export function LiveTournamentsSection({
  loading,
  tournaments,
}: LiveTournamentsSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden border-t border-white/10 bg-[#050816] px-5 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_85%_28%,rgba(139,92,246,0.14),transparent_30%),linear-gradient(180deg,#050816_0%,#0B1020_48%,#050816_100%)]" />

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
              LIVE ARENA
            </p>

            <h2 className="mt-5 text-balance text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
              Active Tournaments
            </h2>
          </div>

          <Link
            to="/tournaments"
            className="group inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.065] px-5 py-3 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0"
          >
            View All
            <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </motion.div>

        {loading ? (
          <TournamentSkeleton />
        ) : tournaments.length === 0 ? (
          <EmptyTournamentState />
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {tournaments.map((item, index) => (
              <TournamentCard
                key={item.id}
                item={item}
                index={index}
                reduceMotion={shouldReduceMotion}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
