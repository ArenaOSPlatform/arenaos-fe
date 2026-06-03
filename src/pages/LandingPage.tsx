import { BracketPreviewSection } from "@/components/landing/BracketPreviewSection";
import { CTASection } from "@/components/landing/CTASection";
import { Hero3DScene } from "@/components/landing/Hero3DScene";
import { LiveTournamentsSection } from "@/components/landing/LiveTournamentsSection";
import { PlatformFeaturesSection } from "@/components/landing/PlatformFeaturesSection";
import { TopTeamsSection } from "@/components/landing/TopTeamSection";
import {
  getLandingOverview,
  type LandingOverview,
} from "@/services/landing.service";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Brackets,
  Radio,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const heroContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: {
    y: 34,
    opacity: 0,
    filter: "blur(12px)",
  },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function LandingPage() {
  const [overview, setOverview] = useState<LandingOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    let mounted = true;

    getLandingOverview()
      .then((res) => {
        if (mounted) {
          setOverview(res.data);
          setOverviewError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setOverview(null);
          setOverviewError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingOverview(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const heroStats = [
    {
      label: "Public tournaments",
      value: overview?.tournaments.length ?? 0,
      icon: Trophy,
    },
    {
      label: "Bracket matches",
      value: overview?.bracket?.matches.length ?? 0,
      icon: Brackets,
    },
    {
      label: "Ranked teams",
      value: overview?.topTeams.length ?? 0,
      icon: Users,
    },
  ];

  const dataSignalLabel = loadingOverview
    ? "Syncing live arena"
    : overviewError
      ? "Live API unavailable"
      : "Live API connected";

  return (
    <>
      <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-[#050816] text-white">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_74%_18%,rgba(99,102,241,0.16),transparent_30%),linear-gradient(180deg,#050816_0%,#0B1020_48%,#050816_100%)]" />

        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

        {!shouldReduceMotion && (
          <motion.div
            aria-hidden="true"
            animate={{
              x: ["-20%", "120%"],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute top-0 z-[1] h-px w-1/3 bg-gradient-to-r from-transparent via-cyan-200 to-transparent"
          />
        )}

        <Hero3DScene />

        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-center px-5 py-24 sm:px-6 lg:px-8"
        >
          <div className="relative max-w-6xl">
            <motion.div
              variants={heroItemVariants}
              className="mb-7 flex flex-wrap items-center gap-3"
            >
              <span className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-100 shadow-[0_0_50px_rgba(34,211,238,0.12)] backdrop-blur-xl">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-cyan-200" />
                </span>
                Realtime esports operating system
              </span>

              <span
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] backdrop-blur-xl",
                  overviewError
                    ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                    : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
                ].join(" ")}
              >
                {overviewError ? (
                  <Radio className="size-3.5" aria-hidden="true" />
                ) : (
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                )}
                {dataSignalLabel}
              </span>
            </motion.div>

            <motion.h1
              variants={heroItemVariants}
              className="max-w-6xl text-balance text-5xl font-black leading-[0.92] tracking-[-0.065em] text-white drop-shadow-[0_24px_70px_rgba(15,23,42,0.45)] sm:text-6xl md:text-8xl lg:text-9xl"
            >
              The Future of
              <span className="relative inline-block bg-gradient-to-r from-cyan-200 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                {" "}
                Esports Tournament
              </span>{" "}
              Management
            </motion.h1>

            <motion.p
              variants={heroItemVariants}
              className="mt-8 max-w-3xl text-pretty text-base leading-8 text-slate-300 sm:text-lg md:text-xl"
            >
              ArenaOS is a realtime esports tournament operating system with
              automated bracket generation, live match rooms, dispute
              resolution, analytics dashboards and immersive spectator
              experiences.
            </motion.p>

            <motion.div
              variants={heroItemVariants}
              className="mt-11 flex flex-col gap-4 sm:flex-row"
            >
              <Link
                to="/tournaments"
                aria-label="Explore tournaments"
                className="group relative inline-flex min-h-14 items-center justify-center overflow-hidden rounded-2xl bg-cyan-300 px-8 py-4 text-sm font-black text-slate-950 shadow-[0_28px_80px_rgba(34,211,238,0.32)] transition duration-300 hover:-translate-y-1 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-3">
                  Explore Tournaments
                  <ArrowRight className="size-4 transition duration-300 group-hover:translate-x-1" />
                </span>
              </Link>

              <Link
                to="/become-organizer"
                aria-label="Become organizer"
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.065] px-8 py-4 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0"
              >
                <Sparkles className="size-4 text-cyan-200 transition duration-300 group-hover:rotate-12" />
                Become Organizer
              </Link>
            </motion.div>

            <motion.div
              variants={heroItemVariants}
              className="mt-9 grid max-w-3xl gap-3 sm:grid-cols-3"
            >
              {heroStats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-black/24 px-4 py-3 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        {stat.label}
                      </p>
                      <Icon className="size-4 text-cyan-200" aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-2xl font-black text-white">
                      {loadingOverview ? "--" : stat.value}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>

        <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 hidden -translate-x-1/2 md:block">
          <div className="flex h-12 w-7 justify-center rounded-full border border-white/15 bg-white/[0.04] p-1.5 backdrop-blur-xl">
            <motion.span
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: [0, 18, 0],
                      opacity: [0.35, 1, 0.35],
                    }
              }
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="h-2 w-2 rounded-full bg-cyan-200"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[#050816] via-[#050816]/80 to-transparent" />
      </section>

      <LiveTournamentsSection
        loading={loadingOverview}
        tournaments={overview?.tournaments ?? []}
      />

      <BracketPreviewSection
        bracket={overview?.bracket ?? null}
        loading={loadingOverview}
      />

      <TopTeamsSection
        loading={loadingOverview}
        teams={overview?.topTeams ?? []}
      />

      <PlatformFeaturesSection
        features={overview?.features ?? []}
        loading={loadingOverview}
      />

      <CTASection />
    </>
  );
}
