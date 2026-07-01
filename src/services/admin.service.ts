import type { UserRole } from "@/routes/route-role";
import { api } from "./api";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  status: UserStatus | string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    captainTeams: number;
    teamMembers: number;
    tournaments: number;
  };
};

export type AdminTeam = {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  captainId: string;
  createdAt: string;
  updatedAt: string;
  captain: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    status: string;
  };
  members: Array<{
    id: string;
    userId: string;
    joinedAt: string;
    user: {
      id: string;
      username: string;
      email: string;
      role: UserRole;
      status: string;
    };
  }>;
  _count?: {
    members: number;
    invites: number;
    registrations: number;
  };
};

export type AdminTournament = {
  id: string;
  name: string;
  game: string;
  description: string | null;
  bannerUrl: string | null;
  maxTeams: number;
  teamSize: number;
  format: string;
  prizePool: string | null;
  rules: string | null;
  status: string;
  approvalSubmittedAt: string | null;
  approvalReviewedAt: string | null;
  approvalReviewedBy: string | null;
  approvalRejectReason: string | null;
  startDate: string;
  endDate: string | null;
  registrationDeadline: string;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
  organizer: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    status: string;
  };
  _count?: {
    registrations: number;
    matches: number;
  };
};

export type AdminOrganizerRequest = {
  id: string;
  userId: string;
  organizationName: string | null;
  contactEmail: string | null;
  socialLink: string | null;
  evidenceUrl: string | null;
  reason: string | null;
  experience: string | null;
  portfolioUrl: string | null;
  status: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    status: string;
    createdAt?: string;
  };
  reviewer?: {
    id: string;
    username: string;
    email: string;
  } | null;
};

export type AdminDispute = {
  id: string;
  matchId: string;
  createdBy: string;
  reason: string;
  description: string | null;
  status: string;
  decision: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  match: {
    id: string;
    status: string;
    pendingScoreA: number | null;
    pendingScoreB: number | null;
    resultSubmittedTeamId: string | null;
    evidences?: {
      id: string;
      imageUrl: string;
      note: string | null;
      submittedBy: string;
    }[];
    tournament?: {
      id: string;
      name: string;
      game: string;
      status: string;
    };
  };
};

export type AdminAuditLog = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string | null;
  createdAt: string;
};

export type AdminIntegrationDeliveryLog = {
  id: string;
  provider: string;
  eventType: string;
  status: string;
  recipient: string | null;
  targetType: string | null;
  targetId: string | null;
  providerStatus: number | null;
  providerMessageId: string | null;
  error: string | null;
  metadata: string | null;
  createdAt: string;
};

type ApiResponse<T> = {
  message: string;
  data: T;
};

export async function getAdminUsers(): Promise<ApiResponse<AdminUser[]>> {
  const res = await api.get("/admin/users");
  return res.data;
}

export async function getAdminTeams(): Promise<ApiResponse<AdminTeam[]>> {
  const res = await api.get("/admin/teams");
  return res.data;
}

export async function getAdminTournaments(): Promise<
  ApiResponse<AdminTournament[]>
> {
  const res = await api.get("/admin/tournaments");
  return res.data;
}

export async function getAdminOrganizerRequests(): Promise<
  ApiResponse<AdminOrganizerRequest[]>
> {
  const res = await api.get("/admin/organizer-requests");
  return res.data;
}

export async function approveAdminOrganizerRequest(
  id: string,
): Promise<ApiResponse<AdminOrganizerRequest>> {
  const res = await api.patch(`/admin/organizer-requests/${id}/approve`);
  return res.data;
}

export async function rejectAdminOrganizerRequest(
  id: string,
  reason: string,
): Promise<ApiResponse<AdminOrganizerRequest>> {
  const res = await api.patch(`/admin/organizer-requests/${id}/reject`, {
    reason,
  });
  return res.data;
}

export async function getAdminTournamentApprovals(): Promise<
  ApiResponse<AdminTournament[]>
> {
  const res = await api.get("/admin/tournament-approvals");
  return res.data;
}

export async function approveAdminTournament(
  id: string,
): Promise<ApiResponse<AdminTournament>> {
  const res = await api.post(`/admin/tournaments/${id}/approve`);
  return res.data;
}

export async function rejectAdminTournament(
  id: string,
  reason: string,
): Promise<ApiResponse<AdminTournament>> {
  const res = await api.post(`/admin/tournaments/${id}/reject`, { reason });
  return res.data;
}

export async function getAdminDisputes(): Promise<
  ApiResponse<AdminDispute[]>
> {
  const res = await api.get("/admin/disputes");
  return res.data;
}

export async function getAdminAuditLogs(): Promise<
  ApiResponse<AdminAuditLog[]>
> {
  const res = await api.get("/admin/audit-logs");
  return res.data;
}

export async function getAdminIntegrationDeliveryLogs(): Promise<
  ApiResponse<AdminIntegrationDeliveryLog[]>
> {
  const res = await api.get("/admin/integration-deliveries");
  return res.data;
}

export async function updateAdminUserRole(
  id: string,
  role: UserRole,
): Promise<ApiResponse<AdminUser>> {
  const res = await api.patch(`/admin/users/${id}/role`, { role });
  return res.data;
}

export async function updateAdminUserStatus(
  id: string,
  status: UserStatus,
): Promise<ApiResponse<AdminUser>> {
  const res = await api.patch(`/admin/users/${id}/status`, { status });
  return res.data;
}
