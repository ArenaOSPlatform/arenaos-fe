import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  FileSearch,
  GitBranch,
  LockKeyhole,
  Radio,
} from "lucide-react";

const features = [
  {
    title: "Realtime Bracket",
    description: "Bracket tự cập nhật khi trận đấu có kết quả.",
    icon: GitBranch,
  },
  {
    title: "Live Match Room",
    description: "Phòng trận đấu riêng cho check-in, score và evidence.",
    icon: Radio,
  },
  {
    title: "Dispute Center",
    description: "Xử lý khiếu nại kết quả bằng bằng chứng.",
    icon: FileSearch,
  },
  {
    title: "Audit Log",
    description: "Lưu lại toàn bộ hành động quan trọng trong hệ thống.",
    icon: Activity,
  },
  {
    title: "RBAC Permission",
    description: "Phân quyền Player, Captain, Organizer và Admin.",
    icon: LockKeyhole,
  },
  {
    title: "Analytics Dashboard",
    description: "Thống kê tournament, team, match và user realtime.",
    icon: BarChart3,
  },
];

export function PlatformFeaturesSection() {
  return (
    <section className="relative border-t border-white/10 bg-[#070B16] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.3em] text-violet-400">
            SENIOR-GRADE SYSTEM
          </p>
          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            More than a tournament website
          </h2>
          <p className="mt-5 text-white/60">
            ArenaOS is designed like a real operating system for esports events,
            with realtime workflows, permissions, evidence handling and
            analytics.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                viewport={{ once: true }}
                className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition hover:-translate-y-2 hover:border-cyan-400/50 hover:bg-white/[0.07]"
              >
                <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 transition group-hover:bg-cyan-400 group-hover:text-black">
                  <Icon />
                </div>

                <h3 className="text-xl font-black">{feature.title}</h3>

                <p className="mt-3 leading-7 text-white/55">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
