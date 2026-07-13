import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { WorkoutExercise, WorkoutSet } from '../context/AppContext';
import { BottomSheet } from './BottomSheet';
import { parseYoutubeRoutine } from '../utils/ai';
import { Dumbbell, Plus, RefreshCw, CheckCircle, Info, Sparkles } from 'lucide-react';

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.522 3.536 12 3.536 12 3.536s-7.522 0-9.388.52A3.003 3.003 0 0 0 .502 6.163C0 8.03 0 12 0 12s0 3.97.502 5.837a3.003 3.003 0 0 0 2.11 2.107c1.866.52 9.388.52 9.388.52s7.522 0 9.388-.52a3.003 3.003 0 0 0 2.11-2.107C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export const WorkoutTab: React.FC = () => {
  const {
    apiConfig,
    workoutLogs,
    currentRoutine,
    userProfile,
    generateAutoRoutine,
    saveCustomRoutine,
    saveWorkoutLog,
    completeWorkout,
  } = useApp();

  const [isYoutubeOpen, setIsYoutubeOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeContext, setYoutubeContext] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [customExName, setCustomExName] = useState('');
  const [customExSets, setCustomExSets] = useState('4');
  const [customExReps, setCustomExReps] = useState('10');
  const [customExNotes, setCustomExNotes] = useState('');

  // Get current date string (local)
  const getTodayStr = () => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayStr();
  const todayLog = workoutLogs[todayStr];
  const workoutCompleted = todayLog?.completed || false;

  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

  // Initialize today's exercises state from log, or from currentRoutine, or empty
  useEffect(() => {
    if (todayLog && todayLog.exercises.length > 0) {
      setExercises(todayLog.exercises);
    } else if (currentRoutine) {
      const initial: WorkoutExercise[] = currentRoutine.exercises.map((ex) => {
        let defaultWeight = 20;
        const nameLower = ex.name.toLowerCase();
        if (nameLower.includes('스쿼트') || nameLower.includes('squat') || nameLower.includes('데드리프트') || nameLower.includes('deadlift')) {
          defaultWeight = 40;
        } else if (nameLower.includes('스미스') || nameLower.includes('smith') || nameLower.includes('바벨') || nameLower.includes('barbell')) {
          defaultWeight = nameLower.includes('벤치') || nameLower.includes('bench') ? 60 : 50;
        } else if (nameLower.includes('벤치') || nameLower.includes('bench')) {
          defaultWeight = nameLower.includes('덤벨') || nameLower.includes('dumbbell') ? 22 : 30;
        } else if (nameLower.includes('덤벨') || nameLower.includes('dumbbell')) {
          defaultWeight = 16;
        } else if (nameLower.includes('케이블') || nameLower.includes('cable') || nameLower.includes('머신') || nameLower.includes('machine')) {
          defaultWeight = 25;
        }
        if (userProfile.mode === 'bulk') defaultWeight += 15;
        if (userProfile.mode === 'cut') defaultWeight -= 5;
        
        return {
          name: ex.name,
          notes: ex.notes,
          sets: Array.from({ length: ex.sets }, () => ({
            weight: defaultWeight,
            reps: ex.reps,
            completed: false,
          })),
        };
      });
      setExercises(initial);
    } else {
      setExercises([]);
    }
  }, [todayLog, currentRoutine, todayStr]);

  // Synchronize state changes back to context logs
  const syncWorkoutLog = (updatedExercises: WorkoutExercise[]) => {
    setExercises(updatedExercises);
    saveWorkoutLog(todayStr, {
      completed: workoutCompleted,
      exercises: updatedExercises,
    });
  };

  const handleSetChange = (exIdx: number, setIdx: number, field: keyof WorkoutSet, val: any) => {
    const updated = [...exercises];
    updated[exIdx].sets[setIdx] = {
      ...updated[exIdx].sets[setIdx],
      [field]: val,
    };
    syncWorkoutLog(updated);
  };

  const handleToggleSet = (exIdx: number, setIdx: number) => {
    const updated = [...exercises];
    const targetSet = updated[exIdx].sets[setIdx];
    updated[exIdx].sets[setIdx] = {
      ...targetSet,
      completed: !targetSet.completed,
    };
    syncWorkoutLog(updated);
  };

  const handleAddCustomExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customExName.trim()) return;

    const newEx: WorkoutExercise = {
      name: customExName,
      notes: customExNotes,
      sets: Array.from({ length: parseInt(customExSets) || 4 }, () => ({
        weight: 20,
        reps: parseInt(customExReps) || 10,
        completed: false,
      })),
    };

    const updated = [...exercises, newEx];
    syncWorkoutLog(updated);

    // Reset Form
    setCustomExName('');
    setCustomExSets('4');
    setCustomExReps('10');
    setCustomExNotes('');
    setIsAddExerciseOpen(false);
  };

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setYoutubeLoading(true);
    try {
      const parsedRoutine = await parseYoutubeRoutine(youtubeUrl, youtubeContext, apiConfig);
      saveCustomRoutine(parsedRoutine);
      setYoutubeUrl('');
      setYoutubeContext('');
      setIsYoutubeOpen(false);
      alert(`"${parsedRoutine.name}" 루틴이 성공적으로 생성 및 활성화되었습니다!`);
    } catch (err: any) {
      alert(`루틴 추출 실패: ${err.message}`);
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleCompleteWorkoutToggle = () => {
    completeWorkout(todayStr, !workoutCompleted);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-800">
      {/* Program Config Card */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
        {!currentRoutine ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-3">
              <Dumbbell className="w-6 h-6 text-sky-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">맞춤형 운동 프로그램 생성</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              사용자 신체 스펙, 훈련 강도 및 인바디 데이터에 최적화된 기초 다관절 운동 루틴을 생성합니다.
            </p>
            <button
              onClick={generateAutoRoutine}
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs ios-btn-press shadow-xs"
            >
              인바디 보정 프로그램 자동 생성
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-sky-500 font-bold block">활성화된 트레이닝 루틴</span>
                <h3 className="text-sm font-extrabold text-slate-800 leading-tight">
                  {currentRoutine.name}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generateAutoRoutine}
                  className="bg-slate-50 text-slate-500 font-bold p-2 rounded-xl border border-slate-100 flex items-center justify-center ios-btn-press"
                  title="루틴 재설정"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsYoutubeOpen(true)}
                  className="bg-red-50 text-red-500 font-bold px-3 py-2 rounded-xl text-xs border border-red-100 flex items-center justify-center gap-1 ios-btn-press"
                >
                  <YoutubeIcon className="w-3.5 h-3.5" />
                  유튜브 연동
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl flex items-start gap-1.5 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>
                오늘 완료 체크한 운동 리스트는 로컬 다이어리에 기록되며 훈수충 AI 엔진이 식단 섭취량과 결합 분석하여 다음 훈수를 정밀 처방합니다.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Routine list and Tracker */}
      {currentRoutine && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-slate-700">오늘의 운동 목표 세트</h2>
            <button
              onClick={() => setIsAddExerciseOpen(true)}
              className="bg-sky-50 text-sky-600 font-bold px-3 py-1.5 rounded-xl border border-sky-100 text-xs flex items-center gap-1 ios-btn-press"
            >
              <Plus className="w-3.5 h-3.5" />
              종목 추가
            </button>
          </div>

          <div className="space-y-4">
            {exercises.length > 0 ? (
              exercises.map((ex, exIdx) => (
                <div key={exIdx} className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">{ex.name}</h3>
                      {ex.notes && (
                        <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">
                          💡 {ex.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sets mapping */}
                  <div className="space-y-2 border-t border-slate-50 pt-3">
                    <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 text-center pb-1">
                      <span className="col-span-2">세트</span>
                      <span className="col-span-4">중량 (kg)</span>
                      <span className="col-span-4">반복 (회)</span>
                      <span className="col-span-2">완료</span>
                    </div>

                    {ex.sets.map((set, setIdx) => (
                      <div
                        key={setIdx}
                        className={`grid grid-cols-12 gap-1 items-center py-1.5 rounded-xl px-1 text-center transition-all ${
                          set.completed ? 'bg-sky-50/30' : 'bg-slate-50/50'
                        }`}
                      >
                        <span className="col-span-2 text-xs font-bold text-slate-400">
                          {setIdx + 1}
                        </span>
                        
                        {/* Weight input */}
                        <div className="col-span-4 flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            value={set.weight}
                            onChange={(e) =>
                              handleSetChange(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)
                            }
                            disabled={set.completed}
                            className="w-12 bg-white border border-slate-100 rounded-lg text-center text-xs font-bold py-1 focus:outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>

                        {/* Reps input */}
                        <div className="col-span-4 flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            value={set.reps}
                            onChange={(e) =>
                              handleSetChange(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)
                            }
                            disabled={set.completed}
                            className="w-12 bg-white border border-slate-100 rounded-lg text-center text-xs font-bold py-1 focus:outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>

                        {/* Complete Checkbox */}
                        <div className="col-span-2 flex justify-center">
                          <button
                            onClick={() => handleToggleSet(exIdx, setIdx)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                              set.completed
                                ? 'bg-sky-500 border-sky-500 text-white shadow-xs shadow-sky-100'
                                : 'bg-white border-slate-300 text-transparent hover:border-sky-400'
                            }`}
                          >
                            ✓
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400">
                훈련 리스트가 구성되지 않았습니다.
              </div>
            )}
          </div>

          {/* Today's Workout Complete Button */}
          {exercises.length > 0 && (
            <div className="pt-4">
              <button
                onClick={handleCompleteWorkoutToggle}
                className={`w-full font-bold py-3.5 rounded-2xl text-xs ios-btn-press flex items-center justify-center gap-2 transition-all shadow-sm ${
                  workoutCompleted
                    ? 'bg-sky-500 text-white shadow-sky-100'
                    : 'bg-white text-sky-500 border border-sky-200'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {workoutCompleted ? '오늘 운동 기록 완료됨! 훈수충 체크' : '오늘 운동 완료 체크하기'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* YouTube Routine Parser Modal */}
      <BottomSheet isOpen={isYoutubeOpen} onClose={() => setIsYoutubeOpen(false)} title="유튜브 루틴 AI 추출기">
        <form onSubmit={handleYoutubeSubmit} className="space-y-4 font-sans text-xs">
          {!apiConfig.key && (
            <div className="bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-100 flex items-start gap-2 mb-1">
              <Sparkles className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed">
                API Key가 없어도 서버 프록시를 통해 AI 분석을 시도합니다. 정확도를 높이려면 영상 자막이나 설명을 함께 붙여넣어 주세요. 영상 제목은 URL 입력 시 자동으로 가져옵니다.
              </p>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-500 mb-1">유튜브 동영상 링크 (URL) *</label>
            <input
              type="url"
              required
              placeholder="예: https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-500 mb-1">자막 복사본 또는 주요 멘트/설명 (권장)</label>
            <textarea
              rows={4}
              placeholder="영상 자막, 설명란, 또는 운동 멘트를 붙여넣어 주세요. 예: '인클라인 덤벨 프레스 4세트 10회', '스미스 머신 벤치프레스'. 장비(바벨/덤벨/스미스), 각도(플랫/인클라인)를 포함할수록 정확도가 크게 올라갑니다."
              value={youtubeContext}
              onChange={(e) => setYoutubeContext(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 focus:bg-white resize-none"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={youtubeLoading}
              className="w-full bg-sky-500 text-white font-bold py-3.5 rounded-xl text-xs ios-btn-press hover:bg-sky-600 flex items-center justify-center gap-2"
            >
              {youtubeLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  유튜브에서 루틴 추출 중...
                </>
              ) : (
                '루틴 추출 및 등록 시작'
              )}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Add Custom Exercise Bottom Sheet */}
      <BottomSheet isOpen={isAddExerciseOpen} onClose={() => setIsAddExerciseOpen(false)} title="운동 종목 수동 추가">
        <form onSubmit={handleAddCustomExerciseSubmit} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-bold text-slate-500 mb-1">운동 이름 *</label>
            <input
              type="text"
              required
              placeholder="예: 바벨 바이셉스 컬 - Bicep Curl"
              value={customExName}
              onChange={(e) => setCustomExName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-500 mb-1">수행 세트수</label>
              <input
                type="number"
                value={customExSets}
                onChange={(e) => setCustomExSets(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-center focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 mb-1">세트당 타겟 반복수 (회)</label>
              <input
                type="number"
                value={customExReps}
                onChange={(e) => setCustomExReps(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-center focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-500 mb-1">참고 메모 / 팁</label>
            <input
              type="text"
              placeholder="예: 수축 지점에서 1초 홀딩"
              value={customExNotes}
              onChange={(e) => setCustomExNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-sky-500 text-white font-bold py-3.5 rounded-xl text-xs ios-btn-press hover:bg-sky-600 shadow-sm"
            >
              종목 추가 완료
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
