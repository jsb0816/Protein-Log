import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { DailyDiet } from '../context/AppContext';
import { BottomSheet } from './BottomSheet';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Star } from 'lucide-react';

export const CalendarTab: React.FC = () => {
  const { dietLogs, targetCalories, targetProtein } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Helper to format date as YYYY-MM-DD in local time
  const formatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Monthly stats
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const totalDays = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Scoring algorithm for star rating (1 to 5 stars)
  const calculateStars = (dietLog: DailyDiet | undefined, targetCal: number, targetPro: number): number => {
    if (!dietLog) return 0;

    if (dietLog.mode === 'simple') {
      const protein = dietLog.simpleProtein || 0;
      if (protein >= targetPro * 0.95) return 5;
      if (protein >= targetPro * 0.8) return 4;
      if (protein >= targetPro * 0.65) return 3;
      if (protein >= targetPro * 0.45) return 2;
      if (protein > 0) return 1;
      return 0;
    } else {
      const items = dietLog.items || [];
      if (items.length === 0) return 0;

      const totalCal = items.reduce((sum, item) => sum + item.calories, 0);
      const totalProt = items.reduce((sum, item) => sum + item.protein, 0);

      // Calorie Penalty (±10% target = 0 penalty, ±20% = -1 star, ±35% = -2 stars, else -3 stars)
      let calPenalty = 0;
      const calDiffPct = Math.abs(totalCal - targetCal) / targetCal;
      if (calDiffPct <= 0.10) {
        calPenalty = 0;
      } else if (calDiffPct <= 0.20) {
        calPenalty = 1;
      } else if (calDiffPct <= 0.35) {
        calPenalty = 2;
      } else {
        calPenalty = 3;
      }

      // Protein Penalty (>=90% = 0 penalty, >=75% = -1 star, >=50% = -2 stars, else -3 stars)
      let proPenalty = 0;
      const proRatio = totalProt / targetPro;
      if (proRatio >= 0.90) {
        proPenalty = 0;
      } else if (proRatio >= 0.75) {
        proPenalty = 1;
      } else if (proRatio >= 0.50) {
        proPenalty = 2;
      } else {
        proPenalty = 3;
      }

      const stars = Math.max(1, 5 - calPenalty - proPenalty);
      return stars;
    }
  };

  const getModeInfo = (mode: string | undefined) => {
    switch (mode) {
      case 'bulk':
        return { label: '벌크', color: 'bg-red-50 text-red-600 border-red-100' };
      case 'leanmass':
        return { label: '린매', color: 'bg-orange-50 text-orange-600 border-orange-100' };
      case 'cut':
        return { label: '컷팅', color: 'bg-sky-50 text-sky-600 border-sky-100' };
      case 'maintain':
        return { label: '유지', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      default:
        return null;
    }
  };

  // Generate date cells
  const dayCells = [];
  // 1. Padding days
  for (let i = 0; i < firstDayIndex; i++) {
    dayCells.push(<div key={`empty-${i}`} className="h-16 bg-slate-50/20 border-b border-r border-slate-100/50" />);
  }

  // 2. Real days
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = formatDateStr(year, month, day);
    const log = dietLogs[dateStr];
    const stars = calculateStars(log, targetCalories, targetProtein);
    const modeInfo = getModeInfo(log?.profileMode);

    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

    dayCells.push(
      <div
        key={`day-${day}`}
        onClick={() => {
          if (log) {
            setSelectedDateStr(dateStr);
            setIsDetailOpen(true);
          }
        }}
        className={`h-16 border-b border-r border-slate-100 flex flex-col p-1.5 justify-between relative transition-all ${
          log ? 'hover:bg-slate-50 cursor-pointer bg-white' : 'bg-white/40'
        } ${isToday ? 'bg-sky-50/30' : ''}`}
      >
        {/* Date number */}
        <div className="flex justify-between items-center">
          <span className={`text-[10px] font-black ${
            isToday 
              ? 'bg-sky-500 text-white w-4 h-4 rounded-full flex items-center justify-center font-black scale-105' 
              : 'text-slate-500'
          }`}>
            {day}
          </span>
          {/* Mode Badge */}
          {modeInfo && (
            <span className={`text-[8px] font-black px-1 py-0.2 rounded border scale-90 ${modeInfo.color}`}>
              {modeInfo.label}
            </span>
          )}
        </div>

        {/* Achievement star rating badge */}
        {log && stars > 0 && (
          <div className="flex items-center gap-0.5 bg-amber-50/80 rounded px-1 py-0.5 border border-amber-100 w-fit">
            <Star className="w-2 h-2 text-amber-500 fill-amber-500 shrink-0" />
            <span className="text-[8px] font-black text-amber-700 leading-none">{stars}</span>
          </div>
        )}
      </div>
    );
  }

  // Render detail bottom sheet for selected date
  const renderDetailSheet = () => {
    if (!selectedDateStr) return null;
    const log = dietLogs[selectedDateStr];
    if (!log) return null;

    const stars = calculateStars(log, targetCalories, targetProtein);
    const modeInfo = getModeInfo(log.profileMode);

    const isDetailed = log.mode === 'detailed';
    const totalCal = isDetailed ? log.items.reduce((sum, item) => sum + item.calories, 0) : 0;
    const totalProt = isDetailed
      ? log.items.reduce((sum, item) => sum + item.protein, 0)
      : log.simpleProtein || 0;
    const totalCarb = isDetailed ? log.items.reduce((sum, item) => sum + item.carbs, 0) : 0;
    const totalFat = isDetailed ? log.items.reduce((sum, item) => sum + item.fat, 0) : 0;

    return (
      <BottomSheet isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`${selectedDateStr} 식단 성과`}>
        <div className="space-y-4 font-sans text-xs text-slate-800">
          
          {/* Stars & Goal Mode Summary Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold block">이 날의 신체 목표</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-700">
                  {log.profileMode === 'bulk' ? '벌크업 🔥' 
                    : log.profileMode === 'leanmass' ? '린매스업 ⚡' 
                    : log.profileMode === 'cut' ? '다이어트(컷팅) ❄️' 
                    : '유지어터 ☘️'}
                </span>
                {modeInfo && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${modeInfo.color}`}>
                    {modeInfo.label}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">식단 성과 점수</span>
              <div className="flex items-center justify-end gap-1">
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-3 h-3 ${idx < stars ? 'fill-current' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-black text-slate-700 ml-1">({stars}점)</span>
              </div>
            </div>
          </div>

          {/* Daily Nutrition Totals Banner */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 pb-2 border-b border-slate-50">영양 섭취 요약</h3>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">칼로리</span>
                <span className="text-xs font-extrabold text-slate-700 block">
                  {isDetailed ? `${totalCal} kcal` : '기록없음'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">탄수화물</span>
                <span className="text-xs font-extrabold text-slate-700 block">
                  {isDetailed ? `${totalCarb}g` : '기록없음'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-sky-500 font-bold block">단백질</span>
                <span className="text-xs font-black text-sky-600 block">
                  {totalProt}g
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">지방</span>
                <span className="text-xs font-extrabold text-slate-700 block">
                  {isDetailed ? `${totalFat}g` : '기록없음'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed food logs */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500">식사 일지 기록</h3>
            {isDetailed ? (
              log.items.length > 0 ? (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {log.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 text-slate-500 text-[8px] px-1 py-0.2 rounded font-bold">
                            {item.mealType === 'breakfast' ? '아침' 
                              : item.mealType === 'lunch' ? '점심' 
                              : item.mealType === 'dinner' ? '저녁' 
                              : '간식'}
                          </span>
                          <span className="font-bold text-slate-700">{item.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold block">
                          탄 {item.carbs}g | 단 {item.protein}g | 지 {item.fat}g
                        </span>
                      </div>
                      <span className="font-bold text-slate-600">{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">상세 등록된 식품 데이터가 없습니다.</div>
              )
            ) : (
              /* Simple Mode details */
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 text-center space-y-2">
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  이 날은 **간편 단백질 기록 모드**로 식단이 기재되었습니다.
                </p>
                <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-400 mt-2">
                  <span>아침: {log.simpleProteinMeals?.breakfast || 0}g</span>
                  <span>점심: {log.simpleProteinMeals?.lunch || 0}g</span>
                  <span>저녁: {log.simpleProteinMeals?.dinner || 0}g</span>
                  <span>간식: {log.simpleProteinMeals?.snack || 0}g</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsDetailOpen(false)}
            className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl text-xs ios-btn-press hover:bg-slate-200 mt-4"
          >
            확인 및 닫기
          </button>
        </div>
      </BottomSheet>
    );
  };

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  return (
    <div className="space-y-5 animate-fade-in font-sans text-slate-800">
      
      {/* Month Control Header Card */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-sky-500" />
          <h2 className="text-sm font-bold text-slate-700">{year}년 {monthNames[month]}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl ios-btn-press"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl ios-btn-press"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Grid Legend Card */}
      <div className="bg-white rounded-2xl p-3 border border-slate-100 text-[10px] font-bold text-slate-400 flex flex-wrap justify-around items-center gap-2">
        <span className="flex items-center gap-1.5">
          <span className="px-1 py-0.5 rounded border bg-red-50 text-red-600 border-red-100 text-[8px] flex items-center justify-center font-black scale-90">벌크</span>
          벌크업
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1 py-0.5 rounded border bg-orange-50 text-orange-600 border-orange-100 text-[8px] flex items-center justify-center font-black scale-90">린매</span>
          린매스업
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1 py-0.5 rounded border bg-sky-50 text-sky-600 border-sky-100 text-[8px] flex items-center justify-center font-black scale-90">컷팅</span>
          다이어트
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px] flex items-center justify-center font-black scale-90">유지</span>
          유지어터
        </span>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 text-center bg-slate-50 border-b border-slate-100 py-2.5 text-[9px] font-extrabold text-slate-400">
          <span className="text-red-400">일</span>
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span>토</span>
        </div>

        {/* Days of month grid */}
        <div className="grid grid-cols-7 border-l border-slate-100/50">
          {dayCells}
        </div>
      </div>

      {/* Bottom Sheet Modal for Detailed View */}
      {renderDetailSheet()}
    </div>
  );
};
