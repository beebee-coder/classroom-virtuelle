// src/components/Menu.tsx - VERSION CORRIGÉE
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import styles from './Menu.module.css';
import { menuItems } from '@/lib/constants';
import type { Session } from "next-auth";
import type { Classroom } from "@prisma/client";
import React from "react";

interface MenuProps {
  user: Session['user'];
  classrooms?: Pick<Classroom, 'id' | 'nom'>[];
  validationCount?: number;
}

interface MenuItemType {
  label: string;
  roles: string[];
  condition?: (user: Session['user']) => boolean;
  component?: React.ComponentType<any>;
  href?: string | ((user: Session['user']) => string);
  icon?: React.ComponentType<any>;
  isDialog?: boolean;
}

interface MenuGroupType {
  title: string;
  items: MenuItemType[];
}

const Menu: React.FC<MenuProps> = ({ user, classrooms = [], validationCount = 0 }) => {
  const pathname = usePathname();

  if (!user) return null;

  const colorClasses = [
    styles.red,
    styles.green, 
    styles.blue,
    styles.purple,
    styles.orange,
    styles.pink,
    styles.cyan,
  ];

  return (
    <div className="p-4 text-sm h-full overflow-y-auto">
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="remove-black-button-13" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -1 -1 -1 0 1" result="black-pixels"></feColorMatrix>
          <feComposite in="SourceGraphic" in2="black-pixels" operator="out"></feComposite>
        </filter>
      </svg>
      
      {(menuItems as MenuGroupType[]).map((group) => {
        const visibleItems = group.items.filter(item => {
          try {
            const hasRole = item.roles.includes(user.role as string);
            const passesCondition = !item.condition || item.condition(user);
            return hasRole && passesCondition;
          } catch (error) {
            console.warn(`Erreur dans le filtre du menu item "${item.label}":`, error);
            return false;
          }
        });
        
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

                if (item.component) {
                  const Component = item.component;
                  const compProps: any = {};

                  if (item.label === "Créer une Annonce") {
                    compProps.classrooms = classrooms;
                  }

                  if (item.isDialog) {
                    compProps.children = (
                      <button 
                        className={cn(
                          styles.button, 
                          colorClass
                        )}
                      >
                        {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                        {/* ✅ CORRECTION : Remplacer truncate par la classe CSS */}
                        <span className={styles.buttonText}>{item.label}</span>
                      </button>
                    );
                    return <Component key={item.label} {...compProps} />;
                  }
                  
                  return <Component key={item.label} {...compProps} />;
                }
                
                if (item.href && Icon) {
                  const href = typeof item.href === 'function' ? item.href(user) : item.href;
                  const isActive = pathname === href || pathname?.startsWith(href + '/');
                  
                  return (
                    <Link
                      href={href}
                      key={item.label}
                      className={cn(
                        styles.button, 
                        colorClass,
                        isActive && "ring-2 ring-accent bg-accent/10"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {/* ✅ CORRECTION : Remplacer truncate par la classe CSS */}
                      <span className={styles.buttonText}>{item.label}</span>
                      
                      {item.label === 'Validations' && validationCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full flex-shrink-0">
                          {validationCount > 99 ? '99+' : validationCount}
                        </span>
                      )}
                    </Link>
                  );
                }
                
                console.warn(`Item de menu invalide: ${item.label}`);
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