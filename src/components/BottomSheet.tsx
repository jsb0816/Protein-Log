import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

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
  // Prevent scrolling behind modal when open
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

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  const modalContent = (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 font-sans pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Centered Modal Container */}
      <div
        className="relative w-full max-w-[400px] bg-white rounded-[28px] shadow-2xl z-10 flex flex-col max-h-[80vh] overflow-hidden"
        style={{
          animation: 'modalPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Style block for local keyframes */}
        <style>{`
          @keyframes modalPop {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* Title Header */}
        {title && (
          <div className="px-6 pt-5 pb-3 border-b border-slate-100/60 flex justify-between items-center shrink-0">
            <h3 className="text-sm font-black text-slate-800">{title}</h3>
            <button
              onClick={onClose}
              className="text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg ios-btn-press hover:bg-slate-100 transition-all"
            >
              닫기
            </button>
          </div>
        )}

        {/* Scrollable Contents */}
        <div className="overflow-y-auto px-6 py-5 no-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, modalRoot);
};
