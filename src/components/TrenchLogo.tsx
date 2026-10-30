import React from 'react';

interface TrenchLogoProps {
  variant?: 'light-on-navy' | 'white-transparent' | 'header';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Exact vector recreation of the "trench" logo from the delivery partner's navy polo t-shirt:
 * Bold split-stem geometric "T" monogram above lowercase "trench" wordmark.
 */
export const TrenchLogo: React.FC<TrenchLogoProps> = ({
  variant = 'light-on-navy',
  size = 'md',
  className = '',
}) => {
  const iconDimensions =
    size === 'sm'
      ? 'w-5 h-3.5'
      : size === 'lg'
        ? 'w-11 h-9'
        : 'w-9 h-7';

  const textSize =
    size === 'sm'
      ? 'text-[10px]'
      : size === 'lg'
        ? 'text-[17px]'
        : 'text-[14px]';

  const containerStyle =
    variant === 'light-on-navy'
      ? 'bg-[#000080] text-white px-2.5 py-1.5 rounded-xl shadow-sm border border-white/15'
      : variant === 'header'
        ? 'bg-[#000080] text-white px-2.5 py-1 rounded-lg shadow-xs'
        : 'text-white drop-shadow-md';

  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none shrink-0 leading-none ${containerStyle} ${className}`}
    >
      <svg
        viewBox="0 0 100 68"
        className={`${iconDimensions} fill-current block`}
        aria-hidden="true"
      >
        {/* Main T Top Bar + Left Vertical Stem */}
        <path d="M12 6 H90 L81 21 H48 V62 L34 66 V21 H16 Z" />
        {/* Inner Right Tucked "r" Stem */}
        <path d="M54 34 C54 27 58 25 66 25 H79 L75 36 H66 V59 L54 62 Z" />
      </svg>
      <span
        className={`${textSize} font-extrabold lowercase tracking-tight leading-none mt-0.5`}
      >
        trench
      </span>
    </div>
  );
};
