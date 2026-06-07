import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, writeFileSync, chmodSync } from 'fs';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

const isWin = process.platform === 'win32';
const BIN = path.join(os.tmpdir(), isWin ? 'yt-dlp.exe' : 'yt-dlp');
const COOKIES_FILE = path.join(os.tmpdir(), 'yt-dlp-cookies.txt');
let binaryReady = false;
let cookiesWritten = false;

export async function ensureBinary(): Promise<void> {
  if (binaryReady && existsSync(BIN)) return;

  const filename = isWin ? 'yt-dlp.exe' : 'yt-dlp_linux';
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${filename}`;

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to download yt-dlp binary: ${res.status}`);

  const buf = await res.arrayBuffer();
  writeFileSync(BIN, Buffer.from(buf));
  if (!isWin) chmodSync(BIN, 0o755);
  binaryReady = true;
}

function ensureCookies(): string | null {
  if (cookiesWritten && existsSync(COOKIES_FILE)) return COOKIES_FILE;

  const raw = process.env.YOUTUBE_COOKIES;
  if (!raw) return null;

  try {
    const cookies = JSON.parse(raw) as Array<{
      domain?: string;
      path?: string;
      secure?: boolean;
      expires?: number;
      name: string;
      value: string;
    }>;

    const lines = ['# Netscape HTTP Cookie File'];
    for (const c of cookies) {
      const domain = c.domain ?? '.youtube.com';
      const subDomainFlag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const expires = Math.floor(c.expires ?? 0);
      lines.push([domain, subDomainFlag, c.path ?? '/', secure, expires, c.name, c.value].join('\t'));
    }

    writeFileSync(COOKIES_FILE, lines.join('\n'));
    cookiesWritten = true;
    return COOKIES_FILE;
  } catch (err) {
    console.warn('[ytdlp] Failed to write cookies file:', err);
    return null;
  }
}

export async function ytdlpExec(args: string[]): Promise<string> {
  await ensureBinary();

  const cookiesPath = ensureCookies();
  const cookieArgs = cookiesPath ? ['--cookies', cookiesPath] : [];

  const { stdout } = await execFileAsync(
    BIN,
    [...cookieArgs, '--no-playlist', ...args],
    { maxBuffer: 50 * 1024 * 1024, timeout: 30000 },
  );

  return stdout.trim();
}
