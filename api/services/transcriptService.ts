import { YoutubeTranscript } from 'youtube-transcript';

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;

export function extractVideoId(urlOrId: string): string {
  const match = urlOrId.match(RE_YOUTUBE);
  if (match) return match[1];
  return urlOrId.trim();
}

async function fetchWithProxy(url: string, scraperApiKey?: string): Promise<string> {
  if (scraperApiKey && scraperApiKey.trim()) {
    const proxyUrl = `https://api.scraperapi.com/?api_key=${encodeURIComponent(
      scraperApiKey.trim()
    )}&url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`ScraperAPI responded with status ${response.status}`);
    }
    return response.text();
  } else {
    const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8'
      }
    });
    if (!response.ok) {
      throw new Error(`Direct fetch responded with status ${response.status}`);
    }
    return response.text();
  }
}

function extractJsonUsingBraces(html: string): string | null {
  const marker = 'var ytInitialPlayerResponse = ';
  const index = html.indexOf(marker);
  if (index === -1) return null;
  
  const startPos = index + marker.length;
  const firstBrace = html.indexOf('{', startPos);
  if (firstBrace === -1) return null;
  
  let braceCount = 0;
  let endPos = -1;
  for (let i = firstBrace; i < html.length; i++) {
    const char = html[i];
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        endPos = i + 1;
        break;
      }
    }
  }
  
  if (endPos === -1) return null;
  return html.substring(firstBrace, endPos);
}

export async function fetchTranscriptText(urlOrId: string): Promise<string> {
  const videoId = extractVideoId(urlOrId);
  if (videoId.length !== 11) {
    throw new Error('올바르지 않은 유튜브 비디오 ID 형식입니다.');
  }

  const scraperApiKey = process.env.SCRAPER_API_KEY;

  // Try custom scraping with ScraperAPI first (or direct fetch fallback)
  try {
    const html = await fetchWithProxy(`https://www.youtube.com/watch?v=${videoId}`, scraperApiKey);
    const jsonStr = extractJsonUsingBraces(html);
    
    if (jsonStr) {
      const playerResponse = JSON.parse(jsonStr);
      const tracklist = playerResponse.captions?.playerCaptionsTracklistRenderer;
      const captionTracks = tracklist?.captionTracks;

      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        // Find best language track: Korean first, English second, fallback to first
        let selectedTrack = captionTracks.find((t) => t.languageCode === 'ko');
        if (!selectedTrack) {
          selectedTrack = captionTracks.find((t) => t.languageCode === 'en');
        }
        if (!selectedTrack) {
          selectedTrack = captionTracks[0];
        }

        if (selectedTrack && selectedTrack.baseUrl) {
          // Fetch XML subtitles
          const xml = await fetchWithProxy(selectedTrack.baseUrl, scraperApiKey);
          const matches = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
          
          if (matches.length > 0) {
            const text = matches
              .map((m) => {
                return m[1]
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/&nbsp;/g, ' ')
                  .trim();
              })
              .filter((t) => t.length > 0)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (text) {
              console.log(`[TranscriptService] Successfully fetched transcript using custom scraper (${selectedTrack.languageCode})`);
              return text;
            }
          }
        }
      }
    }
  } catch (customErr: any) {
    console.warn('[TranscriptService] Custom scraper failed, trying youtube-transcript library:', customErr.message || customErr);
  }

  // Fallback: Use standard youtube-transcript library
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
