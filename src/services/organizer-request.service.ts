import { api } from "./api";

export type OrganizerRequest = {
  id: string;
  userId: string;
  reason: string | null;
  experience: string | null;
  portfolioUrl: string | null;
  status: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  message: string;
  data: T;
};

export type CreateOrganizerRequestPayload = {
  reason?: string;
  experience?: string;
  portfolioUrl?: string;
};

export async function createOrganizerRequest(
  payload: CreateOrganizerRequestPayload,
): Promise<ApiResponse<OrganizerRequest>> {
  const res = await api.post("/organizer-requests", payload);
  return res.data;
}

export async function getMyOrganizerRequests(): Promise<
  ApiResponse<OrganizerRequest[]>
> {
  const res = await api.get("/organizer-requests/me");
  return res.data;
}
