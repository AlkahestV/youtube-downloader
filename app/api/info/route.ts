import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import { extractVideoId } from '@/lib/youtube';
import { createAgent } from '@/lib/ytdl-agent';

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
    const info = await ytdl.getInfo(videoUrl, { agent: createAgent() });
    const { videoDetails, formats } = info;

    // Combined video+audio MP4 formats (progressive) — typically up to 720p
    const combinedFormats = ytdl
      .filterFormats(formats, 'videoandaudio')
      .filter((f) => f.container === 'mp4' && f.qualityLabel)
      .sort((a, b) => parseInt(b.qualityLabel) - parseInt(a.qualityLabel))
      .map((f) => ({
        itag: f.itag,
        quality: f.qualityLabel,
        mimeType: f.mimeType ?? 'video/mp4',
        container: 'mp4' as const,
        type: 'video+audio' as const,
      }));

    // Best audio-only M4A (AAC) format
    const bestAudio = ytdl
      .filterFormats(formats, 'audioonly')
      .filter((f) => f.container === 'mp4')
      .sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0))[0];

    const audioFormats = bestAudio
      ? [
          {
            itag: bestAudio.itag,
            quality: 'Audio only',
            mimeType: bestAudio.mimeType ?? 'audio/mp4',
            container: 'm4a' as const,
            type: 'audio' as const,
          },
        ]
      : [];

    const thumbnail =
      videoDetails.thumbnails.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;

    return NextResponse.json({
      id: videoId,
      title: videoDetails.title,
      duration: parseInt(videoDetails.lengthSeconds, 10),
      thumbnail,
      author: videoDetails.author?.name ?? 'Unknown',
      formats: [...combinedFormats, ...audioFormats],
    });
  } catch (err) {
    console.error('[/api/info]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch video info: ${message}` }, { status: 500 });
  }
}
