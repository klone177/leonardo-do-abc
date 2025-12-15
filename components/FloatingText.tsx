import React, { useEffect, useState } from 'react';
import { formatMoney } from '../services/utils';

interface FloatingTextProps {
  x: number;
  y: number;
  value: number;
  onComplete: () => void;
}

export const FloatingText: React.FC<FloatingTextProps> = ({ x, y, value, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 800); // Remove after animation
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="fixed pointer-events-none text-green-600 font-bold text-xl animate-float-up z-50 select-none shadow-sm"
      style={{ left: x, top: y }}
    >
      +${formatMoney(value)}
    </div>
  );
};
