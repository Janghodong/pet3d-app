import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_MODEL_HOSTS = new Set([
  'tripo-data.rg1.data.tripo3d.com',
]);

function isAllowedModelUrl(url: URL) {
  return url.protocol === 'https:' && ALLOWED_MODEL_HOSTS.has(url.hostname);
}

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get('url');

  if (!sourceUrl) {
    return NextResponse.json({ error: 'Missing model URL' }, { status: 400 });
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid model URL' }, { status: 400 });
  }

  if (!isAllowedModelUrl(parsedUrl)) {
    return NextResponse.json({ error: 'Model host is not allowed' }, { status: 400 });
  }

  try {
    const upstreamResponse = await fetch(parsedUrl, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!upstreamResponse.ok) {
      const message = await upstreamResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch model (${upstreamResponse.status}): ${message}` },
        { status: upstreamResponse.status }
      );
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') || 'model/gltf-binary',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Model proxy failed: ${message}` }, { status: 502 });
  }
}
