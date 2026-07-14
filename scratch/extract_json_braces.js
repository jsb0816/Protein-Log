const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractJsonUsingBraces(html) {
  const marker = 'var ytInitialPlayerResponse = ';
  const index = html.indexOf(marker);
  if (index === -1) return null;
  
  const startPos = index + marker.length;
  // Find first open brace
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
  const videoId = 'JmBw501SWhQ';
  console.log('Fetching watch page for video:', videoId);
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP status ${response.status}`);
    const html = await response.text();
    
    const jsonStr = extractJsonUsingBraces(html);
    if (!jsonStr) {
      console.log('Failed to extract JSON using brace counting.');
      return;
    }
    
    console.log('Extracted JSON length:', jsonStr.length);
    const playerResponse = JSON.parse(jsonStr);
    console.log('Successfully parsed JSON!');
    
    if (playerResponse.captions) {
      console.log('CAPTIONS property found!');
      const tracklist = playerResponse.captions.playerCaptionsTracklistRenderer;
      if (tracklist) {
        console.log('Tracklist renderer found!');
        if (tracklist.captionTracks) {
          console.log('Caption tracks found! Details:');
          tracklist.captionTracks.forEach((t, idx) => {
            console.log(`[Track ${idx}] lang=${t.languageCode}, name=${t.name.simpleText}, vssId=${t.vssId}`);
          });
        } else {
          console.log('captionTracks is empty or missing in tracklist.');
        }
      } else {
        console.log('playerCaptionsTracklistRenderer is missing inside captions.');
      }
    } else {
      console.log('CAPTIONS property NOT found inside ytInitialPlayerResponse.');
      console.log('Available top level keys:', Object.keys(playerResponse));
      if (playerResponse.playabilityStatus) {
        console.log('PlayabilityStatus status:', playerResponse.playabilityStatus.status);
        console.log('PlayabilityStatus reason:', playerResponse.playabilityStatus.reason);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
