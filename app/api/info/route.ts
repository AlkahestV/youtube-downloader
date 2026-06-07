import { NextRequest, NextResponse } from 'next/server';
import { getInnertube, extractVideoId } from '@/lib/youtube';

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

  try {
    const yt = await getInnertube();
    const info = await yt.getBasicInfo(videoId);
    const { basic_info, streaming_data } = info;

    if (!basic_info.title) {
      return NextResponse.json({ error: 'Video not found or unavailable' }, { status: 404 });
    }

    const allFormats = [
      ...(streaming_data?.formats ?? []),
      ...(streaming_data?.adaptive_formats ?? []),
    ];

    // Combined video+audio formats (progressive) — typically up to 720p
    const combinedFormats = (streaming_data?.formats ?? [])
      .filter((f) => f.has_video && f.has_audio && f.quality_label)
      .map((f) => ({
        itag: f.itag,
        quality: f.quality_label!,
        mimeType: f.mime_type ?? 'video/mp4',
        container: (f.mime_type?.includes('webm') ? 'webm' : 'mp4') as 'mp4' | 'webm',
        type: 'video+audio' as const,
      }))
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

    // Best audio-only M4A format
    const audioFormat = (streaming_data?.adaptive_formats ?? [])
      .filter((f) => f.has_audio && !f.has_video && f.mime_type?.includes('audio/mp4'))
      .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

    const audioFormats = audioFormat
      ? [
          {
            itag: audioFormat.itag,
            quality: 'Audio only',
            mimeType: audioFormat.mime_type ?? 'audio/mp4',
            container: 'm4a' as const,
            type: 'audio' as const,
          },
        ]
      : [];

    // Best thumbnail
    const thumbnail =
      basic_info.thumbnail
        ?.slice()
        .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;

    return NextResponse.json({
      id: videoId,
      title: basic_info.title,
      duration: basic_info.duration ?? 0,
      thumbnail,
      author: basic_info.author ?? 'Unknown',
      formats: [...combinedFormats, ...audioFormats],
    });
  } catch (err) {
    console.error('[/api/info]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch video info: ${message}` },
      { status: 500 }
    );
  }
}
