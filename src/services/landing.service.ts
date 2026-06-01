import { api } from "./api";

export type LandingTournament = {
  id: string;
  name: string;
  game: string;
  status: string;
  teams: number;
  maxTeams: number;
  prize: string | null;
  rules: string | null;
  startDate: string;
  registrationDeadline: string;
  matches: number;
};

export type LandingTopTeam = {
  id: string;
  rank: number;
  name: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  championCount: number;
  winRate: number;
};

export type LandingBracketMatch = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  left: string | null;
  right: string | null;
  winner: string | null;
  score: string;
  status: string;
};

export type LandingBracket = {
  id: string;
  tournament: {
    id: string;
    name: string;
    game: string;
    format: string;
  };
  matches: LandingBracketMatch[];
} | null;

export type LandingOverview = {
  tournaments: LandingTournament[];
  topTeams: LandingTopTeam[];
  bracket: LandingBracket;
};

export async function getLandingOverview() {
  const res = await api.get<{ data: LandingOverview }>("/landing/overview");
  return res.data;
}
