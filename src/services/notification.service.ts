import { api } from "./api";

export async function getMyNotifications() {
  const res = await api.get("/notifications");
  return res.data;
}

export async function markNotificationAsRead(id: string) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsAsRead() {
  const res = await api.patch("/notifications/read-all");
  return res.data;
}
