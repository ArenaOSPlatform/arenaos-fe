import type { LandingFeature } from "@/services/landing.service";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  BarChart3,
  FileSearch,
  GitBranch,
  LockKeyhole,
  Radio,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type FeatureIcon = ComponentType<SVGProps<SVGSVGElement>>;

type PlatformFeaturesSectionProps = {
  features: LandingFeature[];
  loading: boolean;
};

const UI = {
  skeletonCards: 6,
  motion: {
    duration: 0.65,
    stagger: 0.07,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

const iconByName: Record<string, FeatureIcon> = {
  Activity,
  BarChart3,
  FileSearch,
  GitBranch,
  LockKeyhole,
  Radio,
};

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

function FeatureSkeletonGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: UI.skeletonCards }).map((_, index) => (
        <div
          key={index}
          className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
        >
          <div className="mb-6 size-14 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 space-y-3">
            <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyFeatureState() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
      <p className="text-lg font-black text-white">
        No platform features available yet.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
        Platform capabilities will appear here when feature content is
        configured.
      </p>
    </div>
  );
}

function FeatureCard({
  feature,
  index,
  reduceMotion,
}: {
  feature: LandingFeature;
  index: number;
  reduceMotion: boolean | null;
}) {
  const Icon = iconByName[feature.icon] ?? Activity;

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
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition duration-300 hover:-translate-y-2 hover:border-cyan-300/45 hover:bg-white/[0.07]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-cyan-300/10 blur-3xl opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="relative mb-6 flex size-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.12)] transition duration-300 group-hover:border-cyan-200/50 group-hover:bg-cyan-300 group-hover:text-slate-950">
        <Icon className="size-6" aria-hidden="true" />
      </div>

      <h3 className="relative text-xl font-black tracking-[-0.025em] text-white">
        {feature.title}
      </h3>

      <p className="relative mt-3 leading-7 text-slate-400">
        {feature.description}
      </p>
    </motion.article>
  );
}

export function PlatformFeaturesSection({
  features,
  loading,
}: PlatformFeaturesSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden border-t border-white/10 bg-[#050816] px-5 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.18),transparent_32%),radial-gradient(circle_at_18%_28%,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,#050816_0%,#070B16_52%,#050816_100%)]" />

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />

      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <p className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-violet-200 backdrop-blur-xl">
            SENIOR-GRADE SYSTEM
          </p>

          <h2 className="mt-5 text-balance text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
            More than a tournament website
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            ArenaOS is designed like a real operating system for esports events,
            with realtime workflows, permissions, evidence handling and
            analytics.
          </p>
        </motion.div>

        {loading ? (
          <FeatureSkeletonGrid />
        ) : features.length === 0 ? (
          <EmptyFeatureState />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
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
