import { motion } from "framer-motion";
import { Crown, Shield, TrendingUp } from "lucide-react";

const teams = [
  {
    rank: 1,
    name: "Nova X",
    region: "SEA",
    wins: 24,
    losses: 3,
    winRate: "88%",
  },
  {
    rank: 2,
    name: "Shadow Rift",
    region: "VN",
    wins: 21,
    losses: 5,
    winRate: "80%",
  },
  {
    rank: 3,
    name: "Cyber Wolves",
    region: "TH",
    wins: 19,
    losses: 7,
    winRate: "73%",
  },
  {
    rank: 4,
    name: "Titan Core",
    region: "PH",
    wins: 17,
    losses: 9,
    winRate: "65%",
  },
];

export function TopTeamsSection() {
  return (
    <section className="relative border-t border-white/10 bg-[#0B1020] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
              LEADERBOARD
            </p>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Top performing teams
            </h2>
            <p className="mt-4 max-w-2xl text-white/60">
              Track the most dominant teams across live tournaments, ranked by
              wins, consistency and tournament performance.
            </p>
          </div>

          <button className="w-fit rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/10">
            Full Ranking
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <motion.div
            initial={{ opacity: 0, x: -35 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-8 backdrop-blur-xl"
          >
            <div className="mb-6 flex size-16 items-center justify-center rounded-3xl bg-cyan-400 text-black">
              <Crown size={30} />
            </div>

            <p className="text-sm font-bold tracking-[0.2em] text-cyan-300">
              CURRENT CHAMPION
            </p>

            <h3 className="mt-4 text-4xl font-black">Nova X</h3>

            <p className="mt-4 text-white/60">
              The most consistent team this season with dominant performance
              across multiple ArenaOS tournaments.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-white/50">Wins</p>
                <p className="mt-1 text-2xl font-black">24</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-white/50">Winrate</p>
                <p className="mt-1 text-2xl font-black">88%</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-white/50">Region</p>
                <p className="mt-1 text-2xl font-black">SEA</p>
              </div>
            </div>
          </motion.div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="space-y-4">
              {teams.map((team, index) => (
                <motion.div
                  key={team.name}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="grid items-center gap-4 rounded-3xl border border-white/10 bg-black/30 p-5 transition hover:border-cyan-400/50 hover:bg-white/[0.06] md:grid-cols-[70px_1fr_120px_120px_120px]"
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-black">
                    #{team.rank}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
                      <Shield />
                    </div>
                    <div>
                      <p className="font-black">{team.name}</p>
                      <p className="text-sm text-white/50">{team.region}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-white/50">Wins</p>
                    <p className="font-bold">{team.wins}</p>
                  </div>

                  <div>
                    <p className="text-sm text-white/50">Losses</p>
                    <p className="font-bold">{team.losses}</p>
                  </div>

                  <div className="flex items-center gap-2 text-cyan-300">
                    <TrendingUp size={18} />
                    <p className="font-black">{team.winRate}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
