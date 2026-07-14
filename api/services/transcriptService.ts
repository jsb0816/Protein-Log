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
    
    console.log(`[TranscriptService] Fetching via ScraperAPI proxy...`);
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`ScraperAPI responded with status ${response.status}`);
    }
    return response.text();
  } else {
    const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    console.log(`[TranscriptService] Fetching directly (no ScraperAPI key)...`);
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\\n/g, ' ')
    .trim();
}

export async function fetchTranscriptText(urlOrId: string): Promise<string> {
  const videoId = extractVideoId(urlOrId);
  if (videoId.length !== 11) {
    throw new Error('올바르지 않은 유튜브 비디오 ID 형식입니다.');
  }

  const scraperApiKey = process.env.SCRAPER_API_KEY;
  const errors: string[] = [];

  // ──── Strategy 1: Custom HTML scraping (ScraperAPI proxy or direct) ────
  try {
    console.log(`[TranscriptService] Strategy 1: Custom scraper for video ${videoId}`);
    const html = await fetchWithProxy(`https://www.youtube.com/watch?v=${videoId}`, scraperApiKey);
    console.log(`[TranscriptService] HTML fetched. Length: ${html.length}`);
    
    const jsonStr = extractJsonUsingBraces(html);
    
    if (jsonStr) {
      const playerResponse = JSON.parse(jsonStr);
      
      // Check playability status — if YouTube blocked the request, skip to fallback
      const playabilityStatus = playerResponse.playabilityStatus?.status;
      if (playabilityStatus && playabilityStatus !== 'OK') {
        const reason = playerResponse.playabilityStatus?.reason || 'Unknown';
        console.warn(`[TranscriptService] YouTube playability blocked: ${playabilityStatus} - ${reason}`);
        errors.push(`Custom scraper: YouTube blocked (${playabilityStatus}: ${reason})`);
        // Don't return, fall through to next strategy
      } else {
        const tracklist = playerResponse.captions?.playerCaptionsTracklistRenderer;
        const captionTracks = tracklist?.captionTracks;

        if (Array.isArray(captionTracks) && captionTracks.length > 0) {
          // Find best language track: Korean first, English second, fallback to first
          let selectedTrack = captionTracks.find((t: any) => t.languageCode === 'ko');
          if (!selectedTrack) {
            selectedTrack = captionTracks.find((t: any) => t.languageCode === 'en');
          }
          if (!selectedTrack) {
            selectedTrack = captionTracks[0];
          }

          if (selectedTrack && selectedTrack.baseUrl) {
            console.log(`[TranscriptService] Found caption track: ${selectedTrack.languageCode}`);
            // Fetch XML subtitles
            const xml = await fetchWithProxy(selectedTrack.baseUrl, scraperApiKey);
            const matches = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
            
            if (matches.length > 0) {
              const text = matches
                .map((m: RegExpMatchArray) => decodeHtmlEntities(m[1]))
                .filter((t: string) => t.length > 0)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (text) {
                console.log(`[TranscriptService] ✅ Strategy 1 SUCCESS (${selectedTrack.languageCode}, ${text.length} chars)`);
                return text;
              }
            }
          }
        } else {
          console.warn('[TranscriptService] No caption tracks found in playerResponse');
          errors.push('Custom scraper: No caption tracks in playerResponse');
        }
      }
    } else {
      console.warn('[TranscriptService] ytInitialPlayerResponse not found in HTML');
      errors.push('Custom scraper: ytInitialPlayerResponse marker not found');
    }
  } catch (customErr: any) {
    console.warn('[TranscriptService] Strategy 1 failed:', customErr.message || customErr);
    errors.push(`Custom scraper exception: ${customErr.message}`);
  }

  // ──── Strategy 2: youtube-transcript library ────
  try {
    console.log(`[TranscriptService] Strategy 2: youtube-transcript library for video ${videoId}`);
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcriptItems && transcriptItems.length > 0) {
      const text = transcriptItems
        .map((item: any) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (text) {
        console.log(`[TranscriptService] ✅ Strategy 2 SUCCESS (${text.length} chars)`);
        return text;
      }
    }
    errors.push('youtube-transcript library: empty result');
  } catch (libErr: any) {
    console.warn('[TranscriptService] Strategy 2 failed:', libErr.message || libErr);
    errors.push(`youtube-transcript library: ${libErr.message}`);
  }

  // ──── All strategies exhausted ────
  console.error(`[TranscriptService] ❌ All strategies failed for video ${videoId}. Errors: ${errors.join(' | ')}`);
  throw new Error('Transcript is disabled');
}
