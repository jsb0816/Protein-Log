export interface YoutubeMetadata {
  videoId: string;
  title: string;
  author: string;
}

export function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function fetchYoutubeMetadata(url: string): Promise<YoutubeMetadata | null> {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`;

    const response = await fetch(oembedUrl);
    if (!response.ok) return { videoId, title: '', author: '' };

    const data = await response.json();
    return {
      videoId,
      title: data.title || '',
      author: data.author_name || '',
    };
  } catch {
    return videoId ? { videoId, title: '', author: '' } : null;
  }
}

export function buildYoutubeContextBlock(
  url: string,
  metadata: YoutubeMetadata | null,
  extraContext: string
): string {
  const parts: string[] = [];

  if (metadata?.title) {
    parts.push(`[영상 제목] ${metadata.title}`);
  }
  if (metadata?.author) {
    parts.push(`[채널명] ${metadata.author}`);
  }
  if (metadata?.videoId) {
    parts.push(`[영상 ID] ${metadata.videoId}`);
  }

  parts.push(`[유튜브 URL] ${url}`);

  if (extraContext.trim()) {
    parts.push(`[사용자 제공 자막/설명/멘트]\n${extraContext.trim()}`);
  }

  return parts.join('\n');
}
