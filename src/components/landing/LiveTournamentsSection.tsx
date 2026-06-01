import type { LandingTournament } from "@/services/landing.service";
import { motion } from "framer-motion";
import { CalendarDays, Radio, Trophy, Users } from "lucide-react";

type LiveTournamentsSectionProps = {
  loading: boolean;
  tournaments: LandingTournament[];
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function LiveTournamentsSection({
  loading,
  tournaments,
}: LiveTournamentsSectionProps) {
  return (
    <section className="relative border-t border-white/10 bg-[#0B1020] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
              LIVE ARENA
            </p>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Active Tournaments
            </h2>
          </div>

          <button className="w-fit rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/10">
            View All
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white/60">
            Loading tournaments...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white/60">
            No public tournaments yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {tournaments.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                viewport={{ once: true }}
                className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl transition hover:-translate-y-2 hover:border-cyan-400/60 hover:bg-white/[0.07]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
                    {formatStatus(item.status)}
                  </span>
                  <Radio className="text-cyan-400" />
                </div>

                <h3 className="text-2xl font-black">{item.name}</h3>
                <p className="mt-2 text-white/50">{item.game}</p>

                <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl bg-black/30 p-3">
                    <Users className="mb-2 size-4 text-cyan-400" />
                    <p className="text-white/50">Teams</p>
                    <p className="font-bold">
                      {item.teams}/{item.maxTeams}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black/30 p-3">
                    <Trophy className="mb-2 size-4 text-violet-400" />
                    <p className="text-white/50">Prize</p>
                    <p className="font-bold">{item.prize ?? "TBD"}</p>
                  </div>

                  <div className="rounded-2xl bg-black/30 p-3">
                    <CalendarDays className="mb-2 size-4 text-rose-400" />
                    <p className="text-white/50">Rules</p>
                    <p className="font-bold">{item.rules ?? "TBD"}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
