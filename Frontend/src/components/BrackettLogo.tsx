/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { COLORS } from '../theme/tokens';

interface LogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export const BrackettLogo: React.FC<LogoProps> = ({
  className = '',
  size = 28,
  color = COLORS.logo.muted
}) => {
  return (
    <svg
      width={size * 1.6}
      height={size}
      viewBox="0 0 40 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left thick bracket */}
      <path
        d="M14 3H9.5C6.46 3 4 5.46 4 8.5V16.5C4 19.54 6.46 22 9.5 22H14C15.1 22 16 21.1 16 20V5C16 3.9 15.1 3 14 3Z"
        fill={color}
      />
      {/* Right thick bracket */}
      <path
        d="M26 3H30.5C33.54 3 36 5.46 36 8.5V16.5C36 19.54 33.54 22 30.5 22H26C24.9 22 24 21.1 24 20V5C24 3.9 24.9 3 26 3Z"
        fill={color}
      />
    </svg>
  );
};

export const BrackettWordmark: React.FC<{
  markSize?: number;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  color?: string;
}> = ({
  markSize = 24,
  className = '',
  markClassName = '',
  textClassName = '',
  color = COLORS.logo.default,
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <BrackettLogo size={markSize} color={color} className={markClassName} />
    <span className={`font-sans text-xl font-[700] tracking-[-0.03em] text-slate-950 ${textClassName}`}>
      brackett
    </span>
  </div>
);
