import { NextRequest } from 'next/server';
import ytdl from '@distube/ytdl-core';
import { extractVideoId } from '@/lib/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const itag = req.nextUrl.searchParams.get('itag');
  const title = req.nextUrl.searchParams.get('title') ?? 'download';

  if (!url || !itag) {
    return new Response('Missing url or itag parameter', { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  const itagNum = parseInt(itag, 10);
  if (isNaN(itagNum)) {
    return new Response('Invalid itag', { status: 400 });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const info = await ytdl.getInfo(videoUrl);
    const format = info.formats.find((f) => f.itag === itagNum);

    if (!format) {
      return new Response('Format not found', { status: 404 });
    }

    // ytdl-core already deciphers the URL — proxy it to the client
    const upstream = await fetch(format.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
      },
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { status: 502 });
    }

    const mimeType = (format.mimeType ?? 'video/mp4').split(';')[0];
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('audio') ? 'm4a' : 'mp4';
    const safeTitle = title.replace(/[^\w\s\-().]/g, '').trim() || 'download';

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${safeTitle}.${ext}"`,
      'Cache-Control': 'no-store',
    };
    if (format.contentLength) {
      headers['Content-Length'] = format.contentLength;
    }

    return new Response(upstream.body, { headers });
  } catch (err) {
    console.error('[/api/download]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Download failed: ${message}`, { status: 500 });
  }
}
