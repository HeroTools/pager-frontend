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

export async function searchGifs(query: string, pos?: string): Promise<TenorSearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (pos) params.append('pos', pos);

  const response = await fetch(`/api/tenor/search?${params}`);
  if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
  return response.json();
}

export async function getTrendingGifs(): Promise<TenorSearchResponse> {
  const response = await fetch('/api/tenor/trending');
  if (!response.ok) throw new Error(`Trending failed: ${response.statusText}`);
  return response.json();
}
