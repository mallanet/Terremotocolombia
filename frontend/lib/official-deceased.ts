export interface OfficialDeceasedPerson {
  id: string;
  name: string;
  age: number | null;
  location: string;
  description: string;
  list: {
    id: string;
    title: string;
    sourceName: string;
    sourceUrl: string;
    publishedAt: number | null;
  };
  createdAt: number;
}

export interface OfficialDeceasedResponse {
  people: OfficialDeceasedPerson[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OfficialDeceasedParams {
  page: number;
  pageSize: number;
  q?: string;
}

export function buildOfficialDeceasedUrl(params: OfficialDeceasedParams): string {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set("q", params.q);
  return `/api/deceased?${search.toString()}`;
}
