import { apiClient } from "@/api/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ReportPreset, ReportSummary } from "../schemas/reports";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";

type ReportSummaryApiResponse = {
  statusCode: number;
  message: string;
  data: ReportSummary;
};

export function useReportSummary(preset: ReportPreset, anchorDate: string) {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<ReportSummary>({
    queryKey: ["reports", "summary", preset, anchorDate, selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("reports/summary", {
        params: { preset, date: anchorDate, seasonId: selectedSeasonId ?? undefined },
      });
      return (response.data as ReportSummaryApiResponse).data;
    },
    placeholderData: keepPreviousData,
  });
}
