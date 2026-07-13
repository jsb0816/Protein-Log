export type ExerciseEquipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'smith'
  | 'bodyweight'
  | 'kettlebell'
  | 'band';

export type ExerciseAngle = 'flat' | 'incline' | 'decline' | 'seated' | 'standing';

export interface ParsedExerciseRaw {
  baseExercise: string;
  baseExerciseEn: string;
  equipment: ExerciseEquipment;
  angle?: ExerciseAngle | null;
  grip?: string | null;
  machineVariant?: string | null;
  sets: number;
  reps: number;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
}

const EQUIPMENT_KO: Record<ExerciseEquipment, string> = {
  barbell: '바벨',
  dumbbell: '덤벨',
  cable: '케이블',
  machine: '머신',
  smith: '스미스 머신',
  bodyweight: '맨몸',
  kettlebell: '케틀벨',
  band: '밴드',
};

const EQUIPMENT_EN: Record<ExerciseEquipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  smith: 'Smith Machine',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
};

const ANGLE_KO: Record<ExerciseAngle, string> = {
  flat: '플랫',
  incline: '인클라인',
  decline: '디클라인',
  seated: '시티드',
  standing: '스탠딩',
};

const ANGLE_EN: Record<ExerciseAngle, string> = {
  flat: 'Flat',
  incline: 'Incline',
  decline: 'Decline',
  seated: 'Seated',
  standing: 'Standing',
};

const VALID_EQUIPMENT = new Set<string>([
  'barbell', 'dumbbell', 'cable', 'machine', 'smith', 'bodyweight', 'kettlebell', 'band',
]);

const VALID_ANGLES = new Set<string>(['flat', 'incline', 'decline', 'seated', 'standing']);

export function buildExerciseDisplayName(raw: ParsedExerciseRaw): string {
  const koParts: string[] = [];
  const enParts: string[] = [];

  if (raw.angle && VALID_ANGLES.has(raw.angle)) {
    koParts.push(ANGLE_KO[raw.angle]);
    enParts.push(ANGLE_EN[raw.angle]);
  }

  if (raw.equipment === 'smith') {
    koParts.push('스미스 머신');
    enParts.push('Smith Machine');
  } else if (raw.equipment && VALID_EQUIPMENT.has(raw.equipment)) {
    koParts.push(EQUIPMENT_KO[raw.equipment]);
    enParts.push(EQUIPMENT_EN[raw.equipment]);
  }

  koParts.push(raw.baseExercise.trim());
  enParts.push(raw.baseExerciseEn.trim());

  if (raw.grip?.trim()) {
    koParts.push(`(${raw.grip.trim()} 그립)`);
    enParts.push(`(${raw.grip.trim()} Grip)`);
  }

  return `${koParts.join(' ')} - ${enParts.join(' ')}`;
}

function normalizeEquipment(value: unknown): ExerciseEquipment {
  const str = String(value || '').toLowerCase().trim();
  if (str.includes('smith') || str.includes('스미스')) return 'smith';
  if (str.includes('dumbbell') || str.includes('덤벨') || str === 'db') return 'dumbbell';
  if (str.includes('barbell') || str.includes('바벨') || str === 'bb') return 'barbell';
  if (str.includes('cable') || str.includes('케이블')) return 'cable';
  if (str.includes('kettlebell') || str.includes('케틀벨')) return 'kettlebell';
  if (str.includes('band') || str.includes('밴드')) return 'band';
  if (str.includes('bodyweight') || str.includes('맨몸')) return 'bodyweight';
  if (str.includes('machine') || str.includes('머신')) return 'machine';
  return 'barbell';
}

function normalizeAngle(value: unknown): ExerciseAngle | null {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();
  if (str.includes('incline') || str.includes('인클')) return 'incline';
  if (str.includes('decline') || str.includes('디클')) return 'decline';
  if (str.includes('flat') || str.includes('플랫')) return 'flat';
  if (str.includes('seated') || str.includes('시티드') || str.includes('앉아')) return 'seated';
  if (str.includes('standing') || str.includes('스탠딩') || str.includes('서서')) return 'standing';
  return VALID_ANGLES.has(str) ? (str as ExerciseAngle) : null;
}

function inferFromLegacyName(name: string): Partial<ParsedExerciseRaw> {
  const lower = name.toLowerCase();
  const result: Partial<ParsedExerciseRaw> = {};

  if (lower.includes('smith') || lower.includes('스미스')) result.equipment = 'smith';
  else if (lower.includes('dumbbell') || lower.includes('덤벨')) result.equipment = 'dumbbell';
  else if (lower.includes('barbell') || lower.includes('바벨')) result.equipment = 'barbell';
  else if (lower.includes('cable') || lower.includes('케이블')) result.equipment = 'cable';
  else if (lower.includes('machine') || lower.includes('머신')) result.equipment = 'machine';

  if (lower.includes('incline') || lower.includes('인클')) result.angle = 'incline';
  else if (lower.includes('decline') || lower.includes('디클')) result.angle = 'decline';
  else if (lower.includes('flat') || lower.includes('플랫')) result.angle = 'flat';

  return result;
}

export function normalizeParsedExercise(raw: Partial<ParsedExerciseRaw> & { name?: string }): ParsedExerciseRaw {
  const legacy = raw.name ? inferFromLegacyName(raw.name) : {};

  const equipment = normalizeEquipment(raw.equipment ?? legacy.equipment ?? 'barbell');
  const angle = normalizeAngle(raw.angle ?? legacy.angle);

  const baseExercise = (raw.baseExercise || raw.name?.split('-')[0]?.trim() || '운동').trim();
  const baseExerciseEn = (raw.baseExerciseEn || raw.name?.split('-')[1]?.trim() || baseExercise).trim();

  const sets = Math.max(1, Math.min(10, Number(raw.sets) || 3));
  const reps = Math.max(1, Math.min(50, Number(raw.reps) || 10));

  let notes = raw.notes?.trim() || '';
  if (raw.confidence === 'low' && !notes.includes('[추정]')) {
    notes = notes ? `[추정] ${notes}` : '[추정] 영상 정보가 부족하여 장비/각도를 추정했습니다.';
  }

  return {
    baseExercise,
    baseExerciseEn,
    equipment,
    angle,
    grip: raw.grip ?? null,
    machineVariant: raw.machineVariant ?? null,
    sets,
    reps,
    notes: notes || undefined,
    confidence: raw.confidence,
  };
}

export function toRoutineExercise(raw: ParsedExerciseRaw) {
  return {
    name: buildExerciseDisplayName(raw),
    sets: raw.sets,
    reps: raw.reps,
    notes: raw.notes,
  };
}

interface KeywordMatch {
  equipment?: ExerciseEquipment;
  angle?: ExerciseAngle;
  baseExercise: string;
  baseExerciseEn: string;
}

function matchExerciseFromText(text: string): KeywordMatch[] {
  const lower = text.toLowerCase();
  const found: KeywordMatch[] = [];

  const benchPatterns: Array<{ re: RegExp; angle?: ExerciseAngle; equipment?: ExerciseEquipment }> = [
    { re: /(스미스|smith).*(인클|incline).*(벤치|bench|프레스|press)/i, angle: 'incline', equipment: 'smith' },
    { re: /(스미스|smith).*(플랫|flat)?.*(벤치|bench|프레스|press)/i, angle: 'flat', equipment: 'smith' },
    { re: /(인클|incline).*(덤벨|dumbbell|db).*(벤치|bench|프레스|press)/i, angle: 'incline', equipment: 'dumbbell' },
    { re: /(플랫|flat).*(바벨|barbell|bb).*(벤치|bench|프레스|press)/i, angle: 'flat', equipment: 'barbell' },
    { re: /(디클|decline).*(벤치|bench|프레스|press)/i, angle: 'decline', equipment: 'barbell' },
    { re: /(덤벨|dumbbell|db).*(벤치|bench|프레스|press)/i, equipment: 'dumbbell' },
    { re: /(바벨|barbell|bb).*(벤치|bench|프레스|press)/i, equipment: 'barbell' },
    { re: /(벤치|bench).*(프레스|press)/i, angle: 'flat', equipment: 'barbell' },
  ];

  for (const p of benchPatterns) {
    if (p.re.test(lower)) {
      found.push({
        angle: p.angle,
        equipment: p.equipment,
        baseExercise: '벤치 프레스',
        baseExerciseEn: 'Bench Press',
      });
      break;
    }
  }

  const otherPatterns: Array<{ re: RegExp; match: KeywordMatch }> = [
    { re: /(덤벨|dumbbell).*(플라이|fly)/i, match: { equipment: 'dumbbell', baseExercise: '덤벨 플라이', baseExerciseEn: 'Dumbbell Fly' } },
    { re: /(케이블|cable).*(크로스|cross)/i, match: { equipment: 'cable', baseExercise: '케이블 크로스오버', baseExerciseEn: 'Cable Crossover' } },
    { re: /(랫|lat).*(풀|pull).*(다운|down)/i, match: { equipment: 'cable', baseExercise: '랫 풀다운', baseExerciseEn: 'Lat Pulldown' } },
    { re: /(원암|one.?arm).*(로우|row)/i, match: { equipment: 'dumbbell', baseExercise: '원암 덤벨 로우', baseExerciseEn: 'One Arm Dumbbell Row' } },
    { re: /(풀업|pull.?up|chin.?up)/i, match: { equipment: 'bodyweight', baseExercise: '풀업', baseExerciseEn: 'Pull Up' } },
    { re: /(백|back).*(스쿼트|squat)/i, match: { equipment: 'barbell', baseExercise: '백 스쿼트', baseExerciseEn: 'Back Squat' } },
    { re: /(레그|leg).*(프레스|press)/i, match: { equipment: 'machine', baseExercise: '레그 프레스', baseExerciseEn: 'Leg Press' } },
    { re: /(숄더|shoulder|오버헤드|overhead).*(프레스|press)/i, match: { equipment: 'dumbbell', angle: 'seated', baseExercise: '숄더 프레스', baseExerciseEn: 'Shoulder Press' } },
    { re: /(사이드|lateral).*(레터럴|lateral|raise)/i, match: { equipment: 'dumbbell', baseExercise: '사이드 레터럴 레이즈', baseExerciseEn: 'Lateral Raise' } },
  ];

  for (const p of otherPatterns) {
    if (p.re.test(lower) && !found.some((f) => f.baseExercise === p.match.baseExercise)) {
      found.push(p.match);
    }
  }

  return found;
}

export function extractExercisesFromText(text: string): ParsedExerciseRaw[] {
  const matches = matchExerciseFromText(text);
  if (matches.length === 0) return [];

  return matches.map((m) =>
    normalizeParsedExercise({
      baseExercise: m.baseExercise,
      baseExerciseEn: m.baseExerciseEn,
      equipment: m.equipment ?? 'barbell',
      angle: m.angle ?? null,
      sets: 4,
      reps: 10,
      confidence: 'medium',
    })
  );
}
