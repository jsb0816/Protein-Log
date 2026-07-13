import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProgressBar } from './ProgressBar';
import { getBackseatCoachFeedback, getLocalCoachFeedback } from '../utils/ai';
import { Dumbbell, Calendar, Info, RefreshCw, Sparkles, Flame, Shield } from 'lucide-react';

export const DashboardTab: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const {
    userProfile,
    apiConfig,
    dietLogs,
    workoutLogs,
    currentRoutine,
    targetCalories,
    targetProtein,
    bmr,
    tdee,
    isHighMuscle,
    isHighBodyFat,
    isLowBodyFat,
    completeWorkout,
  } = useApp();

  const [coachFeedback, setCoachFeedback] = useState<string>('');
  const [loadingFeedback, setLoadingFeedback] = useState<boolean>(false);

  // Get current date string
  const getTodayStr = () => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayStr();

  // Calculate today's intake
  const todayDiet = dietLogs[todayStr] || { mode: 'detailed', items: [], simpleProtein: 0 };
  const isDetailed = todayDiet.mode === 'detailed';

  const todayCal = isDetailed
    ? todayDiet.items.reduce((sum, item) => sum + item.calories, 0)
    : 0;

  const todayPro = isDetailed
    ? todayDiet.items.reduce((sum, item) => sum + item.protein, 0)
    : todayDiet.simpleProtein || 0;

  // Calculate workout status
  const todayWorkout = workoutLogs[todayStr];
  const workoutCompleted = todayWorkout?.completed || false;

  // Cache & load coach feedback
  const getFeedbackHash = () => {
    return `${todayCal}_${todayPro}_${workoutCompleted ? '1' : '0'}_${userProfile.mode}_${userProfile.weight}`;
  };

  const fetchFeedback = async (forceApi = false) => {
    setLoadingFeedback(true);
    const hash = getFeedbackHash();
    
    // Check cache
    if (!forceApi) {
      const cached = localStorage.getItem(`pl_coach_cache_${todayStr}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.hash === hash) {
            setCoachFeedback(parsed.feedback);
            setLoadingFeedback(false);
            return;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    try {
      let text = '';
      if (forceApi && apiConfig.key) {
        text = await getBackseatCoachFeedback(
          { ...userProfile, targetCalories, targetProtein },
          todayCal,
          todayPro,
          workoutCompleted,
          apiConfig
        );
      } else {
        // Fallback to local logic immediately if not forced or no api key
        text = getLocalCoachFeedback(
          { ...userProfile, targetCalories, targetProtein },
          todayCal,
          todayPro,
          workoutCompleted
        );
      }

      setCoachFeedback(text);
      localStorage.setItem(
        `pl_coach_cache_${todayStr}`,
        JSON.stringify({ feedback: text, hash })
      );
    } catch (err) {
      console.error(err);
      // Fallback
      setCoachFeedback(getLocalCoachFeedback(
        { ...userProfile, targetCalories, targetProtein },
        todayCal,
        todayPro,
        workoutCompleted
      ));
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Load feedback on load / change
  useEffect(() => {
    fetchFeedback(false);
  }, [todayCal, todayPro, workoutCompleted, userProfile.mode, userProfile.weight]);

  const toggleWorkout = () => {
    completeWorkout(todayStr, !workoutCompleted);
  };

  // Format mode names in Korean
  const modeNames = {
    maintain: '유지어터',
    leanmass: '린매스업',
    bulk: '벌크업',
    cut: '컷팅'
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-800">
      {/* Date Header */}
      <div className="flex justify-between items-center bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-500" />
          <span className="text-sm font-bold text-slate-600">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </span>
        </div>
        <span className="bg-sky-50 text-sky-600 text-xs font-bold px-3 py-1 rounded-full border border-sky-100">
          {modeNames[userProfile.mode]} 모드
        </span>
      </div>

      {/* 훈수충 Coach Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 relative overflow-hidden">
        {/* Sky-Blue Glow Effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-200/20 rounded-full blur-3xl -z-0" />
        
        <div className="flex gap-4 items-start relative z-10">
          {/* Trainer Avatar */}
          <div className="flex flex-col items-center gap-1 shrink-0 animate-coach-float">
            <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center border-2 border-sky-200 shadow-sm relative">
              <span className="text-3xl">💪</span>
              <div className="absolute -bottom-1 -right-1 bg-sky-500 text-white rounded-full p-0.5 border border-white">
                <Shield className="w-3 h-3 fill-current" />
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 mt-1">훈수 관장</span>
          </div>

          {/* Speech Bubble */}
          <div className="flex-1 space-y-2">
            <div className="relative bg-slate-50 rounded-2xl p-4 border border-slate-100">
              {/* Arrow */}
              <div className="absolute top-6 -left-2 w-4 h-4 bg-slate-50 border-b border-l border-slate-100 rotate-45" />
              
              {loadingFeedback ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                  훈수충이 회원을 스캔하는 중...
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                  "{coachFeedback}"
                </p>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-medium">
                {apiConfig.key ? '✨ AI 훈수 모드 활성' : '📱 로컬 잔소리 엔진 작동 중'}
              </span>
              {apiConfig.key && (
                <button
                  onClick={() => fetchFeedback(true)}
                  disabled={loadingFeedback}
                  className="flex items-center gap-1 text-xs font-bold text-sky-500 hover:text-sky-600 ios-btn-press disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  실시간 AI 훈수 갱신
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calories & Protein Ring Gauges */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100">
        <h2 className="text-md font-bold text-slate-800 mb-6 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          오늘 영양 섭취 달성률
        </h2>

        {isDetailed ? (
          <div className="grid grid-cols-2 gap-4">
            <ProgressBar
              value={todayCal}
              max={targetCalories}
              label="칼로리"
              unit="kcal"
              colorClass="text-amber-500"
            />
            <ProgressBar
              value={todayPro}
              max={targetProtein}
              label="단백질"
              unit="g"
              colorClass="text-sky-500"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center py-2">
            <ProgressBar
              value={todayPro}
              max={targetProtein}
              label="단백질"
              unit="g"
              colorClass="text-sky-500"
              size={160}
            />
            <p className="text-xs text-slate-400 mt-4 text-center leading-relaxed">
              현재 **간편 모드**로 단백질 섭취량만 집계하고 있습니다.<br />
              칼로리 및 탄단지 정밀 분석을 원하시면 **식단 기록** 탭에서 **정밀 모드**로 변경하세요.
            </p>
          </div>
        )}
      </div>

      {/* Today's Workout Card */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
              <Dumbbell className="w-4.5 h-4.5 text-sky-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">오늘의 운동</h3>
              <p className="text-[11px] font-medium text-slate-400">
                {currentRoutine ? currentRoutine.name : '설정된 루틴 없음'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleWorkout}
            className={`px-4 py-2 rounded-xl text-xs font-bold ios-btn-press border transition-all ${
              workoutCompleted
                ? 'bg-sky-500 border-sky-500 text-white shadow-xs shadow-sky-100'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {workoutCompleted ? '완료됨' : '완료하기'}
          </button>
        </div>

        {currentRoutine ? (
          <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600">
              총 {currentRoutine.exercises.length}개 종목 대기 중
            </span>
            <button
              onClick={() => setActiveTab('workout')}
              className="font-bold text-sky-500 hover:text-sky-600"
            >
              운동 일지 바로가기 &rarr;
            </button>
          </div>
        ) : (
          <div className="text-center py-4 border border-dashed border-slate-200 rounded-xl">
            <p className="text-xs text-slate-400 mb-2">오늘 설정된 운동 프로그램이 없습니다.</p>
            <button
              onClick={() => setActiveTab('workout')}
              className="text-xs font-bold text-sky-500 hover:underline"
            >
              루틴 생성하러 가기
            </button>
          </div>
        )}
      </div>

      {/* Scientific Specs Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
          <Info className="w-4.5 h-4.5 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-800">스펙 및 공식 대사량 산출</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 block font-medium">BMR (기초대사량)</span>
            <span className="font-bold text-slate-700">{Math.round(bmr)} kcal</span>
            <span className="text-[9px] text-slate-400 block leading-tight">
              {userProfile.inbody.bodyFat !== undefined
                ? '제지방량 기반 캐치-맥아들 공식'
                : '성별/연령 기반 미플린 공식'}
            </span>
          </div>

          <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 block font-medium">TDEE (활동대사량)</span>
            <span className="font-bold text-slate-700">{Math.round(tdee)} kcal</span>
            <span className="text-[9px] text-slate-400 block leading-tight">
              활동 지수 ({userProfile.activityLevel}) 적용 완료
            </span>
          </div>
        </div>

        {/* Inbody Badges */}
        {(isHighMuscle || isHighBodyFat || isLowBodyFat || userProfile.inbody.muscleMass) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-50">
            {userProfile.inbody.muscleMass && (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md">
                골격근량: {userProfile.inbody.muscleMass}kg ({Math.round(userProfile.inbody.muscleMass / userProfile.weight * 100)}%)
              </span>
            )}
            {userProfile.inbody.bodyFat && (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md">
                체지방률: {userProfile.inbody.bodyFat}%
              </span>
            )}
            {isHighMuscle && (
              <span className="bg-sky-50 text-sky-600 text-[10px] font-bold px-2 py-1 rounded-md border border-sky-100">
                💪 근육량 표준 이상 (단백질 상한 고정)
              </span>
            )}
            {isHighBodyFat && (
              <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-100">
                ⚠️ 체지방 표준 이상 (식단 모니터링 강화)
              </span>
            )}
            {isLowBodyFat && userProfile.mode === 'bulk' && (
              <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-md border border-green-100">
                🎯 체지방 슬림 (벌크 가속 적극 권장)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
