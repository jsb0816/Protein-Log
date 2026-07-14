const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithProxy(url, scraperApiKey) {
  if (scraperApiKey && scraperApiKey.trim()) {
    const proxyUrl = `https://api.scraperapi.com/?api_key=${encodeURIComponent(
      scraperApiKey.trim()
    )}&url=${encodeURIComponent(url)}`;
    
    console.log('Fetching via ScraperAPI:', proxyUrl.substring(0, 60) + '...');
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`ScraperAPI responded with status ${response.status}`);
    }
    return response.text();
  } else {
    console.log('Fetching directly:', url);
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

function extractJsonUsingBraces(html) {
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

async function run() {
  const videoId = 'CyQyZzpEMyc';
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  console.log('SCRAPER_API_KEY length:', scraperApiKey ? scraperApiKey.length : 0);
  
  try {
    const html = await fetchWithProxy(`https://www.youtube.com/watch?v=${videoId}`, scraperApiKey);
    console.log('HTML fetched successfully. Length:', html.length);
    
    const jsonStr = extractJsonUsingBraces(html);
    if (!jsonStr) {
      throw new Error('ytInitialPlayerResponse not found in HTML.');
    }
    
    console.log('JSON extracted successfully. Length:', jsonStr.length);
    const playerResponse = JSON.parse(jsonStr);
    
    console.log('PlayabilityStatus:', playerResponse.playabilityStatus);
    
    const tracklist = playerResponse.captions?.playerCaptionsTracklistRenderer;
    const captionTracks = tracklist?.captionTracks;

    if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
      throw new Error('No caption tracks found in playerResponse.captions.');
    }
    
    console.log('Caption tracks:', captionTracks.map(t => t.languageCode));
  } catch (err) {
    console.error('Custom scraper failed with error:');
    console.error(err);
  }
}

run();
