// src/components/session/NavIconButton.tsx
'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface NavIconButtonProps {
  icon : LucideIcon;
  label: string;
  colors: readonly [string, string];
  isActive?: boolean;
  onClick?: () => void;
  isDisabled?: boolean;
}

export function NavIconButton({ icon: Icon, label, colors, isActive = false, onClick, isDisabled = false }: NavIconButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const style = {
    '--i': colors[0],
    '--j': colors[1],
  } as React.CSSProperties;

  // Le titre est affiché si le bouton est actif OU si la souris est dessus
  const showTitle = isActive || isHovered;

  return (
    <li
      style={style}
      className={cn(
        "nav-icon-item",
        showTitle && "w-40 shadow-none",
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="nav-icon-background" />
      
      {showTitle ? (
        <span className="title">{label}</span>
      ) : (
        <span className="icon"><Icon /></span>
      )}
    </li>
  );
}
