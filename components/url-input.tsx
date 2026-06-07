'use client';

import { useState, FormEvent } from 'react';

interface Props {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export default function UrlInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setValue(text.trim());
    } catch {
      // Clipboard API unavailable — user can type manually
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm pr-20 transition-colors"
        />
        <button
          type="button"
          onClick={handlePaste}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Paste
        </button>
      </div>
      <button
        type="submit"
        disabled={!value.trim() || loading}
        className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Fetching...
          </span>
        ) : (
          'Get Video'
        )}
      </button>
    </form>
  );
}
