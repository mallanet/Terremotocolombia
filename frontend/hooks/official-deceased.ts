"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
  buildOfficialDeceasedUrl,
  type OfficialDeceasedParams,
  type OfficialDeceasedResponse,
} from "@/lib/official-deceased";

export function useOfficialDeceased(params: OfficialDeceasedParams) {
  return useQuery({
    queryKey: qk.deceased.list(params),
    queryFn: ({ signal }) =>
      apiGet<OfficialDeceasedResponse>(buildOfficialDeceasedUrl(params), signal),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}
