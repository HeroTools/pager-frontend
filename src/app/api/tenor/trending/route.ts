const TENOR_API_KEY = process.env.TENOR_API_KEY;
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

export async function GET() {
  if (!TENOR_API_KEY) {
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const url = new URL(`${TENOR_BASE_URL}/featured`);
    url.searchParams.append('key', TENOR_API_KEY);
    url.searchParams.append('limit', '20');
    url.searchParams.append('contentfilter', 'medium');
    url.searchParams.append('media_filter', 'tinygif,gif');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.statusText}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Tenor trending error:', error);
    return Response.json({ error: 'Failed to fetch trending GIFs' }, { status: 500 });
  }
}
