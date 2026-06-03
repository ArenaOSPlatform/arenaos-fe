import { api } from "./api";

export type CreateTeamPayload = {
  name: string;
  game: string;
  region: string;
  description?: string;
  logoUrl?: string;
};

export type UpdateTeamPayload = {
  name?: string;
  game?: string;
  region?: string;
  description?: string;
  logoUrl?: string;
};

export type InviteMemberPayload = {
  identifier: string;
};

export type TeamRankingHistory = {
  team: {
    id: string;
    name: string;
  };
  currentRank: number | null;
  highestRank: number | null;
  winRate: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  overall?: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    championCount: number;
    winRate: number;
  };
  tournamentHistory: {
    tournamentId: string;
    tournamentName: string;
    game: string;
    status: string;
    rank: number;
    highestRank: number;
    matchesPlayed: number;
    wins: number;
    losses: number;
    points: number;
    winRate: number;
    updatedAt: string;
  }[];
  snapshots: {
    tournamentId: string;
    tournamentName: string;
    game: string;
    matchId: string;
    rank: number;
    highestRank: number;
    matchesPlayed: number;
    wins: number;
    losses: number;
    points: number;
    winRate: number;
    createdAt: string;
  }[];
};

export type TeamScheduleMatch = {
  id: string;
  tournament: {
    id: string;
    name: string;
    game: string;
  };
  roundNumber: number;
  matchNumber: number;
  teamSlot: "A" | "B";
  opponent: {
    id: string;
    name: string;
  } | null;
  scheduledAt: string | null;
  roomCode: string | null;
  livestreamUrl: string | null;
  status: string;
};

export async function createTeam(payload: CreateTeamPayload) {
  const res = await api.post("/teams", payload);
  return res.data;
}

export async function updateTeam(id: string, payload: UpdateTeamPayload) {
  const res = await api.patch(`/teams/${id}`, payload);
  return res.data;
}

export async function removeTeamMember(teamId: string, userId: string) {
  const res = await api.delete(`/teams/${teamId}/members/${userId}`);
  return res.data;
}

export async function leaveTeam() {
  const res = await api.post("/teams/leave");
  return res.data;
}

export async function getTeams() {
  const res = await api.get("/teams");
  return res.data;
}

export async function getTeamById(id: string) {
  const res = await api.get(`/teams/${id}`);
  return res.data;
}

export async function getMyTeam() {
  const res = await api.get("/teams/my");
  return res.data;
}

export async function getMyTeamRankingHistory() {
  const res = await api.get("/teams/my/ranking-history");
  return res.data;
}

export async function getMyTeamSchedule() {
  const res = await api.get("/teams/my/schedule");
  return res.data;
}

export async function inviteTeamMember(
  teamId: string,
  payload: InviteMemberPayload,
) {
  const res = await api.post(`/teams/${teamId}/invites`, payload);
  return res.data;
}

export async function getMyTeamInvites() {
  const res = await api.get("/teams/invites/me");
  return res.data;
}

export async function acceptTeamInvite(inviteId: string) {
  const res = await api.post(`/team-invites/${inviteId}/accept`);
  return res.data;
}

export async function rejectTeamInvite(inviteId: string) {
  const res = await api.post(`/team-invites/${inviteId}/reject`);
  return res.data;
}
