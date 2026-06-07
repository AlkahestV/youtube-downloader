import { NextRequest } from 'next/server';
import { extractVideoId } from '@/lib/youtube';
import { ytdlpExec } from '@/lib/ytdlp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const type = req.nextUrl.searchParams.get('type');
  const title = req.nextUrl.searchParams.get('title') ?? 'download';

  if (!url || !type) {
    return new Response('Missing url or type parameter', { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  if (type !== 'video' && type !== 'audio') {
    return new Response('type must be "video" or "audio"', { status: 400 });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Use progressive (single-stream) formats to get one URL back from --get-url.
  // YouTube progressive MP4s cap at 720p; this is intentional — split adaptive streams
  // would require server-side merging which isn't feasible in a serverless function.
  const formatSelector =
    type === 'video'
      ? 'best[ext=mp4][height<=720]/best[ext=mp4]/best[height<=720]/best'
      : 'bestaudio[ext=m4a]/bestaudio';

  try {
    const output = await ytdlpExec([
      '--get-url',
      '-f', formatSelector,
      '--no-warnings',
      videoUrl,
    ]);

    // Progressive formats return one URL; merged formats return two (video\naudio).
    // We always take the first URL — for video that's the combined stream.
    const streamUrl = output.split('\n').find((line) => line.startsWith('http'));
    if (!streamUrl) {
      return new Response('Could not resolve stream URL', { status: 502 });
    }

    const upstream = await fetch(streamUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
      },
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { status: 502 });
    }

    const ext = type === 'audio' ? 'm4a' : 'mp4';
    const mimeType = type === 'audio' ? 'audio/mp4' : 'video/mp4';
    const safeTitle = title.replace(/[^\w\s\-().]/g, '').trim() || 'download';

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${safeTitle}.${ext}"`,
      'Cache-Control': 'no-store',
    };

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers['Content-Length'] = contentLength;

    return new Response(upstream.body, { headers });
  } catch (err) {
    console.error('[/api/download]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Download failed: ${message}`, { status: 500 });
  }
}
