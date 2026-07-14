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
  id?: string;
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
  saveCustomRoutine: (routine: WorkoutRoutine) => void;
  registerMeal: (meal: Omit<FoodItem, 'id' | 'mealType'>) => void;
  removeRegisteredMeal: (name: string) => void;
  resetAllData: () => void;
  savedRoutines: WorkoutRoutine[];
  renameActiveRoutine: (newName: string) => void;
  saveRoutineToList: (name: string, exercises: RoutineExercise[]) => void;
  deleteRoutineFromList: (id: string) => void;
  renameRoutineInList: (id: string, newName: string) => void;
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

  const [savedRoutines, setSavedRoutines] = useState<WorkoutRoutine[]>(() => {
    const saved = localStorage.getItem('pl_saved_routines');
    return saved ? JSON.parse(saved) : [];
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
    localStorage.setItem('pl_saved_routines', JSON.stringify(savedRoutines));
  }, [savedRoutines]);

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

  // 4. Target Calories & Protein based on Mode & InBody compensation (Adapted by Gender)
  let targetCalories = tdee;
  const isMale = gender === 'male';
  let targetProtein = weight * (isMale ? 1.4 : 1.2); // Default maintain midpoint

  switch (mode) {
    case 'maintain':
      targetCalories = tdee;
      // Protein range: Male 1.4~1.6, Female 1.2~1.4
      targetProtein = weight * (isMale 
        ? (isHighMuscle ? 1.6 : 1.4) 
        : (isHighMuscle ? 1.4 : 1.2)
      );
      break;
    case 'leanmass':
      // Calorie surplus: Male +250, Female +200
      targetCalories = tdee + (isMale ? 250 : 200);
      // Protein range: Male 2.0~2.2, Female 1.6~1.8
      targetProtein = weight * (isMale 
        ? (isHighMuscle ? 2.2 : 2.0) 
        : (isHighMuscle ? 1.8 : 1.6)
      );
      break;
    case 'bulk':
      // Calorie surplus: Male +500, Female +350
      targetCalories = tdee + (isMale ? 500 : 350);
      // Protein range: Male 2.2~2.4, Female 1.8~2.0
      targetProtein = weight * (isMale 
        ? (isHighMuscle ? 2.4 : 2.2) 
        : (isHighMuscle ? 2.0 : 1.8)
      );
      break;
    case 'cut':
      // Calorie deficit: Male -500, Female -350 (More sustainable hurdle for women)
      targetCalories = tdee - (isMale ? 500 : 350);
      // Protein range: Male 1.8~2.0, Female 1.4~1.6
      targetProtein = weight * (isMale 
        ? (isHighMuscle ? 2.0 : 1.8) 
        : (isHighMuscle ? 1.6 : 1.4)
      );
      // High bodyfat cuts: slightly restrict calorie target more or suggest it
      if (isHighBodyFat) {
        targetCalories = tdee - (isMale ? 550 : 400); // extra cut
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

  const renameActiveRoutine = (newName: string) => {
    if (!currentRoutine) return;
    setCurrentRoutine({
      ...currentRoutine,
      name: newName.trim() || '무명 루틴',
    });
  };

  const saveRoutineToList = (name: string, exercises: RoutineExercise[]) => {
    const newRoutine: WorkoutRoutine = {
      id: Date.now().toString(),
      name: name.trim() || `새 루틴 - ${new Date().toLocaleDateString()}`,
      exercises: exercises.map(ex => ({ name: ex.name, sets: ex.sets, reps: ex.reps, notes: ex.notes })),
    };
    setSavedRoutines((prev) => [newRoutine, ...prev]);
  };

  const deleteRoutineFromList = (id: string) => {
    setSavedRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const renameRoutineInList = (id: string, newName: string) => {
    setSavedRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name: newName.trim() || r.name } : r))
    );
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
        saveCustomRoutine,
        registerMeal,
        removeRegisteredMeal,
        resetAllData,
        savedRoutines,
        renameActiveRoutine,
        saveRoutineToList,
        deleteRoutineFromList,
        renameRoutineInList,
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
