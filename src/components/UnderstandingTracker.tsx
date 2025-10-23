// src/components/UnderstandingTracker.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smile, Meh, Frown, HelpCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useState, useEffect, useRef } from 'react';
import { ComprehensionLevel } from './StudentSessionControls';

interface UnderstandingTrackerProps {
  students: User[];
  understandingStatus: Map<string, ComprehensionLevel>;
}

const statusConfig = {
  [ComprehensionLevel.UNDERSTOOD]: { icon: Smile, color: 'text-green-500', label: 'Compris' },
  [ComprehensionLevel.CONFUSED]: { icon: Meh, color: 'text-yellow-500', label: 'Confus' },
  [ComprehensionLevel.LOST]: { icon: Frown, color: 'text-red-500', label: 'Perdu' },
  [ComprehensionLevel.NONE]: { icon: HelpCircle, color: 'text-muted-foreground', label: 'Pas de statut' },
};

export function UnderstandingTracker({ students, understandingStatus }: UnderstandingTrackerProps) {
  const [accordionValue, setAccordionValue] = useState<string | undefined>('tracker');
  const [hasNewStatus, setHasNewStatus] = useState(false);
  const prevStatusRef = useRef<Map<string, ComprehensionLevel>>();

  useEffect(() => {
    if (accordionValue === undefined && prevStatusRef.current && prevStatusRef.current !== understandingStatus) {
        setHasNewStatus(true);
    }
    prevStatusRef.current = understandingStatus;
  }, [understandingStatus, accordionValue]);

  const handleAccordionChange = (value?: string) => {
    setAccordionValue(value);
    if (value === 'tracker') {
      setHasNewStatus(false);
    }
  };

  const getStatusCounts = () => {
    const counts: Record<ComprehensionLevel, number> = { 
        [ComprehensionLevel.UNDERSTOOD]: 0, 
        [ComprehensionLevel.CONFUSED]: 0, 
        [ComprehensionLevel.LOST]: 0, 
        [ComprehensionLevel.NONE]: 0 
    };
    students.forEach(student => {
      const status = understandingStatus.get(student.id) || ComprehensionLevel.NONE;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  };

  const counts = getStatusCounts();

  return (
    <Card className='bg-background/80'>
        <Accordion type="single" collapsible value={accordionValue} onValueChange={(value) => handleAccordionChange(value === accordionValue ? undefined : value)}>
            <AccordionItem value="tracker" className="border-b-0">
                <AccordionTrigger className="p-6">
                    <CardTitle className="flex items-center gap-2 text-base relative">
                        <HelpCircle className={cn("h-5 w-5 text-primary", hasNewStatus && accordionValue !== 'tracker' && 'animate-pulse')} />
                        <span>Suivi de la Compréhension</span>
                    </CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="space-y-4 pt-0">
                        <div className="flex justify-around text-center">
                        {Object.entries(counts).map(([key, value]) => {
                            const levelKey = key as ComprehensionLevel;
                            if (levelKey === ComprehensionLevel.NONE) return null;
                            const config = statusConfig[levelKey];
                            if (!config) return null;
                            const Icon = config.icon;
                            return (
                                <div key={key} className="flex flex-col items-center">
                                    <Icon className={cn("h-6 w-6 mb-1", config.color)} />
                                    <span className="font-bold text-lg">{value}</span>
                                </div>
                            );
                        })}
                        </div>

                        <ScrollArea className="h-48">
                        <div className="space-y-2 pr-4">
                            <TooltipProvider>
                            {students.map(student => {
                                const status = understandingStatus.get(student.id) || ComprehensionLevel.NONE;
                                const config = statusConfig[status];
                                if (!config) return null;
                                const Icon = config.icon;

                                return (
                                <Tooltip key={student.id}>
                                    <TooltipTrigger asChild>
                                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                        <Avatar className="h-7 w-7 text-xs">
                                            <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{student.name}</span>
                                        </div>
                                        <Icon className={cn("h-5 w-5", config.color)} />
                                    </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                    <p>{config.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                                );
                            })}
                            </TooltipProvider>
                        </div>
                        </ScrollArea>
                    </CardContent>
                </AccordionContent>
            </AccordionItem>
      </Accordion>
    </Card>
  );
}
