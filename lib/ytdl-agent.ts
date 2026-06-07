import ytdl from '@distube/ytdl-core';

// Returns a ytdl agent using YouTube cookies from the YOUTUBE_COOKIES env var.
// Without cookies, Vercel/cloud IPs get hit with YouTube's bot check.
// Set YOUTUBE_COOKIES to a JSON array of cookie objects exported from your browser.
export function createAgent() {
  const raw = process.env.YOUTUBE_COOKIES;
  if (!raw) return ytdl.createAgent();

  try {
    const cookies = JSON.parse(raw);
    return ytdl.createAgent(cookies);
  } catch {
    console.warn('[ytdl-agent] Failed to parse YOUTUBE_COOKIES, proceeding without cookies');
    return ytdl.createAgent();
  }
}
