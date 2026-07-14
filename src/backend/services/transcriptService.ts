import { YoutubeTranscript } from 'youtube-transcript';

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;

export function extractVideoId(urlOrId: string): string {
  const match = urlOrId.match(RE_YOUTUBE);
  if (match) return match[1];
  return urlOrId.trim();
}

export async function fetchTranscriptText(urlOrId: string): Promise<string> {
  const videoId = extractVideoId(urlOrId);
  if (videoId.length !== 11) {
    throw new Error('올바르지 않은 유튜브 비디오 ID 형식입니다.');
  }

  const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
  
  if (!transcriptItems || transcriptItems.length === 0) {
    return '';
  }

  return transcriptItems
    .map((item) => item.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
