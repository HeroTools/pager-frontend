const TENOR_API_KEY = process.env.TENOR_API_KEY;
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

export async function GET(request: Request) {
  if (!TENOR_API_KEY) {
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const pos = searchParams.get('pos');

  if (!query) {
    return Response.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    const url = new URL(`${TENOR_BASE_URL}/search`);
    url.searchParams.append('key', TENOR_API_KEY);
    url.searchParams.append('q', query);
    url.searchParams.append('limit', '20');
    url.searchParams.append('contentfilter', 'medium');
    url.searchParams.append('media_filter', 'tinygif,gif');

    if (pos) {
      url.searchParams.append('pos', pos);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.statusText}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Tenor search error:', error);
    return Response.json({ error: 'Failed to search GIFs' }, { status: 500 });
  }
}
