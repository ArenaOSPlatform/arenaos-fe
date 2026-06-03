import { api } from "./api";

export async function getUserProfile(id: string) {
  const res = await api.get(`/users/${id}`);
  return res.data;
}
