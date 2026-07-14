import { generateContent } from './services/aiService.js';

export default async function handler(req: any, res: any) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, responseJson } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt parameter is required and must be a string.' });
  }

  try {
    const text = await generateContent(prompt, responseJson);
    return res.status(200).json({ text });
  } catch (err: any) {
    console.error('[API generate] error:', err);
    return res.status(500).json({ error: err.message || '서버 내부 오류가 발생했습니다.' });
  }
}
