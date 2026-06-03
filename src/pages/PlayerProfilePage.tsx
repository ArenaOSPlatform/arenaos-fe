import { type ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BarChart3, Medal, Shield, Trophy, User, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { BackButton } from "@/components/ui/BackButton";
import { getUserProfile } from "@/services/user.service";

type PlayerProfile = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  teamMembers: Array<{
    id: string;
    roleInTeam: string;
    team: {
      id: string;
      name: string;
      logoUrl: string | null;
      game: string | null;
      region: string | null;
      status: string;
      totalMatchesPlayed: number;
      totalWins: number;
      totalLosses: number;
      championCount: number;
      overallWinRate: number;
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

export function PlayerProfilePage() {
  const { id } = useParams();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    getUserProfile(id)
      .then((res) => {
        if (!cancelled) setPlayer(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Player profile unavailable.");
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
          <LoadingState title="Loading player profile..." description="Fetching public team and match stats." />
        </div>
      </div>
    );
  }

  if (!player || error) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl space-y-5">
          <BackButton fallbackTo="/tournaments" label="Back" />
          <EmptyState icon={User} title="Player unavailable" description={error || "Player not found."} />
        </div>
      </div>
    );
  }

  const primaryTeam = player.teamMembers[0]?.team;

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <BackButton fallbackTo="/tournaments" label="Back" />

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt={player.username}
                className="size-28 rounded-[1.5rem] border border-white/10 object-cover"
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 text-3xl font-black text-cyan-100">
                {getInitials(player.username)}
              </div>
            )}

            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                Player Profile
              </span>
              <h1 className="mt-5 text-5xl font-black leading-none text-white">
                {player.username}
              </h1>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                  <Shield className="size-4 text-emerald-200" />
                  {player.role}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
                  <Medal className="size-4 text-amber-200" />
                  {player.status}
                </span>
                {primaryTeam && (
                  <Link
                    to={`/teams/${primaryTeam.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-cyan-100"
                  >
                    <Users className="size-4" />
                    {primaryTeam.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {primaryTeam && (
          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Matches" value={primaryTeam.totalMatchesPlayed} icon={<BarChart3 />} />
            <Metric label="Wins" value={primaryTeam.totalWins} icon={<Trophy />} />
            <Metric label="Titles" value={primaryTeam.championCount} icon={<Medal />} />
            <Metric label="Win Rate" value={`${primaryTeam.overallWinRate}%`} icon={<Shield />} />
          </section>
        )}

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <h2 className="text-2xl font-black">Teams</h2>
          {player.teamMembers.length === 0 ? (
            <EmptyState compact icon={Users} title="No public team" description="This player is not listed on a team yet." />
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {player.teamMembers.map((membership) => (
                <Link
                  key={membership.id}
                  to={`/teams/${membership.team.id}`}
                  className="rounded-[1.25rem] border border-white/10 bg-black/25 p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
                >
                  <p className="font-black text-white">{membership.team.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {[membership.team.game, membership.team.region]
                      .filter(Boolean)
                      .join(" / ") || "No game metadata"}
                  </p>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                    {membership.roleInTeam}
                  </p>
                </Link>
              ))}
            </div>
          )}
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
