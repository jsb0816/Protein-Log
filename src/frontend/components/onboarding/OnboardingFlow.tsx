import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export const OnboardingFlow: React.FC = () => {
  const { updateProfile } = useApp();
  const [onboardStep, setOnboardStep] = useState(1);
  const [oGender, setOGender] = useState<'male' | 'female'>('male');
  const [oAge, setOAge] = useState<number>(26);
  const [oHeight, setOHeight] = useState<number>(175);
  const [oWeight, setOWeight] = useState<number>(70);
  const [oActivity, setOActivity] = useState<1.2 | 1.375 | 1.55 | 1.725>(1.375);
  const [oMode, setOMode] = useState<'maintain' | 'leanmass' | 'bulk' | 'cut'>('maintain');
  const [oMuscle, setOMuscle] = useState<string>('');
  const [oFat, setOFat] = useState<string>('');

  const handleOnboardFinish = () => {
    updateProfile({
      gender: oGender,
      age: oAge,
      height: oHeight,
      weight: oWeight,
      activityLevel: oActivity,
      mode: oMode,
      inbody: {
        muscleMass: oMuscle ? parseFloat(oMuscle) : undefined,
        bodyFat: oFat ? parseFloat(oFat) : undefined,
      },
      isOnboarded: true,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-white p-6 justify-between h-full font-sans text-slate-800">
      {/* Step Indicator */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs font-bold text-slate-400">온보딩 질문 ({onboardStep}/4)</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === onboardStep ? 'w-6 bg-sky-500' : 'w-2 bg-slate-100'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {onboardStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">
                회원님의 신체 정보와 스펙을 입력해주세요
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-1">기초대사량과 맞춤형 단백질 섭취량 계산에 활용됩니다.</p>
            </div>

            <div className="space-y-4">
              {/* Gender toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <span className="text-sm font-bold text-slate-500 pl-2">성별</span>
                <div className="flex bg-slate-100 p-0.5 rounded-xl">
                  <button
                    onClick={() => setOGender('male')}
                    className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
                      oGender === 'male' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    남성
                  </button>
                  <button
                    onClick={() => setOGender('female')}
                    className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
                      oGender === 'female' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    여성
                  </button>
                </div>
              </div>

              {/* Age, Height, Weight */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 text-center">나이 (세)</label>
                  <input
                    type="number"
                    value={oAge || ''}
                    onChange={(e) => setOAge(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-center text-sm font-bold focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 text-center">키 (cm)</label>
                  <input
                    type="number"
                    value={oHeight || ''}
                    onChange={(e) => setOHeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-center text-sm font-bold focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 text-center">몸무게 (kg)</label>
                  <input
                    type="number"
                    value={oWeight || ''}
                    onChange={(e) => setOWeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-center text-sm font-bold focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {onboardStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">
                평소 활동 등급을 선택하세요
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-1">대사 활동 에너지를 정밀 유추하는 공식에 적용됩니다.</p>
            </div>

            <div className="space-y-3">
              {[
                { val: 1.2, name: '비활동적', desc: '대부분 앉아서 생활하며 정기적 운동 없음' },
                { val: 1.375, name: '가벼운 활동', desc: '주 1~3회 가벼운 근력/유산소 수행' },
                { val: 1.55, name: '보통 활동', desc: '주 3~5회 중간 강도 이상 정기적 트레이닝' },
                { val: 1.725, name: '매우 활동적', desc: '주 6~7회 하드코어 체육관 트레이닝 및 운동선수급' },
              ].map((act) => (
                <button
                  key={act.val}
                  onClick={() => setOActivity(act.val as any)}
                  className={`w-full text-left p-4 rounded-2xl border text-sm font-semibold flex flex-col gap-1 transition-all ${
                    oActivity === act.val
                      ? 'bg-sky-50 border-sky-500 text-sky-700'
                      : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold">{act.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{act.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {onboardStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">
                목표로 하는 신체 케어 모드는?
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-1">선택 모드에 따라 목표 단백질량과 칼로리 처방이 변경됩니다.</p>
            </div>

            <div className="space-y-3">
              {[
                { val: 'maintain', name: '유지어터', desc: '체중 및 근육 유지 (단백질: 체중 x 1.2~1.6g, 칼로리: TDEE)' },
                { val: 'leanmass', name: '린매스업', desc: '체지방 억제 및 데피니션 근성장 (단백질: 체중 x 1.8~2.2g, 칼로리: TDEE+250)' },
                { val: 'bulk', name: '벌크업', desc: '중량 및 근골격 벌크 증가 (단백질: 체중 x 2.0~2.4g, 칼로리: TDEE+500)' },
                { val: 'cut', name: '컷팅 (다이어트)', desc: '지방 활활 감량 및 데피니션 보존 (단백질: 체중 x 1.6~2.0g, 칼로리: TDEE-500)' },
              ].map((m) => (
                <button
                  key={m.val}
                  onClick={() => setOMode(m.val as any)}
                  className={`w-full text-left p-4 rounded-2xl border text-sm font-semibold flex flex-col gap-1 transition-all ${
                    oMode === m.val
                      ? 'bg-sky-50 border-sky-500 text-sky-700'
                      : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold">{m.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {onboardStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">
                인바디 데이터 보정하기
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-1">선택 사항입니다. 미입력 시 미플린 공식으로 계산됩니다.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 text-center">골격근량 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="예: 32.5"
                  value={oMuscle}
                  onChange={(e) => setOMuscle(e.target.value)}
                  className="w-full bg-white border border-slate-100 rounded-xl px-3 py-3 text-center text-sm font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 text-center">체지방률 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="예: 16.5"
                  value={oFat}
                  onChange={(e) => setOFat(e.target.value)}
                  className="w-full bg-white border border-slate-100 rounded-xl px-3 py-3 text-center text-sm font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal text-center bg-slate-50 p-2.5 rounded-xl">
              💡 골격근량이 기준 수치 이상이면 단백질 목표치가 최대로 잡히며, 체지방률이 낮으면 벌크업 부스터 훈수를 출력합니다!
            </p>
          </div>
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
        {onboardStep > 1 && (
          <button
            onClick={() => setOnboardStep((prev) => prev - 1)}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 ios-btn-press"
          >
            <ChevronLeft className="w-4 h-4" />
            이전 질문
          </button>
        )}

        {onboardStep < 4 ? (
          <button
            onClick={() => setOnboardStep((prev) => prev + 1)}
            className="flex-2 bg-sky-500 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 ios-btn-press hover:bg-sky-600 shadow-sm"
          >
            다음 단계로
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleOnboardFinish}
            className="flex-2 bg-sky-500 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 ios-btn-press hover:bg-sky-600 shadow-sm"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            프로그램 매칭 및 시작
          </button>
        )}
      </div>
    </div>
  );
};
