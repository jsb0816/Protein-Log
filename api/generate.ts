export default async function handler(req: any, res: any) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, responseJson } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return res.status(500).json({ 
      error: '서버에 GEMINI_API_KEY 환경 변수가 설정되어 있지 않습니다. Vercel 프로젝트 설정에서 환경 변수를 추가하세요.' 
    });
  }

  // Use the requested gemini-3.1-flash-lite model
  const model = 'gemini-3.1-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  if (responseJson) {
    body.generationConfig = {
      responseMimeType: 'application/json'
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: errorData.error?.message || `Gemini API 호출 중 오류가 발생했습니다 (코드 ${response.status}).` 
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: 'Gemini API로부터 빈 응답이 반환되었습니다.' });
    }

    return res.status(200).json({ text });
  } catch (err: any) {
    console.error('Serverless function error:', err);
    return res.status(500).json({ error: err.message || '서버 내부 오류가 발생했습니다.' });
  }
}
