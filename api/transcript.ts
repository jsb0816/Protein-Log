import { fetchTranscriptText } from '../src/backend/services/transcriptService';

export default async function handler(req: any, res: any) {
  // Handle CORS options preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const queryUrlOrId = req.query.videoId || req.query.url || req.body?.videoId || req.body?.url;

  if (!queryUrlOrId) {
    return res.status(400).json({ error: 'videoId or url is required' });
  }

  try {
    const transcript = await fetchTranscriptText(queryUrlOrId);
    return res.status(200).json({ transcript });
  } catch (err: any) {
    console.error(`[API transcript] Error:`, err);
    
    const errMsg = err.message || '';
    if (
      errMsg.includes('Transcript is disabled') ||
      errMsg.includes('No transcripts are available') ||
      errMsg.includes('unplayable')
    ) {
      return res.status(404).json({
        error: '자막이 제공되지 않는 영상입니다. 직접 컨텍스트나 운동 명칭을 기입해주세요.',
        code: 'TRANSCRIPT_DISABLED'
      });
    }

    return res.status(500).json({
      error: errMsg || '유튜브 서버에서 자막을 가져오는 도중 오류가 발생했습니다.',
      code: 'FETCH_ERROR'
    });
  }
}
