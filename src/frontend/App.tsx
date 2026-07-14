import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { DietTab } from './components/diet/DietTab';
import { WorkoutTab } from './components/workout/WorkoutTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { CalendarTab } from './components/calendar/CalendarTab';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { Home, ClipboardList, Dumbbell, Calendar, Settings } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { userProfile } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // 1. Render Onboarding view if not finished
  if (!userProfile.isOnboarded) {
    return <OnboardingFlow />;
  }

  // 2. Render Main Application UI
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* iOS App Header with Safe Area top padding */}
      <header 
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        className="px-4 pb-3 bg-white border-b border-slate-100 flex justify-between items-center z-10 shrink-0"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-black text-sky-500 tracking-tight">Protein Log</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
            체중: {userProfile.weight}kg
          </span>
        </div>
      </header>

      {/* Main Tab content space (Scrollable) */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 pb-24">
        {activeTab === 'dashboard' && <DashboardTab setActiveTab={setActiveTab} />}
        {activeTab === 'diet' && <DietTab />}
        {activeTab === 'workout' && <WorkoutTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* iOS Nav Tab Bar with Safe Area bottom padding */}
      <nav 
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        className="fixed bottom-0 left-0 right-0 sm:absolute bg-white/95 backdrop-blur-md border-t border-slate-100 z-20 shadow-lg flex justify-around items-center pt-2 px-3"
      >
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 font-sans font-bold text-[10px] tracking-tight transition-all ${
            activeTab === 'dashboard' ? 'text-sky-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>대시보드</span>
        </button>

        <button
          onClick={() => setActiveTab('diet')}
          className={`flex flex-col items-center gap-1 font-sans font-bold text-[10px] tracking-tight transition-all ${
            activeTab === 'diet' ? 'text-sky-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>식단일지</span>
        </button>

        <button
          onClick={() => setActiveTab('workout')}
          className={`flex flex-col items-center gap-1 font-sans font-bold text-[10px] tracking-tight transition-all ${
            activeTab === 'workout' ? 'text-sky-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span>운동일지</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center gap-1 font-sans font-bold text-[10px] tracking-tight transition-all ${
            activeTab === 'calendar' ? 'text-sky-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>달력</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 font-sans font-bold text-[10px] tracking-tight transition-all ${
            activeTab === 'settings' ? 'text-sky-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>설정</span>
        </button>
      </nav>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      {/* Centered iPhone Mockup Wrapper on Desktop, full viewport on Mobile */}
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <div 
          style={{ transform: 'translate3d(0, 0, 0)' }}
          className="w-full max-w-[450px] h-[100vh] sm:h-[850px] bg-white sm:rounded-[36px] sm:shadow-2xl sm:border-[8px] sm:border-slate-800 relative flex flex-col overflow-hidden"
        >
          
          {/* Status bar simulator (desktop only) */}
          <div className="hidden sm:flex shrink-0 w-full h-8 bg-slate-800 text-white text-[10px] font-bold justify-between items-center px-6 z-30 select-none">
            <span>9:41</span>
            <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center border border-slate-700/50">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mr-2" />
              <div className="w-6 h-1 bg-slate-700 rounded-full" />
            </div>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2 bg-white rounded-[2px] p-[1px] flex">
                <div className="h-full w-3 bg-slate-800 rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* App Core Container */}
          <div className="flex-1 relative overflow-hidden flex flex-col h-full">
            <MainLayout />
            <div id="modal-root" className="absolute inset-0 pointer-events-none z-50" />
          </div>

          {/* Home Bar Simulator (desktop only) */}
          <div className="hidden sm:block shrink-0 w-full h-4 bg-white z-30 relative select-none">
            <div className="w-32 h-1 bg-slate-300 rounded-full absolute bottom-1.5 left-1/2 -translate-x-1/2" />
          </div>
          
        </div>
      </div>
    </AppProvider>
  );
};

export default App;
