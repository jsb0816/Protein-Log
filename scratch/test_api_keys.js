import { fetchTranscriptText } from '../api/services/transcriptService.ts';
import { generateContent } from '../api/services/aiService.ts';

async function run() {
  console.log('--- Testing Backend Services with Env Keys ---');
  console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
  console.log('SCRAPER_API_KEY length:', process.env.SCRAPER_API_KEY ? process.env.SCRAPER_API_KEY.length : 0);

  const videoId = 'CyQyZzpEMyc';
  
  try {
    console.log(`\n1. Testing fetchTranscriptText for Video: ${videoId}...`);
    const transcript = await fetchTranscriptText(videoId);
    console.log('Transcript Success! Length:', transcript.length);
    console.log('Snippet:', transcript.substring(0, 150) + '...');
    
    console.log(`\n2. Testing generateContent with Gemini...`);
    const prompt = `유튜브 자막을 요약하고 다음 운동 루틴을 만드세요: ${transcript.substring(0, 500)}`;
    const result = await generateContent(prompt, false);
    console.log('Gemini Success!');
    console.log('Result:', result.substring(0, 300) + '...');
  } catch (err) {
    console.error('\n--- ERROR OCCURRED ---');
    console.error(err);
  }
}

run();
