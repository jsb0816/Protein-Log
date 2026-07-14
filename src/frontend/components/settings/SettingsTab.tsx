import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { UserProfile, ApiConfig } from '../../context/AppContext';
import { User, Activity, Award, Key, RefreshCw, Eye, EyeOff } from 'lucide-react';

export const SettingsTab: React.FC = () => {
  const { userProfile, apiConfig, updateProfile, updateApiConfig, resetAllData } = useApp();
  const [showKey, setShowKey] = useState(false);

  const handleProfileChange = (key: keyof UserProfile, value: any) => {
    updateProfile({ [key]: value });
  };

  const handleInbodyChange = (key: 'muscleMass' | 'bodyFat', value: string) => {
    const numVal = value === '' ? undefined : parseFloat(value);
    updateProfile({
      inbody: {
        ...userProfile.inbody,
        [key]: numVal,
      },
    });
  };

  const handleApiChange = (key: keyof ApiConfig, value: string) => {
    updateApiConfig({
      ...apiConfig,
      [key]: value,
    });
  };

  const activityLabels = {
    1.2: '비활동적 (운동 안함)',
    1.375: '가벼운 활동 (주 1-3회 운동)',
    1.55: '보통 활동 (주 3-5회 운동)',
    1.725: '매우 활동적 (주 6-7회 고강도)',
  };

  const modeLabels = {
    maintain: '유지어터 (체중 유지)',
    leanmass: '린매스업 (체지방 억제+근성장)',
    bulk: '벌크업 (근육량+체중 증가)',
    cut: '컷팅 (체지방 감량+근보존)',
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-800">
      {/* Profile Section */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
          <User className="w-5 h-5 text-sky-500" />
          <h2 className="text-lg font-bold text-slate-800">신체 정보 설정</h2>
        </div>
        
        <div className="space-y-4">
          {/* Gender */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">성별</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => handleProfileChange('gender', 'male')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  userProfile.gender === 'male'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                남성
              </button>
              <button
                onClick={() => handleProfileChange('gender', 'female')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  userProfile.gender === 'female'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                여성
              </button>
            </div>
          </div>

          {/* Age, Height, Weight inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">나이 (세)</label>
              <input
                type="number"
                value={userProfile.age || ''}
                onChange={(e) => handleProfileChange('age', parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-center text-sm font-bold focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">신장 (cm)</label>
              <input
                type="number"
                value={userProfile.height || ''}
                onChange={(e) => handleProfileChange('height', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-center text-sm font-bold focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">체중 (kg)</label>
              <input
                type="number"
                value={userProfile.weight || ''}
                onChange={(e) => handleProfileChange('weight', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-center text-sm font-bold focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">평소 활동량</label>
            <select
              value={userProfile.activityLevel}
              onChange={(e) => handleProfileChange('activityLevel', parseFloat(e.target.value))}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:border-sky-500 focus:bg-white"
            >
              {Object.entries(activityLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* InBody Section */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
          <Activity className="w-5 h-5 text-sky-500" />
          <h2 className="text-lg font-bold text-slate-800">인바디 데이터 등록 <span className="text-xs text-slate-400 font-normal">(선택)</span></h2>
        </div>
        
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          골격근량과 체지방률을 등록하시면 BMR 계산법이 보다 정밀한 **캐치-맥아들 공식**으로 자동 보정되며, 훈수충 AI가 보다 칼날 같은 잔소리를 날립니다.
          <span className="block text-[10px] text-sky-500 font-bold mt-1">※ 추후 고도화 업데이트 예정</span>
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">골격근량 (kg)</label>
            <input
              type="number"
              step="0.1"
              placeholder="예: 31.5"
              value={userProfile.inbody.muscleMass ?? ''}
              onChange={(e) => handleInbodyChange('muscleMass', e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center text-sm font-bold focus:outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">체지방률 (%)</label>
            <input
              type="number"
              step="0.1"
              placeholder="예: 15.2"
              value={userProfile.inbody.bodyFat ?? ''}
              onChange={(e) => handleInbodyChange('bodyFat', e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center text-sm font-bold focus:outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Target Mode Section */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
          <Award className="w-5 h-5 text-sky-500" />
          <h2 className="text-lg font-bold text-slate-800">코칭 및 관리 모드</h2>
        </div>

        <div className="space-y-2">
          {Object.entries(modeLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleProfileChange('mode', key)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold flex justify-between items-center transition-all ${
                userProfile.mode === key
                  ? 'bg-sky-50 border-sky-500 text-sky-700'
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{label.split(' ')[0]}</span>
              <span className="text-xs text-slate-400 font-normal">{label.substring(label.indexOf('('))}</span>
            </button>
          ))}
        </div>

        {/* Routine creation config */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-50">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">선호 운동 빈도</label>
            <select
              value={userProfile.workoutDaysPerWeek}
              onChange={(e) => handleProfileChange('workoutDaysPerWeek', parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
            >
              <option value={3}>주 3회 트레이닝</option>
              <option value={4}>주 4회 트레이닝</option>
              <option value={5}>주 5회 트레이닝</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">운동 숙련도</label>
            <select
              value={userProfile.experienceLevel}
              onChange={(e) => handleProfileChange('experienceLevel', e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
            >
              <option value="beginner">초보자 (헬린이)</option>
              <option value="intermediate">중급자 (3대 300 이하)</option>
              <option value="advanced">상급자 (3대 300 이상)</option>
            </select>
          </div>
        </div>
      </div>

      {/* API Key Setting Section */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
          <Key className="w-5 h-5 text-sky-500" />
          <h2 className="text-lg font-bold text-slate-800">AI 연동 설정</h2>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          유튜브 운동 루틴 분석 및 보유 재료 기반 AI 식단 조리 레시피 생성을 위해 API Key를 설정합니다. Key는 브라우저 로컬 저장소에 암호 보관되어 안전합니다.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">제공자 선택</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => handleApiChange('provider', 'gemini')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  apiConfig.provider === 'gemini'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Gemini
              </button>
              <button
                type="button"
                onClick={() => handleApiChange('provider', 'openai')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  apiConfig.provider === 'openai'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                OpenAI
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={apiConfig.provider === 'gemini' ? 'Gemini API Key 입력' : 'OpenAI API Key (sk-...) 입력'}
              value={apiConfig.key}
              onChange={(e) => handleApiChange('key', e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono focus:outline-none focus:border-sky-500 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {!apiConfig.key && (
            <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg p-2 leading-relaxed">
              💡 API Key 미등록 시, 기기에 내장된 로컬 **모의 오프라인 인공지능(Mock AI)**을 바탕으로 추천 및 분석을 대신 진행합니다.
            </p>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/50 rounded-2xl p-5 border border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold text-red-800">초기화</h2>
        </div>
        <p className="text-xs text-red-600/80 mb-4 leading-relaxed">
          저장된 신체 정보, 식단 및 운동 일지 등 로컬 스토리지에 저장된 모든 기록이 영구적으로 지워집니다.
        </p>
        <button
          onClick={() => {
            if (confirm('정말로 모든 데이터를 삭제하고 리셋하시겠습니까?')) {
              resetAllData();
              window.location.reload();
            }
          }}
          className="w-full bg-red-500 text-white font-bold py-3 rounded-xl text-sm ios-btn-press hover:bg-red-600 shadow-sm shadow-red-100"
        >
          로컬 데이터 전체 리셋하기
        </button>
      </div>
    </div>
  );
};
