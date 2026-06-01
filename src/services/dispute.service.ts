import { api } from "./api";

export type ResolveDisputeDecision =
  | "APPROVE_TEAM_A_RESULT"
  | "APPROVE_TEAM_B_RESULT"
  | "REMATCH";

export async function createDispute(
  matchId: string,
  payload: {
    reason: string;
    description?: string;
  },
) {
  const res = await api.post(`/matches/${matchId}/disputes`, payload);
  return res.data;
}

export async function getDisputes() {
  const res = await api.get("/disputes");
  return res.data;
}

export async function resolveDispute(
  disputeId: string,
  payload: {
    decision: ResolveDisputeDecision;
  },
) {
  const res = await api.post(`/disputes/${disputeId}/resolve`, payload);
  return res.data;
}
