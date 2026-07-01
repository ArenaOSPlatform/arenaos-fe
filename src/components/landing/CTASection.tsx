import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Rocket, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const UI = {
  motion: {
    duration: 0.75,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 32,
    filter: "blur(12px)",
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

export function CTASection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden border-t border-white/10 bg-[#050816] px-5 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_18%_18%,rgba(139,92,246,0.16),transparent_30%),linear-gradient(180deg,#050816_0%,#0B1020_52%,#050816_100%)]" />

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:76px_76px] opacity-30 [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />

      {/* Rotating orbit ring */}
      {!shouldReduceMotion && (
        <>
          <motion.div
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10"
          />
          <motion.div
            aria-hidden="true"
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/[0.07]"
          />
        </>
      )}

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-120px" }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.25rem] border border-cyan-300/20 bg-white/[0.055] px-6 py-12 text-center shadow-[0_32px_110px_rgba(0,0,0,0.35),0_0_80px_rgba(34,211,238,0.06)_inset] backdrop-blur-2xl sm:px-10 md:px-16 md:py-16"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-300/30 to-transparent" />
        <div className="pointer-events-none absolute -left-28 -top-28 size-72 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-0 size-72 rounded-full bg-violet-400/15 blur-3xl" />

        {/* Floating particles */}
        {!shouldReduceMotion && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {[
              { left: "15%",  size: 4, delay: "0s",    dur: "5s"  },
              { left: "30%",  size: 3, delay: "1.2s",  dur: "6s"  },
              { left: "50%",  size: 5, delay: "0.5s",  dur: "4.5s"},
              { left: "68%",  size: 3, delay: "2s",    dur: "7s"  },
              { left: "82%",  size: 4, delay: "0.8s",  dur: "5.5s"},
            ].map((p, i) => (
              <span
                key={i}
                className="arena-particle bg-cyan-300/25"
                style={{
                  left: p.left,
                  bottom: "10%",
                  width: p.size,
                  height: p.size,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              />
            ))}
          </div>
        )}

        <div className="group relative mx-auto mb-8 flex size-16 items-center justify-center rounded-3xl bg-cyan-300 text-slate-950 shadow-[0_24px_70px_rgba(34,211,238,0.28)] ring-1 ring-cyan-100/50 transition duration-500 hover:rotate-12 hover:scale-110">
          <Trophy className="size-8" aria-hidden="true" />
        </div>

        <p className="relative text-xs font-black uppercase tracking-[0.3em] text-cyan-200 sm:text-sm">
          ENTER THE ARENA
        </p>

        <h2 className="font-display relative mx-auto mt-5 max-w-4xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white md:text-6xl">
          Ready to launch your next esports tournament?
        </h2>

        <p className="relative mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
          Create tournaments, manage teams, generate brackets, run live matches
          and deliver a realtime spectator experience with ArenaOS.
        </p>

        <div className="relative mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            to="/become-organizer"
            aria-label="Become an organizer and start a tournament"
            className="group relative inline-flex min-h-14 items-center justify-center overflow-hidden rounded-2xl bg-cyan-300 px-8 py-4 text-sm font-black text-slate-950 shadow-[0_24px_70px_rgba(34,211,238,0.28)] transition duration-300 hover:-translate-y-1 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition duration-700 group-hover:translate-x-full" />
            <span className="relative inline-flex items-center gap-2">
              <Rocket
                className="size-5 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
              Start Tournament
            </span>
          </Link>

          <Link
            to="/tournaments"
            aria-label="View live arena tournaments"
            className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.065] px-8 py-4 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0"
          >
            View Live Arena
            <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
