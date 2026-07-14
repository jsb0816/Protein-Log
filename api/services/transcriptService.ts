import { YoutubeTranscript } from 'youtube-transcript';

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function extractVideoId(urlOrId: string): string {
  const match = urlOrId.match(RE_YOUTUBE);
  if (match) return match[1];
  return urlOrId.trim();
}

/**
 * Fetch a URL through ScraperAPI proxy (for YouTube watch pages that block datacenter IPs).
 */
async function fetchViaScraperProxy(url: string, scraperApiKey: string): Promise<string> {
  const proxyUrl = `https://api.scraperapi.com/?api_key=${encodeURIComponent(
    scraperApiKey.trim()
  )}&url=${encodeURIComponent(url)}`;

  console.log(`[TranscriptService] Fetching via ScraperAPI proxy...`);
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`ScraperAPI responded with status ${response.status}`);
  }
  return response.text();
}

/**
 * Direct fetch (for subtitle XML URLs that don't have IP restrictions).
 */
async function fetchDirect(url: string): Promise<string> {
  console.log(`[TranscriptService] Fetching directly (no proxy)...`);
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

/**
 * Fetch the YouTube watch page HTML — uses ScraperAPI if key is available,
 * otherwise falls back to direct fetch.
 */
async function fetchWatchPage(videoId: string, scraperApiKey?: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  if (scraperApiKey && scraperApiKey.trim()) {
    return fetchViaScraperProxy(url, scraperApiKey);
  }
  return fetchDirect(url);
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

function parseSubtitleXml(xml: string): string {
  const matches = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
  console.log(`[TranscriptService] XML regex matched ${matches.length} subtitle segments`);

  if (matches.length === 0) {
    // Log a snippet of the XML for debugging
    console.warn(`[TranscriptService] XML snippet (first 500 chars): ${xml.substring(0, 500)}`);
    return '';
  }

  return matches
    .map((m: RegExpMatchArray) => decodeHtmlEntities(m[1]))
    .filter((t: string) => t.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchTranscriptText(urlOrId: string): Promise<string> {
  const videoId = extractVideoId(urlOrId);
  if (videoId.length !== 11) {
    throw new Error('올바르지 않은 유튜브 비디오 ID 형식입니다.');
  }

  const scraperApiKey = process.env.SCRAPER_API_KEY;
  const errors: string[] = [];

  // ──── Strategy 1: Custom HTML scraping → extract caption track → fetch subtitle XML ────
  try {
    console.log(`[TranscriptService] Strategy 1: Custom scraper for video ${videoId}`);
    const html = await fetchWatchPage(videoId, scraperApiKey);
    console.log(`[TranscriptService] HTML fetched. Length: ${html.length}`);

    const jsonStr = extractJsonUsingBraces(html);

    if (!jsonStr) {
      console.warn('[TranscriptService] ytInitialPlayerResponse marker not found in HTML');
      errors.push('Custom scraper: ytInitialPlayerResponse marker not found');
    } else {
      const playerResponse = JSON.parse(jsonStr);

      // Check playability — if YouTube blocked the request, skip to fallback
      const playabilityStatus = playerResponse.playabilityStatus?.status;
      if (playabilityStatus && playabilityStatus !== 'OK') {
        const reason = playerResponse.playabilityStatus?.reason || 'Unknown';
        console.warn(`[TranscriptService] YouTube playability blocked: ${playabilityStatus} - ${reason}`);
        errors.push(`Custom scraper: YouTube blocked (${playabilityStatus}: ${reason})`);
      } else {
        const tracklist = playerResponse.captions?.playerCaptionsTracklistRenderer;
        const captionTracks = tracklist?.captionTracks;

        if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
          console.warn('[TranscriptService] No caption tracks found in playerResponse');
          errors.push('Custom scraper: No caption tracks in playerResponse');
        } else {
          // Find best language track: Korean → English → first available
          let selectedTrack = captionTracks.find((t: any) => t.languageCode === 'ko');
          if (!selectedTrack) {
            selectedTrack = captionTracks.find((t: any) => t.languageCode === 'en');
          }
          if (!selectedTrack) {
            selectedTrack = captionTracks[0];
          }

          if (selectedTrack?.baseUrl) {
            console.log(`[TranscriptService] Found caption track: ${selectedTrack.languageCode}`);

            // ★ KEY FIX: Fetch subtitle XML DIRECTLY — timedtext API doesn't block datacenter IPs.
            // ScraperAPI can corrupt XML by wrapping it in HTML or altering content.
            let xml = '';
            try {
              xml = await fetchDirect(selectedTrack.baseUrl);
            } catch (directErr: any) {
              console.warn(`[TranscriptService] Direct XML fetch failed (${directErr.message}), trying via proxy...`);
              // Only use proxy as last resort for XML
              if (scraperApiKey) {
                xml = await fetchViaScraperProxy(selectedTrack.baseUrl, scraperApiKey);
              }
            }

            if (xml) {
              const text = parseSubtitleXml(xml);
              if (text) {
                console.log(`[TranscriptService] ✅ Strategy 1 SUCCESS (${selectedTrack.languageCode}, ${text.length} chars)`);
                return text;
              } else {
                console.warn('[TranscriptService] XML was fetched but no subtitle text could be parsed');
                errors.push('Custom scraper: XML fetched but text extraction returned empty');
              }
            } else {
              errors.push('Custom scraper: XML fetch returned empty');
            }
          } else {
            errors.push('Custom scraper: selectedTrack has no baseUrl');
          }
        }
      }
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
