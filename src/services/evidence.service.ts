import { api } from "./api";

export async function submitMatchEvidence(
  matchId: string,
  payload: {
    imageUrl: string;
    note?: string;
  },
) {
  const res = await api.post(`/matches/${matchId}/evidence`, payload);
  return res.data;
}

export async function getMatchEvidences(matchId: string) {
  const res = await api.get(`/matches/${matchId}/evidence`);
  return res.data;
}
