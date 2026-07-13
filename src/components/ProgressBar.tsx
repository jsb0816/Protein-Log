import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  colorClass?: string; // e.g. text-sky-500
  trailColorClass?: string; // e.g. text-slate-100
  size?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  unit,
  colorClass = 'text-sky-500',
  trailColorClass = 'text-slate-100',
  size = 140,
}) => {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 999) : 0;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center font-sans">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            className={`stroke-current ${trailColorClass}`}
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress circle */}
          <circle
            className={`stroke-current ${colorClass} transition-all duration-500 ease-out`}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        {/* Inside label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-800 tracking-tight">{percentage}%</span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <span className="text-sm font-semibold text-slate-700">
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
        <span className="text-xs text-slate-400 ml-1">{unit}</span>
      </div>
    </div>
  );
};

interface LinearProgressBarProps {
  value: number;
  max: number;
  colorClass?: string;
}

export const LinearProgressBar: React.FC<LinearProgressBarProps> = ({
  value,
  max,
  colorClass = 'bg-sky-500',
}) => {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all duration-500 ease-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
