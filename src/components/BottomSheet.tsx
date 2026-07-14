import React, { useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  // Prevent scrolling behind bottom sheet when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center font-sans sm:absolute">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Drawer Container */}
      <div
        className="relative w-full max-w-[450px] bg-white rounded-t-3xl shadow-2xl z-10 flex flex-col max-h-[85vh] transition-transform duration-300 transform translate-y-0"
        style={{
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
        }}
      >
        {/* Style block for local keyframes */}
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        {/* Grab Handle */}
        <div className="flex justify-center py-3 cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Title Header */}
        {title && (
          <div className="px-6 pb-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <button
              onClick={onClose}
              className="text-sm font-semibold text-sky-500 ios-btn-press"
            >
              닫기
            </button>
          </div>
        )}

        {/* Scrollable Contents */}
        <div className="overflow-y-auto px-6 py-4 no-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
