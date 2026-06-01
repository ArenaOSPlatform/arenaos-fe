import { api } from "./api";

export type UploadResponse = {
  message: string;
  data: {
    filename: string;
    path: string;
    url: string;
  };
};

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/uploads", formData);

  return res.data;
}
