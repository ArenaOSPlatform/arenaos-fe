import { motion } from "framer-motion";
import { GitBranch, Zap } from "lucide-react";

const matches = [
  { left: "Nova X", right: "Cyber Wolves", score: "2 - 1", winner: "Nova X" },
  {
    left: "Titan Core",
    right: "Shadow Rift",
    score: "0 - 2",
    winner: "Shadow Rift",
  },
  { left: "Nova X", right: "Shadow Rift", score: "LIVE", winner: null },
];

export function BracketPreviewSection() {
  return (
    <section className="relative border-t border-white/10 bg-[#070B16] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <p className="text-sm font-bold tracking-[0.3em] text-violet-400">
            BRACKET ENGINE
          </p>
          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            Realtime tournament bracket updates
          </h2>
          <p className="mt-5 text-white/60">
            Winners automatically advance to the next round while every
            spectator sees the bracket update live without refreshing the page.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-2xl bg-violet-500/20 p-3 text-violet-300">
                <GitBranch />
              </div>
              <div>
                <h3 className="text-xl font-black">Valorant Neon Cup</h3>
                <p className="text-sm text-white/50">
                  Single Elimination • Semi Final
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {matches.map((match, index) => (
                <motion.div
                  key={`${match.left}-${match.right}`}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  viewport={{ once: true }}
                  className="relative rounded-3xl border border-white/10 bg-black/30 p-5"
                >
                  <p className="mb-4 text-xs font-bold text-white/40">
                    ROUND {index + 1}
                  </p>

                  <div
                    className={`rounded-2xl border p-4 ${
                      match.winner === match.left
                        ? "border-cyan-400/60 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <p className="font-bold">{match.left}</p>
                  </div>

                  <div className="my-3 text-center text-sm font-black text-white/40">
                    VS
                  </div>

                  <div
                    className={`rounded-2xl border p-4 ${
                      match.winner === match.right
                        ? "border-cyan-400/60 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <p className="font-bold">{match.right}</p>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white/5 p-3 text-center">
                    <p className="text-sm font-black text-cyan-300">
                      {match.score}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6 backdrop-blur-xl">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-cyan-400 text-black">
              <Zap />
            </div>

            <h3 className="text-2xl font-black">Auto Advance Winner</h3>

            <p className="mt-4 text-white/60">
              When a match result is confirmed, ArenaOS automatically moves the
              winning team to the next match and broadcasts the update in
              realtime.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-white/50">Current Match</p>
                <p className="font-bold">Nova X vs Shadow Rift</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-white/50">Status</p>
                <p className="font-bold text-cyan-300">LIVE NOW</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-white/50">Next Stage</p>
                <p className="font-bold">Grand Final</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
