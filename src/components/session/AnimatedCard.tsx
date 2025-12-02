// src/components/session/AnimatedCard.tsx
"use client";

import React, { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideProps } from 'lucide-react';

interface AnimatedCardProps {
  children: ReactNode;
  title: string;
  icon?: React.ComponentType<LucideProps>;
}

const CardHeaderComponent = ({ toggleOpen, title, icon: Icon }: { 
  toggleOpen: () => void; 
  title: string;
  icon?: React.ComponentType<LucideProps>;
}) => {
    return (
      <motion.div
        onClick={toggleOpen}
        layout
        initial={{ borderRadius: 10 }}
        className="flex items-center p-3 gap-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {Icon && (
          <motion.div
            layout
            className="rounded-full bg-primary/20 h-6 w-6 flex items-center justify-center"
          >
            <Icon className="w-3 h-3 text-primary" />
          </motion.div>
        )}
        {!Icon && (
          <motion.div
            layout
            className="rounded-full bg-primary/20 h-6 w-6 flex items-center justify-center"
          >
            <div className="w-2 h-2 bg-primary rounded-full" />
          </motion.div>
        )}
        <motion.div
          layout
          className="h-6 w-1 rounded-lg bg-primary/20"
        />
        <motion.p
          layout
          className="flex-grow text-sm font-semibold text-foreground"
        >
          {title}
        </motion.p>
      </motion.div>
    );
};

const CardContentComponent = ({ children }: { children: ReactNode }) => {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full overflow-hidden"
      >
        <div className="p-3 pt-0">
          {children}
        </div>
      </motion.div>
    );
};

export const AnimatedCard = ({ children, title, icon }: AnimatedCardProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const toggleOpen = () => setIsOpen(!isOpen);
  
    return (
      <motion.div 
        layout 
        initial={{ borderRadius: 10 }} 
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg"
      >
        <CardHeaderComponent toggleOpen={toggleOpen} title={title} icon={icon} />
        <AnimatePresence mode="wait">
          {isOpen && <CardContentComponent>{children}</CardContentComponent>}
        </AnimatePresence>
      </motion.div>
    );
};