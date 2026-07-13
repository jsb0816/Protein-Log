import type { ApiConfig, WorkoutRoutine, RoutineExercise } from '../context/AppContext';
import { buildYoutubeContextBlock, fetchYoutubeMetadata } from './youtube';
import {
  extractExercisesFromText,
  normalizeParsedExercise,
  toRoutineExercise,
  type ParsedExerciseRaw,
} from './exerciseNaming';

export interface RecommendedMeal {
  mealTime: string; // e.g. "아침", "점심", "저녁", "간식"
  name: string;
  amount: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  extra?: string;
}

export interface DietProposal {
  title: string;
  meals: RecommendedMeal[];
}

export interface DietRecommendationResult {
  proposals: DietProposal[];
  comments: string[];
  nagging: string;
}

// Helper to make API calls to Gemini
async function callGemini(prompt: string, apiKey: string, responseJson = false): Promise<string> {
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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

// Helper to make API calls to OpenAI
async function callOpenAI(prompt: string, apiKey: string, responseJson = false, temperature = 0.7): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const body: any = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature,
  };

  if (responseJson) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
}

// Helper to call Vercel Serverless Function Proxy
async function callVercelProxy(prompt: string, responseJson = false): Promise<string> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, responseJson }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `서버 프록시 에러: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

// Common runner to route between Gemini and OpenAI
async function runAiPrompt(
  prompt: string,
  config: ApiConfig,
  responseJson = false,
  temperature = 0.7
): Promise<string> {
  if (!config.key || !config.key.trim()) {
    // If no client API key, route securely through the Vercel proxy!
    return callVercelProxy(prompt, responseJson);
  }

  if (config.provider === 'openai') {
    return callOpenAI(prompt, config.key, responseJson, temperature);
  } else {
    return callGemini(prompt, config.key, responseJson);
  }
}

// --- Specific AI Functions ---

interface RawRoutineResponse {
  name: string;
  exercises: Array<Partial<ParsedExerciseRaw> & { name?: string }>;
}

const YOUTUBE_ROUTINE_PROMPT = (contextBlock: string) => `
당신은 피트니스 트레이닝 및 운동 루틴 설계 전문가입니다.
제공된 유튜브 영상 정보(제목, 채널, 자막, 설명)를 분석하여 사용자가 따라할 수 있는 운동 루틴을 JSON으로 추출하세요.

${contextBlock}

## 핵심 규칙 (반드시 준수)
1. 영상에 실제로 등장하는 운동만 포함하세요. 영상에 없는 운동을 임의로 추가하지 마세요.
2. 각 운동은 **장비(equipment)**, **각도(angle)**, **기본 동작명(baseExercise)** 을 반드시 구분하세요.
3. "벤치 프레스"처럼 모호한 이름만 쓰지 마세요. 반드시 아래 조합으로 구체화하세요:
   - 플랫 바벨 벤치 프레스 / 인클라인 덤벨 벤치 프레스 / 디클라인 바벨 벤치 프레스
   - 스미스 머신 플랫 벤치 프레스 / 스미스 머신 인클라인 벤치 프레스
   - 케이블 크로스오버, 머신 체스트 프레스, 맨몸 푸시업 등
4. equipment 허용값: barbell | dumbbell | cable | machine | smith | bodyweight | kettlebell | band
5. angle 허용값 (해당 시): flat | incline | decline | seated | standing | null
6. 영상에서 장비/각도가 명확하지 않으면 confidence를 "low"로 설정하고 notes에 [추정]과 근거를 적으세요.
7. 영상에 세트/횟수가 언급되면 그대로 반영하고, 없을 때만 일반적인 값(3~4세트, 8~12회)을 사용하세요.
8. 영상 순서대로 exercises 배열을 정렬하세요.

## 잘못된 예 vs 올바른 예
- ❌ "벤치 프레스" → ✅ equipment: barbell, angle: flat, baseExercise: "벤치 프레스"
- ❌ "덤벨 프레스" → ✅ equipment: dumbbell, angle: incline, baseExercise: "벤치 프레스"
- ❌ "가슴 운동" → ✅ equipment: cable, baseExercise: "케이블 크로스오버"

반드시 아래 JSON 스키마와 완전히 동일한 형식의 오브젝트 하나만 반환하세요.
마크다운 펜스(\`\`\`json)나 부연 설명 없이 순수 JSON만 출력하세요.

{
  "name": "영상 기반 루틴 이름",
  "exercises": [
    {
      "baseExercise": "벤치 프레스",
      "baseExerciseEn": "Bench Press",
      "equipment": "barbell",
      "angle": "flat",
      "grip": null,
      "machineVariant": null,
      "sets": 4,
      "reps": 8,
      "notes": "가슴 전체 자극, 어깨뼈 고정",
      "confidence": "high"
    }
  ]
}
`;

function postProcessRoutine(parsed: RawRoutineResponse): WorkoutRoutine {
  const exercises: RoutineExercise[] = parsed.exercises.map((raw) => {
    const normalized = normalizeParsedExercise(raw);
    return toRoutineExercise(normalized);
  });

  return {
    name: parsed.name?.trim() || '유튜브 영상 기반 맞춤형 루틴',
    exercises,
  };
}

/**
 * Parses YouTube video details into a structured routine
 */
export async function parseYoutubeRoutine(
  url: string,
  extraContext: string,
  config: ApiConfig
): Promise<WorkoutRoutine> {
  const metadata = await fetchYoutubeMetadata(url);
  const contextBlock = buildYoutubeContextBlock(url, metadata, extraContext);
  const hasRichContext =
    Boolean(metadata?.title) ||
    extraContext.trim().length > 30;

  if (!hasRichContext) {
    return getMockRoutine(url, extraContext, contextBlock);
  }

  const prompt = YOUTUBE_ROUTINE_PROMPT(contextBlock);

  try {
    const rawResponse = await runAiPrompt(prompt, config, true, 0.2);
    const cleanJsonStr = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed: RawRoutineResponse = JSON.parse(cleanJsonStr);
    
    if (!parsed.name || !Array.isArray(parsed.exercises) || parsed.exercises.length === 0) {
      throw new Error('올바르지 않은 응답 형식');
    }
    
    return postProcessRoutine(parsed);
  } catch (err: any) {
    console.error('AI YouTube parsing failed, using fallback mock:', err);
    return getMockRoutine(url, extraContext, contextBlock);
  }
}

/**
 * Recommends diet meals based on available ingredients and targets
 */
export async function recommendDiet(
  ingredients: string[],
  targetCalories: number,
  targetProtein: number,
  mode: string,
  config: ApiConfig
): Promise<DietRecommendationResult> {
  if (!config.key || !config.key.trim()) {
    const mockJson = getMockDietRecommendation(ingredients, targetCalories, targetProtein, mode);
    return JSON.parse(mockJson);
  }

  const prompt = `
당신은 피트니스 식단 설계사이자 전문 스포츠 영양사입니다. 
사용자의 보유 냉장고 재료와 칼로리 및 단백질 하루 목표 수치를 바탕으로 한 끼 혹은 하루 식단 구성을 추천해주세요.

- 보유 재료: ${ingredients.join(', ') || '재료 없음 (물만 있음)'}
- 하루 목표 칼로리: ${targetCalories} kcal
- 하루 목표 단백질: ${targetProtein} g
- 사용자의 현재 목표 모드: ${mode === 'cut' ? '컷팅 (다이어트)' : mode === 'bulk' ? '벌크업' : mode === 'leanmass' ? '린매스업' : '유지어터'}

지침:
1. 보유하고 있는 재료들을 최우선적으로 활용하여 식단 메뉴를 구성하세요. 
2. 총 2가지의 완성도 높은 일일 식단 제안서("proposals")를 작성하고, 그 식단에 배치된 각 식품들의 영양 성분 수치(탄단지 및 칼로리)를 정확히 명시해주세요.
3. 운동 수행 능력을 보강해 줄 수 있는 미량 영양소나 물 섭취 등의 지침들("comments")을 3가지 내외 리스트로 제공해주세요.
4. "nagging" 필드에는 '훈수충 관장'으로서의 츤데레 잔소리 멘트(식사량 훈수, 보유 재료 타박 등)를 작성해주세요.

반드시 아래 JSON 스키마를 엄격히 준수하는 단 하나의 JSON 객체 형태로만 응답하세요. 설명글이나 마크다운 백틱 펜스는 전혀 포함하지 마세요.

JSON schema:
{
  "proposals": [
    {
      "title": "제안서 1: 닭가슴살&계란 파워 벌크업 정식",
      "meals": [
        {
          "mealTime": "아침",
          "name": "닭가슴살 & 계란 볶음밥",
          "amount": "닭가슴살 100g, 계란 3개, 백미밥 400g",
          "calories": 950,
          "carbs": 115,
          "protein": 60,
          "fat": 35,
          "extra": "올리브유 1.5큰술 (지방 및 칼로리 추가)"
        }
      ]
    }
  ],
  "comments": [
    "충분한 수분 섭취: 벌크업 중에는 근육 합성과 소화를 위해 충분한 수분 섭취가 필수적입니다."
  ],
  "nagging": "야, 인마! 냉장고에 그거밖에 없으면 벌크업은 하늘에서 떨어지냐?! 내가 짜준 대로 똑바로 쳐먹어라!"
}
`;

  try {
    const rawResponse = await runAiPrompt(prompt, config, true);
    const cleanJsonStr = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed: DietRecommendationResult = JSON.parse(cleanJsonStr);
    
    if (!Array.isArray(parsed.proposals) || !Array.isArray(parsed.comments) || !parsed.nagging) {
      throw new Error('응답 객체 스키마가 불일치합니다.');
    }
    
    return parsed;
  } catch (err: any) {
    console.error('AI Diet recommendation failed, parsing fallback mock:', err);
    return JSON.parse(getMockDietRecommendation(ingredients, targetCalories, targetProtein, mode));
  }
}

/**
 * Returns backseat coach feedback based on status
 */
export async function getBackseatCoachFeedback(
  profile: any,
  todayCal: number,
  todayPro: number,
  workoutCompleted: boolean,
  config: ApiConfig
): Promise<string> {
  if (!config.key || !config.key.trim()) {
    return getLocalCoachFeedback(profile, todayCal, todayPro, workoutCompleted);
  }

  const muscle = profile.inbody?.muscleMass || '미등록';
  const fat = profile.inbody?.bodyFat || '미등록';
  const modeName = {
    maintain: '유지어터',
    leanmass: '린매스업',
    bulk: '벌크업',
    cut: '컷팅 (다이어트)'
  }[profile.mode as 'maintain'|'leanmass'|'bulk'|'cut'] || '유지어터';

  const prompt = `
당신은 헬스장에 상주하는, 잔소리가 심하지만 츤데레 같은 베테랑 트레이너 '훈수충'입니다.
사용자의 신체 상태, 목표, 오늘 식단 및 운동 완료 상태를 보고 잔소리 및 코칭 한마디를 작성해주세요.

[사용자 스펙]
- 성별: ${profile.gender === 'male' ? '남성' : '여성'}, 연령: ${profile.age}세, 키: ${profile.height}cm, 체중: ${profile.weight}kg
- 인바디 골격근량: ${muscle} kg, 체지방률: ${fat} %
- 현재 설정 모드: ${modeName}

[오늘의 현황]
- 오늘 섭취 칼로리: ${todayCal} kcal (목표: ${profile.targetCalories} kcal)
- 오늘 섭취 단백질: ${todayPro} g (목표: ${profile.targetProtein} g)
- 오늘 운동 여부: ${workoutCompleted ? '완료' : '아직 안함'}

[규칙]
- 츤데레 체육관 관장 말투로 작성하세요. 반말과 존댓말을 섞어도 좋습니다.
- 문장은 2~3줄 내외로 아주 임팩트 있게 작성하세요.
- 식단 섭취 오차(칼로리 초과/부족, 단백질 미달) 혹은 인바디 문제점(예: 컷팅러인데 오늘 탄수화물 과다, 벌크업인데 칼로리 태부족 등)을 날카롭게 꼬집으세요.
- 다른 부연설명 없이 오직 훈수 텍스트만 출력하세요.
`;

  try {
    return await runAiPrompt(prompt, config, false);
  } catch (err: any) {
    console.error('AI Coach Feedback failed:', err);
    return getLocalCoachFeedback(profile, todayCal, todayPro, workoutCompleted);
  }
}

// --- MOCK FALLBACKS ---

function getMockRoutine(url: string, extraContext: string, contextBlock?: string): WorkoutRoutine {
  const text = (contextBlock || url + ' ' + extraContext).toLowerCase();
  
  let name = '유튜브 영상 기반 맞춤형 루틴';
  let exercises: RoutineExercise[] = [];

  const extracted = extractExercisesFromText(text);
  if (extracted.length > 0) {
    exercises = extracted.map((raw) => toRoutineExercise(raw));
    if (text.includes('chest') || text.includes('가슴') || text.includes('벤치')) {
      name = '유튜브 가슴 집중 타겟 루틴';
    } else if (text.includes('back') || text.includes('등') || text.includes('풀업')) {
      name = '유튜브 등 신의 자극 루틴';
    } else if (text.includes('leg') || text.includes('하체') || text.includes('스쿼트')) {
      name = '유튜브 하체 불타는 루틴';
    }
    return { name, exercises };
  }

  if (text.includes('chest') || text.includes('가슴') || text.includes('벤치')) {
    name = '유튜브 가슴 집중 타겟 루틴';
    exercises = [
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '벤치 프레스', baseExerciseEn: 'Bench Press', equipment: 'barbell', angle: 'flat', sets: 4, reps: 8, notes: '가슴 전체 자극' })),
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '벤치 프레스', baseExerciseEn: 'Bench Press', equipment: 'dumbbell', angle: 'incline', sets: 4, reps: 10, notes: '윗가슴 타겟' })),
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '덤벨 플라이', baseExerciseEn: 'Dumbbell Fly', equipment: 'dumbbell', sets: 3, reps: 12, notes: '가슴 수축 극대화' })),
    ];
  } else if (text.includes('back') || text.includes('등') || text.includes('풀업')) {
    name = '유튜브 등 신의 자극 루틴';
    exercises = [
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '풀업', baseExerciseEn: 'Pull Up', equipment: 'bodyweight', sets: 4, reps: 8, notes: '견갑 하강 후 등 힘으로 수축' })),
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '원암 덤벨 로우', baseExerciseEn: 'One Arm Dumbbell Row', equipment: 'dumbbell', sets: 4, reps: 10, notes: '광배근 하부 타겟' })),
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '랫 풀다운', baseExerciseEn: 'Lat Pulldown', equipment: 'cable', sets: 3, reps: 12, notes: '넓은 등 전체 자극' })),
    ];
  } else if (text.includes('leg') || text.includes('하체') || text.includes('스쿼트')) {
    name = '유튜브 하체 불타는 10분 루틴';
    exercises = [
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '백 스쿼트', baseExerciseEn: 'Back Squat', equipment: 'barbell', sets: 4, reps: 12, notes: '고관절 접어 앉기' })),
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '레그 프레스', baseExerciseEn: 'Leg Press', equipment: 'machine', sets: 4, reps: 15, notes: '대퇴사두근 집중' })),
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '런지', baseExerciseEn: 'Lunge', equipment: 'dumbbell', sets: 3, reps: 12, notes: '앞발 뒤꿈치에 체중' })),
    ];
  } else {
    name = '유튜브 올인원 데일리 루틴';
    exercises = [
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '데드리프트', baseExerciseEn: 'Deadlift', equipment: 'barbell', sets: 4, reps: 8, notes: '복압 유지' })),
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '숄더 프레스', baseExerciseEn: 'Shoulder Press', equipment: 'dumbbell', angle: 'seated', sets: 4, reps: 10, notes: '어깨 으쓱 방지' })),
      toRoutineExercise(normalizeParsedExercise({ baseExercise: '케이블 페이스 풀', baseExerciseEn: 'Cable Face Pull', equipment: 'cable', sets: 3, reps: 15, notes: '후면 어깨 타겟' })),
    ];
  }

  return { name, exercises };
}

function getMockDietRecommendation(
  _ingredients: string[],
  _targetCalories: number,
  _targetProtein: number,
  _mode: string
): string {
  const mockObj = {
    proposals: [
      {
        title: "제안서 1: 닭가슴살 & 계란 파워 벌크업 정식",
        meals: [
          {
            mealTime: "아침",
            name: "닭가슴살 & 계란 볶음밥",
            amount: "닭가슴살 100g, 계란 3개, 백미밥 400g, 김치 적당량",
            calories: 950,
            carbs: 115,
            protein: 60,
            fat: 35,
            extra: "올리브유 1.5큰술 (조리용, 지방 및 칼로리 추가), 다진 야채 50g"
          },
          {
            mealTime: "점심",
            name: "닭가슴살 스테이크 & 고봉밥",
            amount: "닭가슴살 150g, 백미밥 400g, 김치 적당량",
            calories: 850,
            carbs: 115,
            protein: 57,
            fat: 15,
            extra: "브로콜리, 파프리카 등 채소 150g, 올리브유 1큰술"
          },
          {
            mealTime: "간식",
            name: "계란 스크램블 & 탄수화물 폭탄 밥",
            amount: "계란 4개, 백미밥 400g, 김치 적당량",
            calories: 800,
            carbs: 115,
            protein: 35,
            fat: 30,
            extra: "아몬드 한 줌(30g) 또는 땅콩버터 2큰술"
          },
          {
            mealTime: "저녁",
            name: "닭가슴살 찢어 만든 덮밥",
            amount: "닭가슴살 180g, 백미밥 400g, 김치 적당량",
            calories: 850,
            carbs: 115,
            protein: 66,
            fat: 15,
            extra: "참기름 1큰술, 시금치/콩나물 100g"
          }
        ]
      },
      {
        title: "제안서 2: 질리지 않는 벌크업 퓨전 식단",
        meals: [
          {
            mealTime: "아침",
            name: "김치 닭가슴살 볶음밥",
            amount: "닭가슴살 100g, 계란 2개, 백미밥 400g, 김치 150g",
            calories: 900,
            carbs: 115,
            protein: 55,
            fat: 30,
            extra: "참기름 1큰술, 다진 마늘 약간, 올리브유 1.5큰술"
          },
          {
            mealTime: "점심",
            name: "닭가슴살 & 계란 덮밥 (일식 스타일)",
            amount: "닭가슴살 150g, 계란 2개, 백미밥 400g",
            calories: 900,
            carbs: 115,
            protein: 70,
            fat: 25,
            extra: "양파, 버섯 등 채소 100g, 간장 기반 소스"
          },
          {
            mealTime: "간식",
            name: "계란말이 & 밥",
            amount: "계란 5개, 백미밥 400g",
            calories: 950,
            carbs: 115,
            protein: 45,
            fat: 40,
            extra: "다진 당근/쪽파 추가, 올리브유 1큰술"
          },
          {
            mealTime: "저녁",
            name: "매콤 닭가슴살 김치찜 & 밥",
            amount: "닭가슴살 180g, 김치 200g, 백미밥 400g",
            calories: 850,
            carbs: 120,
            protein: 65,
            fat: 15,
            extra: "두부 반 모(200g), 올리브유 1큰술"
          }
        ]
      }
    ],
    comments: [
      "수분 섭취: 벌크업 중에는 근육 합성과 소화를 위해 충분한 수분 섭취가 필수적입니다. 하루 3-4리터 이상의 물을 꾸준히 마셔주세요.",
      "영양제 고려: 비타민, 미네랄 보충제(멀티비타민)는 식단에서 부족할 수 있는 미량 영양소를 채워주는 데 도움이 됩니다.",
      "식사 시간: 총 칼로리 섭취량이 많으므로, 4끼 외에 필요하다면 운동 전후로 추가 탄수화물(바나나, 고구마)이나 단백질 섭취를 고려하세요."
    ],
    nagging: "야, 인마! 냉장고에 그거밖에 없으면 벌크업은 하늘에서 떨어지냐?! 내가 머리 싸매고 간신히 짜줬으니까 감사하게 생각하고 꾸역꾸역 다 집어넣어라. 특히 그 김치만 보고 있지 말고, 추천 채소 좀 사서 넣어! 물통은 그냥 디자인 소품이 아니라고!"
  };
  return JSON.stringify(mockObj);
}

export function getLocalCoachFeedback(
  profile: any,
  todayCal: number,
  todayPro: number,
  workoutCompleted: boolean
): string {
  const { mode, inbody, weight } = profile;
  
  const calDiff = todayCal - profile.targetCalories;
  const proDiff = todayPro - profile.targetProtein;
  
  let feedback = '';

  if (!workoutCompleted) {
    feedback = '오늘 아직 운동 완료 버튼 안 눌렀지? 쇠질은 안 하고 스마트폰만 보고 있는 거냐? 얼른 몸 움직여라!';
    return feedback;
  }

  const isMuscleLow = inbody?.muscleMass && (
    (profile.gender === 'male' && inbody.muscleMass / weight < 0.32) ||
    (profile.gender === 'female' && inbody.muscleMass / weight < 0.25)
  );

  const isMuscleHigh = inbody?.muscleMass && (
    (profile.gender === 'male' && inbody.muscleMass / weight >= 0.38) ||
    (profile.gender === 'female' && inbody.muscleMass / weight >= 0.30)
  );

  if (mode === 'cut') {
    if (calDiff > 150) {
      feedback = '컷팅한다면서 칼로리를 초과해서 드시네요! 지방이 타겠습니까? 내일은 당장 유산소 20분 늘리세요.';
    } else if (proDiff < -15) {
      feedback = '칼로리는 잘 맞췄는데 단백질이 너무 모자랍니다. 근손실 제대로 오겠네! 냉장고 열어서 닭가슴살 1팩 더 드세요.';
    } else {
      feedback = '컷팅 식단 아주 바람직합니다. 체지방 활활 타는 소리 들리네요. 이대로 유산소 인터벌만 확실히 조집시다!';
    }
  } else if (mode === 'bulk') {
    if (calDiff < -300) {
      feedback = '벌크업 맞습니까? 섭취 칼로리가 너무 부족합니다. 근육이 클 밥을 안 주는데 어떻게 벌크가 됩니까! 더 드세요.';
    } else if (proDiff < -10) {
      feedback = '중량은 많이 치는데 단백질 섭취가 부실하군요. 아미노산 수치 다 깎입니다. 얼른 쉐이크 한 잔 타 마시세요.';
    } else {
      if (inbody?.bodyFat && inbody.bodyFat < 8) {
        feedback = '체지방이 아주 낮아서 벌크업하기 완벽한 몸입니다. 소화만 잘 시키면서 최대 중량 스쿼트 가봅시다!';
      } else {
        feedback = '벌크업 페이스 굿! 칼로리랑 단백질 든든하게 잘 채우고 있네요. 내일 점진적 과부하 무조건 성공합시다.';
      }
    }
  } else if (mode === 'leanmass') {
    if (calDiff > 350) {
      feedback = '린매스업 하다가 살매스업 되겠어요! 칼로 섭취가 너무 과합니다. 밥 한 숟갈 덜고 야채 채우세요.';
    } else if (proDiff < -10) {
      feedback = '린매스업의 핵심은 넉넉한 단백질! 골격근량이 비명을 지르고 있습니다. 단백질을 20g만 더 채워주세요.';
    } else {
      feedback = isMuscleHigh 
        ? '근육량이 아주 훌륭해서 린매스업 효율이 훌륭하군요. 단백질 섭취 고점을 유지하세요!' 
        : '린매스업의 정석대로 가고 있습니다. 조급해하지 말고 점진적 과부하에 신경 씁시다.';
    }
  } else {
    if (Math.abs(calDiff) > 250) {
      feedback = calDiff > 0 
        ? '유지가 아니라 벌크업이 되고 있습니다! 먹는 양 조절 안 하면 금방 옆구리 살 늘어납니다.' 
        : '에너지가 너무 부족해요. 유지어터도 기초대사량보단 훨씬 더 먹어야 건강을 유지합니다.';
    } else if (proDiff < -15) {
      feedback = '유지어터도 단백질 섭취는 기본입니다. 몸무게의 1.2배는 맞춰 먹어야 근육이 방어됩니다!';
    } else {
      feedback = '아주 안정적인 유지 상태입니다. 식단 유지 잘 하고 계시니 주 3회 근력만 꾸준히 해주면 완벽합니다.';
    }
  }

  if (isMuscleLow) {
    feedback += ' 골격근량이 다소 부족하니 다관절 복합 프리웨이트 비중을 늘리세요!';
  }

  return feedback;
}
