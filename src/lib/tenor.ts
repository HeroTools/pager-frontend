// Tenor API client for GIF search

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY;
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

export interface TenorGif {
  id: string;
  title: string;
  content_description: string;
  media_formats: {
    gif: { url: string };
    tinygif: {
      url: string;
      dims?: [number, number];
    };
  };
}

export interface TenorSearchResponse {
  results: TenorGif[];
  next?: string;
}

async function fetchTenor(
  endpoint: string,
  params: Record<string, string>,
): Promise<TenorSearchResponse> {
  const url = new URL(`${TENOR_BASE_URL}/${endpoint}`);
  Object.entries({ key: TENOR_API_KEY, ...params }).forEach(([k, v]) =>
    url.searchParams.append(k, v),
  );

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Tenor API error: ${response.statusText}`);
  return response.json();
}

export async function searchGifs(query: string, pos?: string): Promise<TenorSearchResponse> {
  return fetchTenor('search', {
    q: query,
    limit: '20',
    contentfilter: 'medium',
    media_filter: 'tinygif,gif',
    ...(pos && { pos }),
  });
}

export async function getTrendingGifs(): Promise<TenorSearchResponse> {
  return fetchTenor('featured', {
    limit: '20',
    contentfilter: 'medium',
    media_filter: 'tinygif,gif',
  });
}
