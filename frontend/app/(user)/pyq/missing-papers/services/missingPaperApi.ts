import { apiGet } from "@/lib/api";
import { API_URL } from "@/lib/api"

const API_BASE = "/api/public";

export const getPublicMissingPapers = async (
  params?: string
) => {
  return apiGet(
    `/api/public/missing_papers${params || ""}`
  );
};


export const uploadPublicPaper = async (
  paperId: string,
  file: File,
  uploader_name?: string
) => {

  const formData = new FormData();

  formData.append("file", file);

  if (uploader_name) {
    formData.append(
      "uploader_name",
      uploader_name
    );
  }


  const res = await fetch(
    `${API_URL}/api/public/missing_papers/upload/${paperId}`,
    {
      method: "POST",
      body: formData,
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json.detail ||
      json.message ||
      "Upload failed"
    );
  }

  return json;
};