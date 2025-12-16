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
      className="fixed pointer-events-none text-green-500 font-bold text-2xl animate-float-up z-50 select-none font-pixel"
      style={{ 
          left: x, 
          top: y,
          textShadow: '2px 2px 0 #000' 
      }}
    >
      +${formatMoney(value)}
    </div>
  );
};