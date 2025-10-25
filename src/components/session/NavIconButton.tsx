// src/components/session/NavIconButton.tsx
'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface NavIconButtonProps {
  icon: LucideIcon;
  label: string;
  colors: [string, string];
  isActive?: boolean;
  onClick?: () => void;
  isDisabled?: boolean;
}

export function NavIconButton({ icon: Icon, label, colors, isActive = false, onClick, isDisabled = false }: NavIconButtonProps) {
  const style = {
    '--i': colors[0],
    '--j': colors[1],
  } as React.CSSProperties;

  return (
    <li
      style={style}
      className={cn(
        "nav-icon-item",
        isActive && "w-40 shadow-none",
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      onClick={onClick}
    >
      {/* Appliquer l'opacité active directement sur l'élément pseudo ::before */}
      <div className={cn("absolute inset-0 rounded-full", isActive && "opacity-100")} style={{background: `linear-gradient(45deg, var(--i), var(--j))`}} />
      
      <span className="icon"><Icon /></span>
      <span className="title">{label}</span>
    </li>
  );
}
