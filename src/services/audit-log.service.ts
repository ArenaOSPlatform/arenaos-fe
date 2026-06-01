import { api } from "./api";

export async function getAuditLogs() {
  const res = await api.get("/audit-logs");
  return {
    message: "Get audit logs successfully",
    data: res.data,
  };
}
