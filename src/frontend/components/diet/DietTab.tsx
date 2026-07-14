import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { MealType, FoodItem } from '../../context/AppContext';
import { BottomSheet } from '../common/BottomSheet';
import { recommendDiet } from '../../utils/ai';
import type { DietRecommendationResult, RecommendedMeal } from '../../utils/ai';
import { ClipboardList, Plus, Trash2, Refrigerator, Sparkles, AlertCircle, Info, Heart, Check } from 'lucide-react';

export const DietTab: React.FC = () => {
  const {
    apiConfig,
    dietLogs,
    fridgeIngredients,
    targetCalories,
    targetProtein,
    userProfile,
    registeredMeals,
    addFridgeIngredient,
    removeFridgeIngredient,
    addDietItem,
    removeDietItem,
    updateSimpleProtein,
    toggleDietMode,
    registerMeal,
    removeRegisteredMeal,
  } = useApp();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<DietRecommendationResult | null>(null);

  // Tab state inside AI Recommendation Sheet
  const [aiActiveTab, setAiActiveTab] = useState<'proposal_0' | 'proposal_1' | 'comments' | 'nagging'>('proposal_0');
  // Temporary state to show visual feedback for registered presets
  const [registeredPresetNames, setRegisteredPresetNames] = useState<Record<string, boolean>>({});

  // active meal type being added ('breakfast' | 'lunch' | 'dinner' | 'snack')
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [addMode, setAddMode] = useState<'preset' | 'manual'>('preset');
  const [registerAsPreset, setRegisterAsPreset] = useState(false);

  // Food Form State
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');

  // Fridge Ingredient Form State
  const [newIngredient, setNewIngredient] = useState('');

  // Get current date string (local)
  const getTodayStr = () => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayStr();
  const todayDiet = dietLogs[todayStr] || { mode: 'detailed', items: [], simpleProtein: 0 };
  const isDetailed = todayDiet.mode === 'detailed';

  // Summaries
  const totalCal = todayDiet.items.reduce((sum, item) => sum + item.calories, 0);
  const totalCarb = todayDiet.items.reduce((sum, item) => sum + item.carbs, 0);
  const totalProt = todayDiet.items.reduce((sum, item) => sum + item.protein, 0);
  const totalFat = todayDiet.items.reduce((sum, item) => sum + item.fat, 0);

  const mealTypes = [
    { id: 'breakfast', label: '아침 🌅' },
    { id: 'lunch', label: '점심 ☀️' },
    { id: 'dinner', label: '저녁 🌙' },
    { id: 'snack', label: '간식 🍎' },
  ] as const;

  const handleAddFoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !activeMealType) return;

    const foodData = {
      name: foodName,
      calories: parseFloat(calories) || 0,
      carbs: parseFloat(carbs) || 0,
      protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0,
    };

    // Log to current meal category
    addDietItem(todayStr, foodData, activeMealType);

    // Save as preset if checked
    if (registerAsPreset) {
      registerMeal(foodData);
    }

    // Reset Form
    setFoodName('');
    setCalories('');
    setCarbs('');
    setProtein('');
    setFat('');
    setRegisterAsPreset(false);
    setIsAddOpen(false);
  };

  const handleSelectPreset = (preset: Omit<FoodItem, 'id' | 'mealType'>) => {
    if (!activeMealType) return;
    addDietItem(todayStr, preset, activeMealType);
    setIsAddOpen(false);
  };

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredient.trim()) return;
    addFridgeIngredient(newIngredient);
    setNewIngredient('');
  };

  const triggerAiDiet = async () => {
    setIsAiOpen(true);
    setAiLoading(true);
    setAiResult(null);
    setAiActiveTab('proposal_0');
    try {
      const response = await recommendDiet(
        fridgeIngredients,
        targetCalories,
        targetProtein,
        userProfile.mode,
        apiConfig
      );
      setAiResult(response);
    } catch (e: any) {
      console.error(e);
      // handled inside state
    } finally {
      setAiLoading(false);
    }
  };

  const openAddModal = (mealType: MealType) => {
    setActiveMealType(mealType);
    setAddMode(registeredMeals.length > 0 ? 'preset' : 'manual');
    setIsAddOpen(true);
  };

  const handleRegisterPresetFromAi = (meal: RecommendedMeal) => {
    registerMeal({
      name: meal.name,
      calories: meal.calories,
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
    });
    setRegisteredPresetNames(prev => ({ ...prev, [meal.name]: true }));
    setTimeout(() => {
      setRegisteredPresetNames(prev => ({ ...prev, [meal.name]: false }));
    }, 2000);
  };

  const getMealTypeName = (type: MealType) => {
    switch (type) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      case 'snack': return '간식';
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-800">
      {/* Mode Selector Toggle */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-sky-500" />
          <h2 className="text-sm font-bold text-slate-700">식단 기록 모드</h2>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-lg">
          <button
            onClick={() => {
              if (!isDetailed) toggleDietMode(todayStr);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              isDetailed
                ? 'bg-white text-sky-600 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            정밀 분석
          </button>
          <button
            onClick={() => {
              if (isDetailed) toggleDietMode(todayStr);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              !isDetailed
                ? 'bg-white text-sky-600 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            간편 단백질
          </button>
        </div>
      </div>

      {/* Main Intake Logging Block */}
      <div className="space-y-4">
        {isDetailed ? (
          /* Detailed Macro Logger */
          <div className="space-y-4">
            
            {/* COMPACT Daily totals display banner at the top */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 text-slate-700">
              <div className="grid grid-cols-4 gap-1 text-center divide-x divide-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">총 칼로리</span>
                  <span className="text-xs font-black text-slate-800 block">
                    {totalCal} <span className="text-[9px] font-normal text-slate-400">/ {Math.round(targetCalories)}</span>
                  </span>
                  <span className="text-[8px] text-slate-400 block font-medium">kcal</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">탄수화물</span>
                  <span className="text-xs font-extrabold text-slate-700 block">{totalCarb}</span>
                  <span className="text-[8px] text-slate-400 block font-medium">g</span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-500 font-bold block mb-0.5">단백질</span>
                  <span className="text-xs font-black text-sky-600 block">
                    {totalProt} <span className="text-[9px] font-normal text-slate-400">/ {Math.round(targetProtein)}</span>
                  </span>
                  <span className="text-[8px] text-sky-400 block font-medium">g</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">지방</span>
                  <span className="text-xs font-extrabold text-slate-700 block">{totalFat}</span>
                  <span className="text-[8px] text-slate-400 block font-medium">g</span>
                </div>
              </div>
            </div>

            {/* Meal Time Sections (아침, 점심, 저녁, 간식) */}
            <div className="space-y-4">
              {mealTypes.map((meal) => {
                const mealItems = todayDiet.items.filter(
                  (item) => (item.mealType || 'snack') === meal.id
                );
                const mealCalSum = mealItems.reduce((sum, item) => sum + item.calories, 0);
                const mealProtSum = mealItems.reduce((sum, item) => sum + item.protein, 0);

                return (
                  <div
                    key={meal.id}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3"
                  >
                    {/* Meal Time Header */}
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-800">{meal.label}</span>
                        {(mealCalSum > 0 || mealProtSum > 0) && (
                          <span className="text-[10px] font-bold text-slate-400">
                            ({mealCalSum} kcal | 단백질 {mealProtSum}g)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => openAddModal(meal.id)}
                        className="bg-sky-50 hover:bg-sky-100 text-sky-600 font-bold p-1 rounded-lg border border-sky-100 flex items-center justify-center ios-btn-press"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Meal Log List */}
                    <div className="space-y-2">
                      {mealItems.length > 0 ? (
                        mealItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 rounded-xl p-2.5 border border-slate-100 transition-all text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-700 block text-xs">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                탄 {item.carbs}g | 단 {item.protein}g | 지 {item.fat}g
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-slate-600">
                                {item.calories} kcal
                              </span>
                              <button
                                onClick={() => removeDietItem(todayStr, item.id)}
                                className="text-red-400 hover:text-red-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-[10px] text-slate-400 font-bold border border-dashed border-slate-100 rounded-xl">
                          등록된 {getMealTypeName(meal.id)} 식단이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Simple Protein Logger divided into categories */
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 space-y-4 py-6">
            <div className="text-center pb-2 border-b border-slate-50">
              <h2 className="text-xs font-bold text-slate-400 mb-1">오늘의 간편 단백질 총 섭취량</h2>
              <div className="flex justify-center items-baseline gap-1">
                <span className="text-3xl font-black text-sky-500 tracking-tight">
                  {todayDiet.simpleProtein || 0}
                </span>
                <span className="text-xs font-bold text-slate-400">/ {Math.round(targetProtein)}g</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {mealTypes.map((meal) => {
                const meals = todayDiet.simpleProteinMeals || { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
                const currentVal = meals[meal.id] || 0;

                return (
                  <div key={meal.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex justify-between items-center w-full sm:w-auto gap-4">
                      <span className="text-xs font-black text-slate-700">{meal.label}</span>
                      <span className="text-sm font-extrabold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                        {currentVal}g
                      </span>
                    </div>

                    {/* Numeric Increments Button Group */}
                    <div className="flex items-center gap-1.5 justify-end w-full sm:w-auto">
                      <button
                        onClick={() => updateSimpleProtein(todayStr, meal.id, Math.max(0, currentVal - 5))}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 ios-btn-press hover:bg-slate-50"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => updateSimpleProtein(todayStr, meal.id, Math.max(0, currentVal - 1))}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 ios-btn-press hover:bg-slate-50"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => updateSimpleProtein(todayStr, meal.id, currentVal + 1)}
                        className="px-2 py-1.5 bg-sky-50 border border-sky-100 rounded-lg text-[10px] font-bold text-sky-600 ios-btn-press hover:bg-sky-100"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => updateSimpleProtein(todayStr, meal.id, currentVal + 5)}
                        className="px-2.5 py-1.5 bg-sky-50 border border-sky-100 rounded-lg text-[10px] font-bold text-sky-600 ios-btn-press hover:bg-sky-100"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Refrigerator Inventory Section */}
      {isDetailed && (
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-50 pb-2">
            <Refrigerator className="w-5 h-5 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-700">우리 집 냉장고 보유 재료</h2>
          </div>

          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            냉장고 속에 가지고 계신 재료들을 등록해 두시면 이를 최우선으로 배치하는 식단 조합을 AI가 알아서 조율해 줍니다.
          </p>

          {/* Input box to add ingredient tags */}
          <form onSubmit={handleAddIngredient} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="재료 이름 입력 (예: 닭가슴살, 오이, 계란)"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 focus:bg-white"
            />
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-xl text-xs ios-btn-press"
            >
              추가
            </button>
          </form>

          {/* Ingredient tags */}
          <div className="flex flex-wrap gap-2">
            {fridgeIngredients.length > 0 ? (
              fridgeIngredients.map((ing) => (
                <span
                  key={ing}
                  className="bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-500 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-100 cursor-pointer flex items-center gap-1.5 transition-all"
                  onClick={() => removeFridgeIngredient(ing)}
                >
                  {ing}
                  <span className="text-[10px] opacity-60">&times;</span>
                </span>
              ))
            ) : (
              <div className="text-center py-4 w-full text-xs text-slate-400 font-semibold border border-dashed border-slate-100 rounded-xl">
                냉장고가 비어 있습니다. 재료를 등록해 보세요!
              </div>
            )}
          </div>

          {/* AI Diet suggestion trigger button */}
          <div className="mt-5 pt-3 border-t border-slate-50">
            <button
              onClick={triggerAiDiet}
              className="w-full bg-sky-500 text-white font-bold py-3 rounded-2xl text-xs ios-btn-press hover:bg-sky-600 flex items-center justify-center gap-2 shadow-sm shadow-sky-100"
            >
              <Sparkles className="w-4.5 h-4.5 fill-current" />
              AI 보유 재료 식단 추천 생성
            </button>
          </div>
        </div>
      )}

      {/* Add Food Modal Bottom Sheet */}
      <BottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={activeMealType ? `식사 등록 - ${getMealTypeName(activeMealType)}` : '식사 등록'}
      >
        <div className="space-y-4 font-sans text-xs">
          
          {/* Preset / Manual Tab selector */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl">
            <button
              onClick={() => setAddMode('preset')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                addMode === 'preset' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              자주 먹는 메뉴 선택
            </button>
            <button
              onClick={() => setAddMode('manual')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                addMode === 'manual' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              직접 메뉴 추가
            </button>
          </div>

          {addMode === 'preset' ? (
            /* PRESET MODE */
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 font-bold mb-2">
                아래 등록된 메뉴 목록에서 선택하시면 해당 식사 자리에 즉시 등록됩니다.
              </p>
              {registeredMeals.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                  {registeredMeals.map((preset) => (
                    <div
                      key={preset.name}
                      className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center hover:border-sky-300 hover:bg-sky-50/10 transition-all"
                    >
                      <div
                        onClick={() => handleSelectPreset(preset)}
                        className="flex-1 cursor-pointer select-none"
                      >
                        <span className="font-bold text-slate-700 block text-xs mb-0.5">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          {preset.calories} kcal | 탄 {preset.carbs}g | 단 {preset.protein}g | 지 {preset.fat}g
                        </span>
                      </div>
                      <button
                        onClick={() => removeRegisteredMeal(preset.name)}
                        className="text-slate-300 hover:text-red-500 p-1.5 transition-colors"
                        title="메뉴 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[11px] text-slate-400 font-bold border border-dashed border-slate-100 rounded-xl">
                  자주 먹는 메뉴로 등록된 항목이 없습니다.
                </div>
              )}
            </div>
          ) : (
            /* MANUAL MODE */
            <form onSubmit={handleAddFoodSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-500 mb-1">식품 / 음식 이름 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: 간장계란밥"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">칼로리 (kcal)</label>
                  <input
                    type="number"
                    placeholder="예: 320"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-center focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">단백질 (g)</label>
                  <input
                    type="number"
                    placeholder="예: 25"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-center focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">탄수화물 (g)</label>
                  <input
                    type="number"
                    placeholder="예: 45"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-center focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">지방 (g)</label>
                  <input
                    type="number"
                    placeholder="예: 8"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-center focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Checkbox to register as preset */}
              <div className="flex items-center gap-2 py-1 bg-slate-50 px-3 rounded-xl border border-slate-100">
                <input
                  type="checkbox"
                  id="chk-preset"
                  checked={registerAsPreset}
                  onChange={(e) => setRegisterAsPreset(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500 accent-sky-500"
                />
                <label htmlFor="chk-preset" className="text-[10px] text-slate-600 font-extrabold cursor-pointer select-none">
                  🌟 이 음식을 '자주 먹는 메뉴' 리스트에 함께 등록합니다.
                </label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-sky-500 text-white font-bold py-3.5 rounded-xl text-xs ios-btn-press hover:bg-sky-600 shadow-sm"
                >
                  식품 등록 완료
                </button>
              </div>
            </form>
          )}
        </div>
      </BottomSheet>

      {/* AI Recommendation Sheet */}
      <BottomSheet isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} title="AI 보유 재료 식단 추천">
        <div className="space-y-4 font-sans text-xs">
          {aiLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-semibold">
                냉장고를 분석하여 레시피를 집필하고 있습니다...
              </p>
            </div>
          ) : aiResult ? (
            <div className="space-y-4">
              
              {/* Tab Selector inside AI modal */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setAiActiveTab('proposal_0')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    aiActiveTab === 'proposal_0' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  식단 1
                </button>
                <button
                  onClick={() => setAiActiveTab('proposal_1')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    aiActiveTab === 'proposal_1' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  식단 2
                </button>
                <button
                  onClick={() => setAiActiveTab('comments')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    aiActiveTab === 'comments' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  영양 지침
                </button>
                <button
                  onClick={() => setAiActiveTab('nagging')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    aiActiveTab === 'nagging' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  😈 훈수
                </button>
              </div>

              {/* Offline key warning banner */}
              {!apiConfig.key && (
                <div className="bg-amber-50 text-amber-700 p-2.5 rounded-xl border border-amber-100 flex items-start gap-2 text-[10px]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    API 키가 미등록되어 기기에 탑재된 **벌크업 모의 식단**이 표시됩니다. 설정 탭에서 API 키를 등록하면 현재 보유 재료에 완전히 밀착된 식단이 생성됩니다.
                  </p>
                </div>
              )}

              {/* Render dynamic subviews based on active tab */}
              <div className="space-y-3 min-h-[300px] overflow-y-auto no-scrollbar max-h-[50vh] pr-1">
                {(aiActiveTab === 'proposal_0' || aiActiveTab === 'proposal_1') && (
                  <div className="space-y-3">
                    {/* Proposal Title */}
                    <div className="bg-sky-50 text-sky-700 font-bold p-3 rounded-xl border border-sky-100 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 fill-current" />
                      <span>
                        {aiResult.proposals[aiActiveTab === 'proposal_0' ? 0 : 1]?.title}
                      </span>
                    </div>

                    {/* Meal Cards */}
                    {aiResult.proposals[aiActiveTab === 'proposal_0' ? 0 : 1]?.meals.map((meal, mIdx) => {
                      const isRegistered = !!registeredPresetNames[meal.name];

                      return (
                        <div
                          key={mIdx}
                          className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs space-y-2 relative"
                        >
                          {/* Card Header (Meal Time & Register Button) */}
                          <div className="flex justify-between items-center">
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-md">
                              {meal.mealTime}
                            </span>
                            <button
                              onClick={() => handleRegisterPresetFromAi(meal)}
                              disabled={isRegistered}
                              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${
                                isRegistered
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'bg-sky-50 border-sky-100 text-sky-600 hover:bg-sky-100 ios-btn-press'
                              }`}
                            >
                              {isRegistered ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  등록 완료
                                  </>
                              ) : (
                                <>
                                  <Heart className="w-3 h-3 fill-current" />
                                  자주 먹는 메뉴로 등록
                                </>
                              )}
                            </button>
                          </div>

                          {/* Meal Title & Details */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{meal.name}</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">
                              🍽️ {meal.amount}
                            </p>
                          </div>

                          {/* Macro Badges */}
                          <div className="grid grid-cols-4 gap-1.5 text-center bg-slate-50 rounded-lg p-2 text-[9px] font-bold">
                            <div>
                              <span className="text-slate-400 block mb-0.5">칼로리</span>
                              <span className="text-amber-600 block">{meal.calories} kcal</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">탄수화물</span>
                              <span className="text-slate-700 block">{meal.carbs}g</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">단백질</span>
                              <span className="text-sky-600 block">{meal.protein}g</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">지방</span>
                              <span className="text-slate-700 block">{meal.fat}g</span>
                            </div>
                          </div>

                          {/* Extras */}
                          {meal.extra && (
                            <p className="text-[10px] text-slate-400 leading-normal pt-1.5 border-t border-slate-50 flex items-start gap-1">
                              <span>💡</span>
                              <span>{meal.extra}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {aiActiveTab === 'comments' && (
                  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-sky-500" />
                      영양사 권장 지침
                    </h3>
                    <ul className="space-y-2">
                      {aiResult.comments.map((comment, cIdx) => (
                        <li
                          key={cIdx}
                          className="text-[11px] text-slate-600 leading-relaxed pl-4 relative before:content-['✓'] before:absolute before:left-0 before:text-sky-500 before:font-bold"
                        >
                          {comment}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiActiveTab === 'nagging' && (
                  <div className="space-y-4">
                    {/* speech bubble for nagging */}
                    <div className="flex gap-3 items-start bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs">
                      <div className="flex flex-col items-center gap-1 shrink-0 animate-coach-float">
                        <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center border border-sky-200 shadow-sm relative text-xl">
                          <span>😈</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">훈수 관장</span>
                      </div>
                      
                      <div className="flex-1 relative bg-slate-50 rounded-xl p-3 border border-slate-100">
                        {/* speech bubble arrow */}
                        <div className="absolute top-4 -left-1.5 w-3 h-3 bg-slate-50 border-b border-l border-slate-100 rotate-45" />
                        <p className="text-[11px] font-extrabold text-slate-600 leading-relaxed">
                          "{aiResult.nagging}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsAiOpen(false)}
                className="w-full bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl text-xs ios-btn-press hover:bg-slate-200 mt-2"
              >
                확인 및 닫기
              </button>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-slate-400 font-semibold">
              추천 결과를 가져오지 못했습니다. 다시 시도해 주세요.
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};
