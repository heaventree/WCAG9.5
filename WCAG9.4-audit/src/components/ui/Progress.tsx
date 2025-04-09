import type { CSSProperties } from 'react';

interface ProgressProps {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
  style?: CSSProperties;
}

export function Progress({ 
  value, 
  max, 
  className = "", 
  barClassName = "",
  style
}: ProgressProps) {
  const percentage = Math.round((value / max) * 100);
  
  return (
    <div 
      className={`bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}
      role="progressbar" 
      aria-valuenow={value} 
      aria-valuemin={0} 
      aria-valuemax={max}
      aria-label={`${percentage}% complete`}
    >
      <div 
        className={`h-full rounded-full bg-blue-600 transition-all duration-300 ease-in-out ${barClassName}`}
        style={{ width: `${percentage}%`, ...style }}
      />
    </div>
  );
}