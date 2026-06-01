import { motion } from "framer-motion";
import { Rocket, Trophy } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-[#0B1020] px-6 py-24">
      <div className="absolute left-1/2 top-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative mx-auto max-w-5xl rounded-[2rem] border border-cyan-400/20 bg-white/[0.05] p-10 text-center shadow-2xl backdrop-blur-xl md:p-16"
      >
        <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-3xl bg-cyan-400 text-black">
          <Trophy size={30} />
        </div>

        <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
          ENTER THE ARENA
        </p>

        <h2 className="mt-5 text-4xl font-black md:text-6xl">
          Ready to launch your next esports tournament?
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-white/60">
          Create tournaments, manage teams, generate brackets, run live matches
          and deliver a realtime spectator experience with ArenaOS.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button className="flex items-center gap-2 rounded-2xl bg-cyan-400 px-8 py-4 font-bold text-black transition hover:scale-105 hover:bg-cyan-300">
            <Rocket size={20} />
            Start Tournament
          </button>

          <button className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold backdrop-blur-xl transition hover:bg-white/10">
            View Live Arena
          </button>
        </div>
      </motion.div>
    </section>
  );
}
