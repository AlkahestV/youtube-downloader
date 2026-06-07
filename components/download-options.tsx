'use client';

import { useState } from 'react';
import type { VideoInfo } from './video-card';

interface Props {
  info: VideoInfo;
  url: string;
}

function DownloadRow({
  label,
  sublabel,
  icon,
  status,
  onClick,
  disabled,
}: {
  label: string;
  sublabel: string;
  icon: string;
  status: string | null;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-3.5 text-left transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-white text-sm font-medium">{label}</p>
          <p className="text-zinc-500 text-xs">{status ?? sublabel}</p>
        </div>
      </div>
      <span className="text-zinc-400 text-xs shrink-0 ml-2">
        {status ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          '↓'
        )}
      </span>
    </button>
  );
}

export default function DownloadOptions({ info, url }: Props) {
  const [activeType, setActiveType] = useState<string | null>(null);
  const [mp3Status, setMp3Status] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = activeType !== null || mp3Status !== null;

  function buildDownloadUrl(type: 'video' | 'audio') {
    const p = new URLSearchParams({ url, type, title: info.title });
    return `/api/download?${p}`;
  }

  function triggerDownload(href: string, filename: string) {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleVideoDownload() {
    if (isBusy) return;
    setError(null);
    setActiveType('video');
    triggerDownload(buildDownloadUrl('video'), `${info.title}.mp4`);
    setTimeout(() => setActiveType(null), 3000);
  }

  function handleAudioDownload() {
    if (isBusy) return;
    setError(null);
    setActiveType('audio');
    triggerDownload(buildDownloadUrl('audio'), `${info.title}.m4a`);
    setTimeout(() => setActiveType(null), 3000);
  }

  async function handleMp3Download() {
    if (isBusy) return;
    setError(null);
    setMp3Status('Loading converter...');

    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();

      setMp3Status('Loading FFmpeg WASM (~20 MB first run)...');
      const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setMp3Status('Downloading audio...');
      const audioResponse = await fetch(buildDownloadUrl('audio'));
      if (!audioResponse.ok) throw new Error(`HTTP ${audioResponse.status}`);

      setMp3Status('Converting to MP3...');
      const audioBuffer = await audioResponse.arrayBuffer();
      await ffmpeg.writeFile('input.m4a', new Uint8Array(audioBuffer));
      await ffmpeg.exec(['-i', 'input.m4a', '-codec:a', 'libmp3lame', '-q:a', '2', 'output.mp3']);

      const data = await ffmpeg.readFile('output.mp3');
      const rawBytes = data as Uint8Array;
      const safeCopy = new Uint8Array(rawBytes.length);
      safeCopy.set(rawBytes);
      const blob = new Blob([safeCopy], { type: 'audio/mpeg' });
      const objectUrl = URL.createObjectURL(blob);

      const safeName = info.title.replace(/[^\w\s\-().]/g, '').trim() || 'audio';
      triggerDownload(objectUrl, `${safeName}.mp3`);
      URL.revokeObjectURL(objectUrl);

      await ffmpeg.deleteFile('input.m4a');
      await ffmpeg.deleteFile('output.mp3');
    } catch (err) {
      console.error('[MP3 convert]', err);
      setError('MP3 conversion failed. Try downloading as M4A instead.');
    } finally {
      setMp3Status(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider px-1">
        Download options
      </p>

      <DownloadRow
        icon="🎬"
        label="Video MP4"
        sublabel="Best quality up to 720p"
        status={activeType === 'video' ? 'Starting download...' : null}
        onClick={handleVideoDownload}
        disabled={isBusy}
      />

      <DownloadRow
        icon="🎵"
        label="Audio (M4A)"
        sublabel="AAC audio, no conversion"
        status={activeType === 'audio' ? 'Starting download...' : null}
        onClick={handleAudioDownload}
        disabled={isBusy}
      />

      <DownloadRow
        icon="🎶"
        label="Audio (MP3)"
        sublabel="Converted in your browser"
        status={mp3Status}
        onClick={handleMp3Download}
        disabled={isBusy}
      />

      {error && (
        <div className="bg-red-950/50 border border-red-900 rounded-xl px-4 py-3 text-red-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
