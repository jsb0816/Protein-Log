import { YoutubeTranscript } from 'youtube-transcript';

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function extractVideoId(urlOrId: string): string {
  const match = urlOrId.match(RE_YOUTUBE);
  if (match) return match[1];
  return urlOrId.trim();
}

/**
 * Fetch a URL through ScraperAPI proxy.
 * For non-HTML content (like XML), we disable JavaScript rendering.
 */
async function fetchViaScraperProxy(url: string, scraperApiKey: string, options?: { render?: boolean }): Promise<string> {
  const render = options?.render ?? false;
  const proxyUrl = `https://api.scraperapi.com/?api_key=${encodeURIComponent(
    scraperApiKey.trim()
  )}&url=${encodeURIComponent(url)}&render=${render}`;

  console.log(`[TranscriptService] Fetching via ScraperAPI proxy (render=${render})...`);
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`ScraperAPI responded with status ${response.status}`);
  }
  return response.text();
}

/**
 * Direct fetch without proxy.
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
 * Fetch the YouTube watch page HTML.
 * Uses ScraperAPI (with render=true for full JS rendering) if key is available.
 */
async function fetchWatchPage(videoId: string, scraperApiKey?: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  if (scraperApiKey && scraperApiKey.trim()) {
    return fetchViaScraperProxy(url, scraperApiKey, { render: false });
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
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\\n/g, ' ')
    .trim();
}

/**
 * Parse subtitle text from YouTube's timedtext XML.
 * Handles both standard XML and potentially modified responses.
 */
function parseSubtitleXml(xml: string): string {
  // Pattern 1: Standard YouTube XML — <text start="..." dur="...">content</text>
  let matches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  console.log(`[TranscriptService] XML parse pattern 1 matched ${matches.length} segments`);

  // Pattern 2: Try with single-line content if multiline pattern fails
  if (matches.length === 0) {
    matches = [...xml.matchAll(/<text[^>]*>([^<]+)<\/text>/g)];
    console.log(`[TranscriptService] XML parse pattern 2 matched ${matches.length} segments`);
  }

  if (matches.length === 0) {
    console.warn(`[TranscriptService] No segments found. XML length: ${xml.length}, first 500 chars: ${xml.substring(0, 500)}`);
    return '';
  }

  return matches
    .map((m: RegExpMatchArray) => decodeHtmlEntities(m[1]))
    .filter((t: string) => t.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch subtitle XML for a given caption track URL.
 * The URL is IP-signed, so it must be fetched from the same IP that fetched the watch page.
 * 
 * Strategy:
 *   1. If we used ScraperAPI for the watch page → also use ScraperAPI for XML (same IP pool)
 *   2. If direct fetch was used → fetch XML directly
 *   3. Fallback: try the other method if the first fails
 */
async function fetchSubtitleXml(baseUrl: string, usedScraperForWatchPage: boolean, scraperApiKey?: string): Promise<string> {
  const methods: Array<() => Promise<string>> = [];

  if (usedScraperForWatchPage && scraperApiKey) {
    // Primary: ScraperAPI (same IP pool as watch page → signature matches)
    methods.push(() => fetchViaScraperProxy(baseUrl, scraperApiKey, { render: false }));
    // Fallback: direct (in case IP-locking isn't strict)
    methods.push(() => fetchDirect(baseUrl));
  } else {
    // Primary: direct
    methods.push(() => fetchDirect(baseUrl));
    // Fallback: ScraperAPI if available
    if (scraperApiKey) {
      methods.push(() => fetchViaScraperProxy(baseUrl, scraperApiKey, { render: false }));
    }
  }

  for (let i = 0; i < methods.length; i++) {
    try {
      const xml = await methods[i]();
      if (xml && xml.trim().length > 0) {
        console.log(`[TranscriptService] Subtitle XML fetched (method ${i + 1}), length: ${xml.length}`);
        return xml;
      } else {
        console.warn(`[TranscriptService] Subtitle XML method ${i + 1} returned empty`);
      }
    } catch (err: any) {
      console.warn(`[TranscriptService] Subtitle XML method ${i + 1} failed: ${err.message}`);
    }
  }

  return '';
}

export async function fetchTranscriptText(urlOrId: string): Promise<string> {
  const videoId = extractVideoId(urlOrId);
  if (videoId.length !== 11) {
    throw new Error('올바르지 않은 유튜브 비디오 ID 형식입니다.');
  }

  const scraperApiKey = process.env.SCRAPER_API_KEY;
  const usedScraperForWatchPage = !!(scraperApiKey && scraperApiKey.trim());
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

            // ★ KEY: Fetch XML using same IP pool as the watch page (signature is IP-bound)
            const xml = await fetchSubtitleXml(selectedTrack.baseUrl, usedScraperForWatchPage, scraperApiKey);

            if (xml) {
              const text = parseSubtitleXml(xml);
              if (text) {
                console.log(`[TranscriptService] ✅ Strategy 1 SUCCESS (${selectedTrack.languageCode}, ${text.length} chars)`);
                return text;
              } else {
                errors.push('Custom scraper: XML fetched but subtitle text parsing returned empty');
              }
            } else {
              errors.push('Custom scraper: All XML fetch methods returned empty');
            }
          } else {
            errors.push('Custom scraper: selectedTrack has no baseUrl');
          }
        }
      }
    }
  } catch (customErr: any) {
    console.warn('[TranscriptService] Strategy 1 exception:', customErr.message || customErr);
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
