import { generateContent } from './services/aiService.js';

export default async function handler(req: any, res: any) {
  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, responseJson } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt parameter is required and must be a string.' });
  }

  console.log(`[API generate] Incoming request. Prompt length: ${prompt.length}, responseJson: ${!!responseJson}`);
  console.log(`[API generate] GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`);

  try {
    const text = await generateContent(prompt, responseJson);
    console.log(`[API generate] Success! Response length: ${text.length}`);
    return res.status(200).json({ text });
  } catch (err: any) {
    console.error('[API generate] error:', err.message || err);
    return res.status(500).json({ error: err.message || '서버 내부 오류가 발생했습니다.' });
  }
}
