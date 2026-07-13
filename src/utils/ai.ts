import type { ApiConfig, WorkoutRoutine, RoutineExercise } from '../context/AppContext';

// Helper to make API calls to Gemini
async function callGemini(prompt: string, apiKey: string, responseJson = false): Promise<string> {
  const model = 'gemini-2.5-flash';
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
async function callOpenAI(prompt: string, apiKey: string, responseJson = false): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const body: any = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
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

// Common runner to route between Gemini and OpenAI
async function runAiPrompt(prompt: string, config: ApiConfig, responseJson = false): Promise<string> {
  if (!config.key || !config.key.trim()) {
    throw new Error('API Key가 입력되지 않았습니다. 설정 화면에서 API Key를 입력하세요.');
  }

  if (config.provider === 'openai') {
    return callOpenAI(prompt, config.key, responseJson);
  } else {
    return callGemini(prompt, config.key, responseJson);
  }
}

// --- Specific AI Functions ---

/**
 * Parses YouTube video details into a structured routine
 */
export async function parseYoutubeRoutine(
  url: string,
  extraContext: string,
  config: ApiConfig
): Promise<WorkoutRoutine> {
  if (!config.key || !config.key.trim()) {
    // Return mock data for testing if key is absent
    return getMockRoutine(url, extraContext);
  }

  const prompt = `
당신은 피트니스 트레이닝 및 운동 루틴 설계 전문가입니다.
제공된 유튜브 링크 및 관련 텍스트 정보(영상 제목, 자막, 혹은 설명 등)를 분석하여 사용자가 따라할 수 있는 운동 루틴을 JSON 데이터로 추출해 주세요.

[유튜브 URL]
${url}

[사용자가 입력한 추가 정보 및 자막 컨텍스트]
${extraContext || '없음'}

반드시 아래 규격과 완전히 동일한 JSON 오브젝트 하나만을 반환해야 합니다. 다른 텍스트나 부연 설명은 전혀 쓰지 마세요.
반드시 응답 본문은 JSON 형식을 준수해야 하며 마크다운 펜스(\`\`\`json)를 포함하지 말고 순수 JSON 형식의 문자열로만 응답하세요. 만약 사용자가 적어준 정보가 부족하더라도, 운동 이름들을 유추하고 임의의 일반적인 세트와 횟수를 채워 루틴을 완성해야 합니다.

JSON schema:
{
  "name": "유튜브 영상 기반 맞춤형 루틴 이름",
  "exercises": [
    {
      "name": "운동 영어/한글 이름 (예: 벤치 프레스 - Bench Press)",
      "sets": 4,
      "reps": 10,
      "notes": "자세 팁, 무게 추천, 혹은 주의사항"
    }
  ]
}
`;

  try {
    const rawResponse = await runAiPrompt(prompt, config, true);
    // Parse JSON
    const cleanJsonStr = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed: WorkoutRoutine = JSON.parse(cleanJsonStr);
    
    if (!parsed.name || !Array.isArray(parsed.exercises)) {
      throw new Error('올바르지 않은 응답 형식');
    }
    
    return parsed;
  } catch (err: any) {
    console.error('AI YouTube parsing failed, using fallback mock:', err);
    // If API failed or JSON parse error, return a dynamic mock based on description keywords
    return getMockRoutine(url, extraContext);
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
): Promise<string> {
  if (!config.key || !config.key.trim()) {
    return getMockDietRecommendation(ingredients, targetCalories, targetProtein, mode);
  }

  const prompt = `
당신은 피트니스 식단 설계사이자 전문 스포츠 영양사입니다. 
사용자의 보유 냉장고 재료와 칼로리 및 단백질 하루 목표 수치를 바탕으로 한 끼 혹은 하루 식단 구성을 추천해주세요.

- 보유 재료: ${ingredients.join(', ') || '재료 없음 (물만 있음)'}
- 하루 목표 칼로리: ${targetCalories} kcal
- 하루 목표 단백질: ${targetProtein} g
- 사용자의 현재 목표 모드: ${mode === 'cut' ? '컷팅 (다이어트)' : mode === 'bulk' ? '벌크업' : mode === 'leanmass' ? '린매스업' : '유지어터'}

지침:
1. 보유하고 있는 재료들을 최우선적으로 활용하여 식단 메뉴를 구성하세요. 부족한 영양소(예: 지방이나 탄수화물, 특정 야채)가 있을 경우, 추가로 곁들이면 좋은 추천 재료도 명시해주세요.
2. 2가지의 명확한 식단 제안서(메뉴명, 대략적인 양, 탄단지 및 칼로리 요약)를 제공해주세요.
3. 마지막 항목에는 '훈수충 트레이너'의 시각에서 오늘 식단에 대해 잔소리 섞인 한마디(훈수 코너)를 츤데레 톤으로 유머러스하게 넣어주세요.
4. 결과는 친절하고 깔끔한 마크다운 양식으로 구성해주세요.
`;

  try {
    return await runAiPrompt(prompt, config, false);
  } catch (err: any) {
    console.error('AI Diet recommendation failed:', err);
    return `### ⚠️ AI 호출 실패\n${err.message || '알 수 없는 에러가 발생했습니다.'}\n\n` + 
      getMockDietRecommendation(ingredients, targetCalories, targetProtein, mode);
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

function getMockRoutine(url: string, extraContext: string): WorkoutRoutine {
  const text = (url + ' ' + extraContext).toLowerCase();
  
  let name = '유튜브 영상 기반 맞춤형 루틴';
  let exercises: RoutineExercise[] = [];

  if (text.includes('chest') || text.includes('가슴') || text.includes('벤치')) {
    name = '유튜브 가슴 집중 타겟 루틴';
    exercises = [
      { name: '덤벨 플라이 - Dumbbell Fly', sets: 4, reps: 12, notes: '수축 시 가슴 안쪽까지 모아주는 느낌으로 진행' },
      { name: '인클라인 덤벨 프레스 - Incline dumbbell press', sets: 4, reps: 10, notes: '윗가슴 근육 결대로 덤벨을 밀어 올리기' },
      { name: '푸쉬업 - Push Up', sets: 3, reps: 15, notes: '마지막 가슴 털어주기용 고볼륨 세트' },
    ];
  } else if (text.includes('back') || text.includes('등') || text.includes('풀업')) {
    name = '유튜브 등 신의 자극 루틴';
    exercises = [
      { name: '어시스트 풀업 - Assist Pull Up', sets: 4, reps: 8, notes: '견갑 하강을 정확히 느낀 후에 등 힘으로 수축' },
      { name: '원 암 덤벨 로우 - One arm dumbbell row', sets: 4, reps: 10, notes: '광배근 하부 타겟, 팔꿈치를 골반 쪽으로 당김' },
      { name: '암 풀 다운 - Arm Pull Down', sets: 3, reps: 12, notes: '가동범위를 길게 가져가면서 광배근 이완' },
    ];
  } else if (text.includes('leg') || text.includes('하체') || text.includes('스쿼트')) {
    name = '유튜브 하체 불타는 10분 루틴';
    exercises = [
      { name: '스쿼트 - Back Squat', sets: 4, reps: 12, notes: '고관절을 잘 접어 앉으며, 무릎이 모이지 않게 주의' },
      { name: '런지 - Lunge', sets: 3, reps: 12, notes: '앞발 뒤꿈치에 체중을 싣고 밀며 일어남' },
      { name: '레그 익스텐션 - Leg Extension', sets: 4, reps: 15, notes: '대퇴사두근 수축 극대화' },
    ];
  } else {
    name = '유튜브 올인원 데일리 루틴';
    exercises = [
      { name: '바벨 데드리프트 - Barbell Deadlift', sets: 4, reps: 8, notes: '복압을 강하게 채워 허리가 굽지 않도록 유지' },
      { name: '숄더 프레스 - Dumbbell Shoulder Press', sets: 4, reps: 10, notes: '어깨가 으쓱하지 않게 주의하며 귀 옆으로 밀어올림' },
      { name: '케이블 페이스 풀 - Cable Face Pull', sets: 3, reps: 15, notes: '후면 어깨 및 라운드 숄더 개선' },
    ];
  }

  return { name, exercises };
}

function getMockDietRecommendation(
  ingredients: string[],
  targetCalories: number,
  targetProtein: number,
  mode: string
): string {
  const matched = ingredients.filter(i => ['닭가슴살', '고구마', '계란', '현미밥', '소고기', '바나나', '샐러드', '두부'].includes(i));
  const hasProtein = matched.some(i => ['닭가슴살', '계란', '소고기', '두부'].includes(i));
  const hasCarb = matched.some(i => ['고구마', '현미밥', '바나나'].includes(i));

  return `
### 🥗 냉장고 재료 기반 추천 식단 (오프라인 모드)
> [!NOTE]
> 설정 탭에 API 키를 등록하시면 실제 생성형 AI가 더 상세하고 최적화된 식단을 작성해 줍니다! (모의 목표치: ${targetCalories} kcal / ${targetProtein} g)

#### [1안] 냉장고 주력 헬창 한 끼
- **메뉴**: ${hasProtein ? matched.find(i => ['닭가슴살', '계란', '소고기', '두부'].includes(i)) : '두부/계란 구이'} & ${hasCarb ? matched.find(i => ['고구마', '현미밥', '바나나'].includes(i)) : '구운 단호박'}
- **섭취 방법**: 보유하신 재료를 주축으로 깔끔하게 구워 조리하세요.
- **영양 정보**: 약 450 kcal (단백질 약 28g 섭취 가능)
- **부족한 추천 재료**: 신선한 야채가 냉장고에 보이지 않습니다. 식이섬유와 비타민 충족을 위해 방울토마토나 오이를 곁들이면 매우 좋습니다!

#### [2안] 간편 복합 쉐이크 & 에그 밀
- **메뉴**: 바나나 오트밀 믹스 & 삶은 계란 2알
- **섭취 방법**: 바나나와 계란을 이용해 대사를 촉진시키는 간편 단백질 조합입니다.
- **영양 정보**: 약 350 kcal (단백질 약 16g 섭취 가능)

---

### 💬 훈수충 트레이너의 한마디 (Nagging)
"${mode === 'cut' ? '다이어트 하신다면서 냉장고에 달달한 거 있는 거 다 압니다. 샐러드랑 닭가슴살 빼고 손대지 마세요!' : mode === 'bulk' ? '벌크업은 많이 먹는 게 일입니다. 냉장고에 있는 거 싹 다 꺼내서 입에 쑤셔 넣으세요!' : '오늘 섭취량 눈에 불을 켜고 보고 있습니다. 유지어터라고 방심하다간 쥐도 새도 모르게 살찝니다!'}"
`;
}

export function getLocalCoachFeedback(
  profile: any,
  todayCal: number,
  todayPro: number,
  workoutCompleted: boolean
): string {
  const { mode, inbody, weight } = profile;
  
  // Basic checks
  const calDiff = todayCal - profile.targetCalories;
  const proDiff = todayPro - profile.targetProtein;
  
  let feedback = '';

  // 1. Check workout first
  if (!workoutCompleted) {
    feedback = '오늘 아직 운동 완료 버튼 안 눌렀지? 쇠질은 안 하고 스마트폰만 보고 있는 거냐? 얼른 몸 움직여라!';
    return feedback;
  }

  // 2. Muscle checks
  const isMuscleLow = inbody?.muscleMass && (
    (profile.gender === 'male' && inbody.muscleMass / weight < 0.32) ||
    (profile.gender === 'female' && inbody.muscleMass / weight < 0.25)
  );

  const isMuscleHigh = inbody?.muscleMass && (
    (profile.gender === 'male' && inbody.muscleMass / weight >= 0.38) ||
    (profile.gender === 'female' && inbody.muscleMass / weight >= 0.30)
  );

  // 3. Nagging logic based on mode and stats
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
      feedback = '린매스업 하다가 살매스업 되겠어요! 칼로리 섭취가 너무 과합니다. 밥 한 숟갈 덜고 야채 채우세요.';
    } else if (proDiff < -10) {
      feedback = '린매스업의 핵심은 넉넉한 단백질! 골격근량이 비명을 지르고 있습니다. 단백질을 20g만 더 채워주세요.';
    } else {
      feedback = isMuscleHigh 
        ? '근육량이 아주 훌륭해서 린매스업 효율이 훌륭하군요. 단백질 섭취 고점을 유지하세요!' 
        : '린매스업의 정석대로 가고 있습니다. 조급해하지 말고 점진적 과부하에 신경 씁시다.';
    }
  } else {
    // Maintain
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
