import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

async function proxyStorage(request: NextRequest, method: 'GET' | 'HEAD') {
  const { searchParams } = new URL(request.url);
  const storageUrl = searchParams.get('storageUrl');
  if (!storageUrl) {
    return new NextResponse(method === 'GET' ? 'Missing storageUrl parameter' : null, {
      status: 400,
    });
  }

  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    console.error('Auth session error:', error);
    return new NextResponse(method === 'GET' ? 'Unauthorized' : null, { status: 401 });
  }
  const token = session.access_token;

  const storageResponse = await fetch(storageUrl, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!storageResponse.ok) {
    const text = await storageResponse.text();
    console.error('Storage error:', storageResponse.status, text);
    const status = storageResponse.status;
    if (status === 403) {
      return new NextResponse(method === 'GET' ? 'Access denied – check RLS policies' : null, {
        status: 403,
      });
    }
    if (status === 404) {
      return new NextResponse(method === 'GET' ? 'File not found' : null, { status: 404 });
    }
    return new NextResponse(method === 'GET' ? `Storage error: ${text}` : null, { status });
  }

  const contentType = storageResponse.headers.get('content-type') || 'application/octet-stream';
  const contentLength = storageResponse.headers.get('content-length');
  const filename = storageUrl.split('/').pop() || 'download';

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Disposition': `inline; filename="${filename}"`,
    'Cache-Control': 'private, max-age=3600',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, apikey',
  };
  if (contentLength) headers['Content-Length'] = contentLength;

  return new NextResponse(method === 'GET' ? storageResponse.body : null, { status: 200, headers });
}

export async function GET(request: NextRequest) {
  return proxyStorage(request, 'GET');
}

export async function HEAD(request: NextRequest) {
  return proxyStorage(request, 'HEAD');
}
