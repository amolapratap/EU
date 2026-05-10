import {
  apiGet,
  apiPost,
  apiDelete,
} from "@/lib/api";


export const getMissingPapers = async (params?: any) => {
  const query = new URLSearchParams(params).toString();

  return await apiGet(
    `/admin/missing_papers?${query}`
  );
};


export const createMissingPaper = async (body: any) => {
  return await apiPost(
    "/admin/add_in_missing_papers_list",
    body
  );
};


export const approvePaper = async (paperId: string) => {
  return await apiPost(
    `/admin/approve/${paperId}`,
    {}
  );
};


export const rejectPaper = async (
  paperId: string,
  description: string
) => {
  return await apiPost(
    `/admin/reject/${paperId}`,
    {
      description,
    }
  );
};


export const deletePaper = async (paperId: string) => {
  return await apiDelete(
    `/admin/delete/${paperId}`
  );
};