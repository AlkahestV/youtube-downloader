import { NextRequest, NextResponse } from 'next/server';
import { extractVideoId } from '@/lib/youtube';
import { ytdlpExec } from '@/lib/ytdlp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const json = await ytdlpExec(['--dump-single-json', '--no-warnings', videoUrl]);
    const data = JSON.parse(json) as {
      title?: string;
      duration?: number;
      thumbnails?: Array<{ url: string; width?: number }>;
      uploader?: string;
      channel?: string;
    };

    const thumbnail =
      (data.thumbnails ?? []).sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;

    return NextResponse.json({
      id: videoId,
      title: data.title ?? 'Unknown',
      duration: data.duration ?? 0,
      thumbnail,
      author: data.uploader ?? data.channel ?? 'Unknown',
    });
  } catch (err) {
    console.error('[/api/info]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch video info: ${message}` }, { status: 500 });
  }
}
