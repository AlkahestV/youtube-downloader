import { formatDuration } from '@/lib/utils';

export interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string | null;
  author: string;
}

export default function VideoCard({ info }: { info: VideoInfo }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {info.thumbnail && (
        <div className="relative w-full aspect-video bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={info.thumbnail}
            alt={info.title}
            className="w-full h-full object-cover"
          />
          {info.duration > 0 && (
            <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-0.5 rounded">
              {formatDuration(info.duration)}
            </span>
          )}
        </div>
      )}
      <div className="px-4 py-3">
        <p className="text-white text-sm font-medium leading-snug line-clamp-2 mb-0.5">
          {info.title}
        </p>
        <p className="text-zinc-500 text-xs">{info.author}</p>
      </div>
    </div>
  );
}
