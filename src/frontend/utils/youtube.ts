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

export async function fetchYoutubeTranscript(urlOrId: string): Promise<string | null> {
  const videoId = extractYoutubeVideoId(urlOrId);
  if (!videoId) return null;

  try {
    const response = await fetch(`/api/transcript?videoId=${videoId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('[fetchYoutubeTranscript] API responded with error:', errorData.error);
      return null;
    }
    const data = await response.json();
    return data.transcript || null;
  } catch (err) {
    console.error('[fetchYoutubeTranscript] Failed to fetch:', err);
    return null;
  }
}

export function buildYoutubeContextBlock(
  url: string,
  metadata: YoutubeMetadata | null,
  extraContext: string,
  transcriptText?: string | null
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

  if (transcriptText?.trim()) {
    parts.push(`[영상 자동 추출 자막 스크립트]\n${transcriptText.trim()}`);
  }

  if (extraContext.trim()) {
    parts.push(`[사용자 제공 추가 정보]\n${extraContext.trim()}`);
  }

  return parts.join('\n');
}
