import { api } from "./api";

export type CreateTournamentPayload = {
  name: string;
  game: string;
  description?: string;
  bannerUrl?: string;
  maxTeams: number;
  teamSize: number;
  format: string;
  prizePool?: string;
  rules?: string;
  startDate: string;
  endDate?: string;
  registrationDeadline: string;
};

export type RegisterTeamPayload = {
  mainPlayerIds: string[];
  substituteIds?: string[];
};

export type AnnouncementType = "INFO" | "WARNING" | "URGENT";

export type TournamentAnnouncement = {
  id: string;
  tournamentId: string;
  createdBy: string;
  title: string;
  content: string;
  type: AnnouncementType;
  createdAt: string;
  updatedAt: string;
};

export type CreateAnnouncementPayload = {
  title: string;
  content: string;
  type: AnnouncementType;
};

export type TournamentLeaderboardRow = {
  tournamentId: string;
  teamId: string;
  teamName: string;
  rank: number;
  highestRank: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  winRate: number;
};

export async function getTournaments() {
  const res = await api.get("/tournaments");
  return res.data;
}

export async function getMyTournaments() {
  const res = await api.get("/tournaments/mine");
  return res.data;
}

export async function createTournament(payload: CreateTournamentPayload) {
  const res = await api.post("/tournaments", payload);
  return res.data;
}

export async function getTournamentById(id: string) {
  const res = await api.get(`/tournaments/${id}`);
  return res.data;
}

export async function getTournamentBracket(id: string) {
  const res = await api.get(`/tournaments/${id}/bracket`);
  return res.data;
}

export async function getTournamentLeaderboard(id: string) {
  const res = await api.get(`/tournaments/${id}/leaderboard`);
  return res.data;
}

export async function getTournamentAnnouncements(id: string) {
  const res = await api.get(`/tournaments/${id}/announcements`);
  return res.data;
}

export async function createTournamentAnnouncement(
  id: string,
  payload: CreateAnnouncementPayload,
) {
  const res = await api.post(`/tournaments/${id}/announcements`, payload);
  return res.data;
}

export async function registerTeamToTournament(
  id: string,
  payload: RegisterTeamPayload,
) {
  const res = await api.post(`/tournaments/${id}/register-team`, payload);
  return res.data;
}

export async function openTournamentRegistration(id: string) {
  const res = await api.patch(`/tournaments/${id}/open-registration`);
  return res.data;
}

export async function submitTournamentApproval(id: string) {
  const res = await api.post(`/tournaments/${id}/submit-approval`);
  return res.data;
}

export async function closeTournamentRegistration(id: string) {
  const res = await api.patch(`/tournaments/${id}/close-registration`);
  return res.data;
}

export async function getTournamentRegistrations(id: string) {
  const res = await api.get(`/tournaments/${id}/registrations`);
  return res.data;
}

export async function approveRegistration(registrationId: string) {
  const res = await api.post(
    `/tournaments/registrations/${registrationId}/approve`,
  );
  return res.data;
}

export async function rejectRegistration(
  registrationId: string,
  reason: string,
) {
  const res = await api.post(
    `/tournaments/registrations/${registrationId}/reject`,
    { reason },
  );
  return res.data;
}

export async function generateBracket(id: string) {
  const res = await api.post(`/tournaments/${id}/generate-bracket`);
  return res.data;
}
