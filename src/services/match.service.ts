import { api } from "./api";

export async function getMatchById(matchId: string) {
  const res = await api.get(`/matches/${matchId}`);
  return res.data;
}

export async function submitMatchResult(
  matchId: string,
  payload: {
    scoreA: number;
    scoreB: number;
    imageUrl: string;
    fileUrl?: string;
    type?: string;
    note?: string;
  },
) {
  const res = await api.post(`/matches/${matchId}/submit-result`, payload);
  return res.data;
}

export async function confirmMatchResult(matchId: string) {
  const res = await api.post(`/matches/${matchId}/confirm-result`);
  return res.data;
}

export async function disputeMatchResult(
  matchId: string,
  payload: {
    reason: string;
    description?: string;
    imageUrl?: string;
    fileUrl?: string;
    type?: string;
    note?: string;
  },
) {
  const res = await api.post(`/matches/${matchId}/disputes`, payload);
  return res.data;
}

export async function checkInMatch(matchId: string) {
  const res = await api.post(`/matches/${matchId}/check-in`);
  return res.data;
}

export async function startMatch(matchId: string) {
  const res = await api.post(`/matches/${matchId}/start`);
  return res.data;
}

export async function scheduleMatch(
  matchId: string,
  payload: {
    scheduledAt: string;
    roomCode: string;
    livestreamUrl?: string;
    bestOf?: string;
    note?: string;
  },
) {
  const res = await api.patch(`/matches/${matchId}/schedule`, payload);
  return res.data;
}

export async function updateMatchLivestream(
  matchId: string,
  payload: {
    livestreamUrl: string;
  },
) {
  const res = await api.post(`/matches/${matchId}/livestream`, payload);
  return res.data;
}

export async function completeMatch(
  matchId: string,
  payload: {
    scoreA: number;
    scoreB: number;
  },
) {
  const res = await api.post(`/matches/${matchId}/complete`, payload);
  return res.data;
}
