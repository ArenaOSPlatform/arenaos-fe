import { type ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BarChart3, Gamepad2, Medal, Shield, Trophy, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { BackButton } from "@/components/ui/BackButton";
import { getTeamById } from "@/services/team.service";

type TeamProfile = {
  id: string;
  name: string;
  logoUrl: string | null;
  game: string | null;
  region: string | null;
  status: string;
  description: string | null;
  totalMatchesPlayed?: number;
  totalWins?: number;
  totalLosses?: number;
  championCount?: number;
  overallWinRate?: number;
  captain: {
    id: string;
    username: string;
    email: string;
  };
  members: Array<{
    id: string;
    roleInTeam?: string;
    user: {
      id: string;
      username: string;
      email: string;
    };
  }>;
};

function getInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "AO"
  ).toUpperCase();
}

export function TeamProfilePage() {
  const { id } = useParams();
  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    getTeamById(id)
      .then((res) => {
        if (!cancelled) setTeam(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Team profile unavailable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl space-y-5">
          <BackButton fallbackTo="/tournaments" label="Back" />
          <LoadingState title="Loading team profile..." description="Fetching roster and public stats." />
        </div>
      </div>
    );
  }

  if (!team || error) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl space-y-5">
          <BackButton fallbackTo="/tournaments" label="Back" />
          <EmptyState icon={Users} title="Team unavailable" description={error || "Team not found."} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <BackButton fallbackTo="/tournaments" label="Back" />

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="size-28 rounded-[1.5rem] border border-white/10 object-cover"
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 text-3xl font-black text-cyan-100">
                {getInitials(team.name)}
              </div>
            )}

            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                Team Profile
              </span>
              <h1 className="mt-5 text-5xl font-black leading-none text-white">
                {team.name}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                {team.description ?? "No public description."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
                {team.game && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                    <Gamepad2 className="size-4 text-cyan-200" />
                    {team.game}
                  </span>
                )}
                {team.region && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                    <Shield className="size-4 text-emerald-200" />
                    {team.region}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                  <Medal className="size-4 text-amber-200" />
                  {team.status}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Matches" value={team.totalMatchesPlayed ?? 0} icon={<BarChart3 />} />
          <Metric label="Wins" value={team.totalWins ?? 0} icon={<Trophy />} />
          <Metric label="Losses" value={team.totalLosses ?? 0} icon={<Shield />} />
          <Metric label="Win Rate" value={`${team.overallWinRate ?? 0}%`} icon={<Medal />} />
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <h2 className="text-2xl font-black">Roster</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {team.members.map((member) => (
              <Link
                key={member.id}
                to={`/players/${member.user.id}`}
                className="rounded-[1.25rem] border border-white/10 bg-black/25 p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
              >
                <p className="font-black text-white">{member.user.username}</p>
                <p className="mt-1 text-sm text-slate-400">{member.user.email}</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                  {member.user.id === team.captain.id ? "Captain" : member.roleInTeam ?? "Member"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
      <div className="mb-4 text-cyan-200">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </article>
  );
}
