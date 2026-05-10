import { useQuery } from "@tanstack/react-query";
import { getMissingPapers } from "../services/missingPaperApi";

export const useMissingPapers = (filters: any) => {
  return useQuery({
    queryKey: ["missing-papers", filters],
    queryFn: () => getMissingPapers(filters),
    enabled: !!filters,
  });
};