import Downloader from '@/components/downloader';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12 pb-20">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">YouTube Downloader</h1>
          <p className="text-zinc-500 text-sm">Paste a YouTube URL to download video or audio</p>
        </div>
        <Downloader />
      </div>
    </main>
  );
}
