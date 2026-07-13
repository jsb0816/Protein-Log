import React, { createContext, useContext, useState, useEffect } from 'react';

export type DietMode = 'detailed' | 'simple';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  mealType?: MealType;
}

export interface DailyDiet {
  mode: DietMode;
  items: FoodItem[];
  simpleProtein: number;
  simpleProteinMeals?: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
  profileMode?: 'maintain' | 'leanmass' | 'bulk' | 'cut';
}

export interface WorkoutSet {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutExercise {
  name: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface DailyWorkout {
  completed: boolean;
  exercises: WorkoutExercise[];
}

export interface InBodyData {
  muscleMass?: number; // kg
  bodyFat?: number;    // %
}

export interface UserProfile {
  gender: 'male' | 'female';
  age: number;
  height: number; // cm
  weight: number; // kg
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725;
  mode: 'maintain' | 'leanmass' | 'bulk' | 'cut';
  inbody: InBodyData;
  isOnboarded: boolean;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  workoutDaysPerWeek: 3 | 4 | 5;
}

export interface ApiConfig {
  provider: 'gemini' | 'openai';
  key: string;
}

export interface RoutineExercise {
  name: string;
  sets: number;
  reps: number;
  notes?: string;
}

export interface WorkoutRoutine {
  name: string;
  exercises: RoutineExercise[];
}

interface AppContextProps {
  userProfile: UserProfile;
  apiConfig: ApiConfig;
  fridgeIngredients: string[];
  dietLogs: Record<string, DailyDiet>;
  workoutLogs: Record<string, DailyWorkout>;
  currentRoutine: WorkoutRoutine | null;
  registeredMeals: Omit<FoodItem, 'id' | 'mealType'>[];
  // Summary Stats
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  isHighMuscle: boolean;
  isHighBodyFat: boolean;
  isLowBodyFat: boolean;
  // Actions
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateInBody: (inbody: InBodyData) => void;
  updateApiConfig: (config: ApiConfig) => void;
  addFridgeIngredient: (ingredient: string) => void;
  removeFridgeIngredient: (ingredient: string) => void;
  addDietItem: (date: string, item: Omit<FoodItem, 'id' | 'mealType'>, mealType: MealType) => void;
  removeDietItem: (date: string, itemId: string) => void;
  updateSimpleProtein: (date: string, mealType: MealType, protein: number) => void;
  toggleDietMode: (date: string) => void;
  saveWorkoutLog: (date: string, workout: DailyWorkout) => void;
  completeWorkout: (date: string, completed: boolean) => void;
  generateAutoRoutine: () => void;
  saveCustomRoutine: (routine: WorkoutRoutine) => void;
  registerMeal: (meal: Omit<FoodItem, 'id' | 'mealType'>) => void;
  removeRegisteredMeal: (name: string) => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const defaultProfile: UserProfile = {
  gender: 'male',
  age: 26,
  height: 175,
  weight: 70,
  activityLevel: 1.375,
  mode: 'maintain',
  inbody: {},
  isOnboarded: false,
  experienceLevel: 'beginner',
  workoutDaysPerWeek: 3,
};

const defaultApiConfig: ApiConfig = {
  provider: 'gemini',
  key: '',
};

const defaultMeals: Omit<FoodItem, 'id' | 'mealType'>[] = [
  { name: '간장계란밥', calories: 420, carbs: 65, protein: 14, fat: 12 },
  { name: '닭가슴살 샐러드', calories: 280, carbs: 12, protein: 32, fat: 8 },
  { name: '현미 고구마 한 끼', calories: 350, carbs: 65, protein: 8, fat: 2 },
  { name: '프로틴 쉐이크', calories: 150, carbs: 5, protein: 30, fat: 1 }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('pl_profile');
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem('pl_api_config');
    return saved ? JSON.parse(saved) : defaultApiConfig;
  });

  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>(() => {
    const saved = localStorage.getItem('pl_fridge');
    return saved ? JSON.parse(saved) : ['닭가슴살', '고구마', '계란', '현미밥'];
  });

  const [dietLogs, setDietLogs] = useState<Record<string, DailyDiet>>(() => {
    const saved = localStorage.getItem('pl_diet_logs');
    return saved ? JSON.parse(saved) : {};
  });

  const [workoutLogs, setWorkoutLogs] = useState<Record<string, DailyWorkout>>(() => {
    const saved = localStorage.getItem('pl_workout_logs');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentRoutine, setCurrentRoutine] = useState<WorkoutRoutine | null>(() => {
    const saved = localStorage.getItem('pl_routine');
    return saved ? JSON.parse(saved) : null;
  });

  const [registeredMeals, setRegisteredMeals] = useState<Omit<FoodItem, 'id' | 'mealType'>[]>(() => {
    const saved = localStorage.getItem('pl_registered_meals');
    return saved ? JSON.parse(saved) : defaultMeals;
  });

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('pl_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('pl_api_config', JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    localStorage.setItem('pl_fridge', JSON.stringify(fridgeIngredients));
  }, [fridgeIngredients]);

  useEffect(() => {
    localStorage.setItem('pl_diet_logs', JSON.stringify(dietLogs));
  }, [dietLogs]);

  useEffect(() => {
    localStorage.setItem('pl_workout_logs', JSON.stringify(workoutLogs));
  }, [workoutLogs]);

  useEffect(() => {
    if (currentRoutine) {
      localStorage.setItem('pl_routine', JSON.stringify(currentRoutine));
    } else {
      localStorage.removeItem('pl_routine');
    }
  }, [currentRoutine]);

  useEffect(() => {
    localStorage.setItem('pl_registered_meals', JSON.stringify(registeredMeals));
  }, [registeredMeals]);

  // --- Calculations ---

  // 1. InBody evaluation
  const { weight, height, age, gender, activityLevel, mode, inbody } = userProfile;
  const hasInbody = inbody.bodyFat !== undefined && inbody.bodyFat > 0;
  
  // High muscle check: Male SMM > 38% of weight, Female SMM > 30% of weight
  const isHighMuscle = !!(
    inbody.muscleMass &&
    ((gender === 'male' && inbody.muscleMass / weight >= 0.38) ||
     (gender === 'female' && inbody.muscleMass / weight >= 0.30))
  );

  // Body fat level evaluations
  const isHighBodyFat = !!(
    inbody.bodyFat &&
    ((gender === 'male' && inbody.bodyFat > 20) ||
     (gender === 'female' && inbody.bodyFat > 28))
  );

  const isLowBodyFat = !!(
    inbody.bodyFat &&
    ((gender === 'male' && inbody.bodyFat < 8) ||
     (gender === 'female' && inbody.bodyFat < 15))
  );

  // 2. BMR Calculations
  let bmr = 0;
  if (hasInbody && inbody.bodyFat !== undefined) {
    // Katch-McArdle Formula
    const lbm = weight * (1 - inbody.bodyFat / 100);
    bmr = 370 + 21.6 * lbm;
  } else {
    // Mifflin-St Jeor Formula
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
  }

  // 3. TDEE Calculations
  const tdee = bmr * activityLevel;

  // 4. Target Calories & Protein based on Mode & InBody compensation
  let targetCalories = tdee;
  let targetProtein = weight * 1.4; // Default maintain midpoint

  switch (mode) {
    case 'maintain':
      targetCalories = tdee;
      // Protein range: 1.2 ~ 1.6
      targetProtein = weight * (isHighMuscle ? 1.6 : 1.4);
      break;
    case 'leanmass':
      targetCalories = tdee + 250;
      // Protein range: 1.8 ~ 2.2
      targetProtein = weight * (isHighMuscle ? 2.2 : 2.0);
      break;
    case 'bulk':
      targetCalories = tdee + 500;
      // Protein range: 2.0 ~ 2.4
      targetProtein = weight * (isHighMuscle ? 2.4 : 2.2);
      break;
    case 'cut':
      targetCalories = tdee - 500;
      // Protein range: 1.6 ~ 2.0
      targetProtein = weight * (isHighMuscle ? 2.0 : 1.8);
      // High bodyfat cuts: slightly restrict calorie target more or suggest it
      if (isHighBodyFat) {
        targetCalories = tdee - 550; // extra cut
      }
      break;
  }

  // --- ACTIONS ---

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...profile }));
  };

  const updateInBody = (inbodyData: InBodyData) => {
    setUserProfile((prev) => ({
      ...prev,
      inbody: { ...prev.inbody, ...inbodyData },
    }));
  };

  const updateApiConfig = (config: ApiConfig) => {
    setApiConfig(config);
  };

  const addFridgeIngredient = (ingredient: string) => {
    if (!ingredient.trim()) return;
    setFridgeIngredients((prev) => {
      if (prev.includes(ingredient.trim())) return prev;
      return [...prev, ingredient.trim()];
    });
  };

  const removeFridgeIngredient = (ingredient: string) => {
    setFridgeIngredients((prev) => prev.filter((i) => i !== ingredient));
  };

  const addDietItem = (date: string, item: Omit<FoodItem, 'id' | 'mealType'>, mealType: MealType) => {
    setDietLogs((prev) => {
      const day = prev[date] || { mode: 'detailed', items: [], simpleProtein: 0 };
      const newItem: FoodItem = {
        ...item,
        mealType,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      };
      return {
        ...prev,
        [date]: {
          ...day,
          profileMode: day.profileMode || userProfile.mode,
          items: [...day.items, newItem],
        },
      };
    });
  };

  const removeDietItem = (date: string, itemId: string) => {
    setDietLogs((prev) => {
      const day = prev[date];
      if (!day) return prev;
      return {
        ...prev,
        [date]: {
          ...day,
          items: day.items.filter((item) => item.id !== itemId),
        },
      };
    });
  };

  const updateSimpleProtein = (date: string, mealType: MealType, protein: number) => {
    setDietLogs((prev) => {
      const day = prev[date] || { mode: 'simple', items: [], simpleProtein: 0 };
      const currentMeals = day.simpleProteinMeals || { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
      const updatedMeals = {
        ...currentMeals,
        [mealType]: Math.max(0, protein),
      };
      const newTotal = updatedMeals.breakfast + updatedMeals.lunch + updatedMeals.dinner + updatedMeals.snack;
      return {
        ...prev,
        [date]: {
          ...day,
          profileMode: day.profileMode || userProfile.mode,
          simpleProteinMeals: updatedMeals,
          simpleProtein: newTotal,
        },
      };
    });
  };

  const toggleDietMode = (date: string) => {
    setDietLogs((prev) => {
      const day = prev[date] || { mode: 'detailed', items: [], simpleProtein: 0 };
      return {
        ...prev,
        [date]: {
          ...day,
          profileMode: day.profileMode || userProfile.mode,
          mode: day.mode === 'detailed' ? 'simple' : 'detailed',
        },
      };
    });
  };

  const saveWorkoutLog = (date: string, workout: DailyWorkout) => {
    setWorkoutLogs((prev) => ({
      ...prev,
      [date]: workout,
    }));
  };

  const completeWorkout = (date: string, completed: boolean) => {
    setWorkoutLogs((prev) => {
      const day = prev[date] || { completed: false, exercises: [] };
      return {
        ...prev,
        [date]: {
          ...day,
          completed,
        },
      };
    });
  };

  const saveCustomRoutine = (routine: WorkoutRoutine) => {
    setCurrentRoutine(routine);
  };

  // Generate customized standard workouts based on user profile and InBody
  const generateAutoRoutine = () => {
    const isMuscleLow = inbody.muscleMass !== undefined && (
      (gender === 'male' && inbody.muscleMass / weight < 0.32) ||
      (gender === 'female' && inbody.muscleMass / weight < 0.25)
    );

    let routineName = '';
    let exercises: RoutineExercise[] = [];

    // Routine naming and configuration based on mode and days
    if (userProfile.mode === 'cut') {
      routineName = `컷팅용 지방 연소 루틴 (주 ${userProfile.workoutDaysPerWeek}회)`;
    } else if (userProfile.mode === 'bulk') {
      routineName = `벌크업 고중량 스트렝스 루틴 (주 ${userProfile.workoutDaysPerWeek}회)`;
    } else if (userProfile.mode === 'leanmass') {
      routineName = `린매스업 점진적 과부하 루틴 (주 ${userProfile.workoutDaysPerWeek}회)`;
    } else {
      routineName = `유지어터 밸런스 루틴 (주 ${userProfile.workoutDaysPerWeek}회)`;
    }

    // InBody rule: If muscle mass is low, focus on heavy compound joint movements first
    if (isMuscleLow) {
      routineName += ' [골격근량 보강]';
      exercises = [
        { name: '스쿼트 (Squat)', sets: 4, reps: 8, notes: '골격근 부족 보강을 위한 핵심 하체 운동, 천천히 깊게' },
        { name: '벤치 프레스 (Bench Press)', sets: 4, reps: 8, notes: '대흉근 기초 근력 확보를 위한 다관절 복합 운동' },
        { name: '데드리프트 (Deadlift)', sets: 3, reps: 5, notes: '전신 근력 및 후면 사슬 강화를 위한 고중량 복합 운동' },
        { name: '바벨 로우 (Barbell Row)', sets: 4, reps: 10, notes: '두꺼운 등 프레임을 위한 기초 운동' },
      ];
    } else {
      // Normal routine generation
      if (userProfile.mode === 'bulk') {
        exercises = [
          { name: '스쿼트 (Squat)', sets: 5, reps: 5, notes: '최대 중량의 80-85% 강도' },
          { name: '밀리터리 프레스 (Military Press)', sets: 4, reps: 6, notes: '어깨 프레임 증가를 위한 스트렝스 훈련' },
          { name: '벤치 프레스 (Bench Press)', sets: 5, reps: 5, notes: '최대 5회 반복 가능한 무거운 중량 위주' },
          { name: '풀업 / 랫풀다운', sets: 4, reps: 8, notes: '광배근 너비 확보' },
          { name: '바벨 컬 / 삼두 익스텐션 컴파운드', sets: 3, reps: 10, notes: '팔 볼륨 확장 세트' },
        ];
      } else if (userProfile.mode === 'cut') {
        exercises = [
          { name: '가블렛 스쿼트 (Goblet Squat)', sets: 4, reps: 15, notes: '고반복 짧은 휴식 (60초 이하)' },
          { name: '덤벨 벤치 프레스', sets: 4, reps: 12, notes: '근섬유 자극 극대화' },
          { name: '케이블 로우', sets: 4, reps: 15, notes: '등 운동 볼륨 채우기' },
          { name: '레그 프레스', sets: 4, reps: 15, notes: '하체 펌핑 및 대사율 촉진' },
          { name: '인터벌 유산소 (러닝머신)', sets: 1, reps: 30, notes: '강도 높게 30분 동안 진행 필수!' },
        ];
      } else if (userProfile.mode === 'leanmass') {
        exercises = [
          { name: '백 스쿼트 (Back Squat)', sets: 4, reps: 10, notes: '점진적 과부하: 지난주보다 2.5kg 증량 목표' },
          { name: '인클라인 덤벨 프레스', sets: 4, reps: 10, notes: '윗가슴 타겟팅' },
          { name: '풀업 (Pull-Up)', sets: 4, reps: 8, notes: '맨몸 또는 밴드 보조' },
          { name: '루마니안 데드리프트', sets: 4, reps: 10, notes: '햄스트링 및 기립근 강화' },
          { name: '사이드 레터럴 레이즈', sets: 4, reps: 15, notes: '측면 삼각근 자극' },
        ];
      } else {
        // Maintain
        exercises = [
          { name: '레그 익스텐션 / 레그 컬', sets: 3, reps: 12, notes: '하체 탄력 유지' },
          { name: '체스트 프레스 머신', sets: 3, reps: 12, notes: '가슴 안전 훈련' },
          { name: '시티드 로우', sets: 3, reps: 12, notes: '등 활성화' },
          { name: '덤벨 숄더 프레스', sets: 3, reps: 12, notes: '어깨 기본 근력 유지' },
          { name: '가벼운 조깅 (러닝머신)', sets: 1, reps: 20, notes: '중강도로 건강 유지 목적 유산소 주 2회 진행' },
        ];
      }
    }

    setCurrentRoutine({
      name: routineName,
      exercises,
    });
  };

  const registerMeal = (meal: Omit<FoodItem, 'id' | 'mealType'>) => {
    setRegisteredMeals((prev) => {
      if (prev.some((m) => m.name.toLowerCase() === meal.name.toLowerCase())) return prev;
      return [...prev, meal];
    });
  };

  const removeRegisteredMeal = (name: string) => {
    setRegisteredMeals((prev) => prev.filter((m) => m.name !== name));
  };

  const resetAllData = () => {
    setUserProfile(defaultProfile);
    setApiConfig(defaultApiConfig);
    setFridgeIngredients(['닭가슴살', '고구마', '계란', '현미밥']);
    setDietLogs({});
    setRegisteredMeals(defaultMeals);
    setWorkoutLogs({});
    setCurrentRoutine(null);
    localStorage.clear();
  };

  return (
    <AppContext.Provider
      value={{
        userProfile,
        apiConfig,
        fridgeIngredients,
        dietLogs,
        workoutLogs,
        currentRoutine,
        registeredMeals,
        bmr,
        tdee,
        targetCalories,
        targetProtein,
        isHighMuscle,
        isHighBodyFat,
        isLowBodyFat,
        updateProfile,
        updateInBody,
        updateApiConfig,
        addFridgeIngredient,
        removeFridgeIngredient,
        addDietItem,
        removeDietItem,
        updateSimpleProtein,
        toggleDietMode,
        saveWorkoutLog,
        completeWorkout,
        generateAutoRoutine,
        saveCustomRoutine,
        registerMeal,
        removeRegisteredMeal,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
