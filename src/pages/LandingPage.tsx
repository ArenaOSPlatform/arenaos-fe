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
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function LandingPage() {
  const [overview, setOverview] = useState<LandingOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    let mounted = true;

    getLandingOverview()
      .then((res) => {
        if (mounted) {
          setOverview(res.data);
        }
      })
      .catch(() => {
        if (mounted) {
          setOverview(null);
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

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#0B1020] via-[#111827] to-[#0B1020]" />

        <Hero3DScene />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6">
          <motion.p
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            className="mb-6 text-sm font-bold tracking-[0.3em] text-cyan-400"
          >
            REALTIME ESPORTS OPERATING SYSTEM
          </motion.p>

          <motion.h1
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-5xl text-6xl font-black leading-tight md:text-8xl"
          >
            The Future of
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
              {" "}
              Esports Tournament
            </span>{" "}
            Management
          </motion.h1>

          <motion.p
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 max-w-2xl text-lg leading-8 text-white/60"
          >
            ArenaOS is a realtime esports tournament operating system with
            automated bracket generation, live match rooms, dispute resolution,
            analytics dashboards and immersive spectator experiences.
          </motion.p>

          <motion.div
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <button className="rounded-2xl bg-cyan-400 px-8 py-4 font-bold text-black transition hover:scale-105 hover:bg-cyan-300">
              Explore Tournaments
            </button>

            <button className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold backdrop-blur-xl transition hover:bg-white/10">
              Become Organizer
            </button>
          </motion.div>
        </div>
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
      <PlatformFeaturesSection />
      <CTASection />
    </>
  );
}
