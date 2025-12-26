// src/components/Menu.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import styles from './Menu.module.css';
import { menuItems, type MenuSection, type MenuItem } from '@/lib/constants';
import type { Session } from "next-auth";
import type { Classroom } from "@prisma/client";
import React from "react";

interface MenuProps {
  user: Session['user'];
  classrooms?: Pick<Classroom, 'id' | 'nom'>[];
  validationCount?: number;
  announcementTrigger?: React.ReactNode;
  resetTrigger?: React.ReactNode;
}

const Menu: React.FC<MenuProps> = ({ user, validationCount = 0, announcementTrigger, resetTrigger }) => {
  const pathname = usePathname();

  if (!user) return null;

  const colorClasses = [
    styles.red, styles.green, styles.blue, styles.purple,
    styles.orange, styles.pink, styles.cyan,
  ];

  return (
    <div className="p-4 text-sm h-full overflow-y-auto">
      {menuItems.map((group) => {
        const visibleItems = group.items.filter(item => 
            item.roles.includes(user.role!) && (!item.condition || item.condition(user))
        );
        
        if (visibleItems.length === 0) return null;
        
        return (
          <div className="flex flex-col gap-2 mb-6" key={group.title}>
            <div className={styles.titleFrame}>
              <span className={styles.titleBackground}></span>
              <span className={styles.titleBorder}></span>
              <span className={cn(styles.titleText, "whitespace-nowrap")}>{group.title}</span>
            </div>

            <div className="flex flex-col gap-1">
              {visibleItems.map((item, index) => {
                const Icon = item.icon;
                const colorClass = colorClasses[index % colorClasses.length];

                // Gère les actions de dialogue
                if (item.action) {
                  if (item.action === 'create-announcement' && announcementTrigger) {
                    return React.cloneElement(announcementTrigger as React.ReactElement, { key: item.label });
                  }
                  if (item.action === 'reset-data' && resetTrigger) {
                     return React.cloneElement(resetTrigger as React.ReactElement, { key: item.label });
                  }
                  return null;
                }
                
                if (item.href) {
                  const href = typeof item.href === 'function' ? item.href(user) : item.href;
                  const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href));
                  
                  return (
                    <Link
                      href={href}
                      key={item.label}
                      className={cn(styles.button, colorClass, isActive && "ring-2 ring-accent bg-accent/10")}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                      
                      {item.label === 'Validations' && validationCount > 0 && (
                        <span 
                          className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full flex-shrink-0"
                          aria-label={`${validationCount} validations en attente`}
                        >
                          {validationCount > 99 ? '99+' : validationCount}
                        </span>
                      )}
                    </Link>
                  );
                }
                
                return null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Menu;
