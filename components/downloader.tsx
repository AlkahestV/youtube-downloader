'use client';

import { useState } from 'react';
import UrlInput from './url-input';
import VideoCard, { type VideoInfo } from './video-card';
import DownloadOptions from './download-options';

export default function Downloader() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(url: string) {
    setLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to fetch video info.');
        return;
      }

      setVideoInfo(data);
      setCurrentUrl(url);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <UrlInput onSubmit={handleSubmit} loading={loading} />

      {error && (
        <div className="bg-red-950/50 border border-red-900 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {videoInfo && (
        <>
          <VideoCard info={videoInfo} />
          <DownloadOptions info={videoInfo} url={currentUrl} />
        </>
      )}
    </div>
  );
}
