import type { LandingBracket } from "@/services/landing.service";
import { motion, useReducedMotion } from "framer-motion";
import { GitBranch, Zap } from "lucide-react";
import { formatTournamentName } from "@/utils";

type BracketPreviewSectionProps = {
  bracket: LandingBracket | null;
  loading: boolean;
};

type Match = NonNullable<LandingBracket>["matches"][number];

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
    y: 28,
    opacity: 0,
    filter: "blur(10px)",
  },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: UI.motion.duration,
      ease: UI.motion.ease,
    },
  },
};

function TeamSlot({ name, active }: { name: string | null; active: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 transition duration-300",
        active
          ? "border-cyan-300/60 bg-cyan-300/10 shadow-[0_0_40px_rgba(34,211,238,0.14)]"
          : "border-white/10 bg-white/[0.035]",
      ].join(" ")}
    >
      <p className="truncate font-bold text-white">{name ? formatTournamentName(name) : "TBD"}</p>
    </div>
  );
}

function BracketSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {Array.from({ length: UI.skeletonCards }).map((_, index) => (
        <div
          key={index}
          className="rounded-3xl border border-white/10 bg-black/25 p-5"
        >
          <div className="mb-5 h-3 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="h-14 animate-pulse rounded-2xl bg-white/10" />
          <div className="mx-auto my-4 h-3 w-8 animate-pulse rounded-full bg-white/10" />
          <div className="h-14 animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-5 h-11 animate-pulse rounded-2xl bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function EmptyBracketState() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center">
      <p className="text-lg font-black text-white">No bracket data yet.</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Generate a bracket to preview live match progression here.
      </p>
    </div>
  );
}

function MatchCard({
  match,
  index,
  reduceMotion,
}: {
  match: Match;
  index: number;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.article
      initial={
        reduceMotion ? false : { opacity: 0, y: 26, filter: "blur(10px)" }
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
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-black/35"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

      <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        ROUND {match.roundNumber} / MATCH {match.matchNumber}
      </p>

      <TeamSlot name={match.left} active={match.winner === match.left} />

      <div className="my-3 text-center text-xs font-black tracking-[0.22em] text-slate-500">
        VS
      </div>

      <TeamSlot name={match.right} active={match.winner === match.right} />

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center">
        <p className="text-sm font-black text-cyan-200">{match.score}</p>
      </div>
    </motion.article>
  );
}

function CurrentMatchPanel({ currentMatch }: { currentMatch?: Match }) {
  return (
    <motion.aside
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.085] p-6 shadow-[0_28px_90px_rgba(8,145,178,0.14)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative mb-6 flex size-14 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_20px_60px_rgba(34,211,238,0.24)]">
        <Zap className="size-6" />
      </div>

      <h3 className="relative text-2xl font-black tracking-[-0.03em] text-white">
        Auto Advance Winner
      </h3>

      <p className="relative mt-4 text-sm leading-7 text-slate-300">
        When a match result is confirmed, ArenaOS automatically moves the
        winning team to the next match and broadcasts the update in realtime.
      </p>

      <div className="relative mt-8 space-y-4">
        <InfoCard
          label="Current Match"
          value={
            currentMatch
              ? `${formatTournamentName(currentMatch.left ?? "TBD")} vs ${formatTournamentName(
                  currentMatch.right ?? "TBD"
                )}`
              : "No active match"
          }
        />

        <InfoCard
          label="Status"
          value={currentMatch?.status ?? "WAITING"}
          highlight
        />

        <InfoCard
          label="Current Stage"
          value={currentMatch ? `Round ${currentMatch.roundNumber}` : "TBD"}
        />
      </div>
    </motion.aside>
  );
}

function InfoCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p
        className={[
          "mt-1 font-bold",
          highlight ? "text-cyan-200" : "text-white",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

export function BracketPreviewSection({
  bracket,
  loading,
}: BracketPreviewSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const matches = bracket?.matches ?? [];
  const currentMatch =
    matches.find((match) => match.status !== "COMPLETED") ?? matches.at(-1);

  return (
    <section className="relative isolate overflow-hidden border-t border-white/10 bg-[#050816] px-5 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(139,92,246,0.18),transparent_30%),radial-gradient(circle_at_85%_30%,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#050816_0%,#070B16_48%,#050816_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30 [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />

      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          className="mb-12 max-w-3xl"
        >
          <p className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-violet-200 backdrop-blur-xl">
            BRACKET ENGINE
          </p>

          <h2 className="mt-5 text-balance text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
            Realtime tournament bracket updates
          </h2>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            Winners automatically advance to the next round while every
            spectator sees the bracket update live without refreshing the page.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-6"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />
            <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-violet-400/10 blur-3xl" />

            <div className="relative mb-8 flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-violet-200 shadow-[0_0_40px_rgba(139,92,246,0.16)]">
                <GitBranch className="size-6" />
              </div>

              <div className="min-w-0">
                <h3 className="text-xl font-black tracking-[-0.02em] text-white sm:text-2xl">
                  {loading
                    ? "Loading bracket..."
                    : (bracket?.tournament.name ? formatTournamentName(bracket.tournament.name) : "No bracket generated yet")}
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  {bracket
                    ? `${bracket.tournament.format} - ${bracket.tournament.game}`
                    : "Generate a bracket to preview live matches"}
                </p>
              </div>
            </div>

            {loading ? (
              <BracketSkeleton />
            ) : matches.length === 0 ? (
              <EmptyBracketState />
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {matches.map((match, index) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    index={index}
                    reduceMotion={shouldReduceMotion}
                  />
                ))}
              </div>
            )}
          </motion.div>

          <CurrentMatchPanel currentMatch={currentMatch} />
        </div>
      </div>
    </section>
  );
}
