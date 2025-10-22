// src/app/librairie-metiers/CareerGrid.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { Metier } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { setStudentCareer } from '@/lib/actions';
import { Loader2 } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';

type IconName = keyof typeof Icons;

const Icon = ({ name, ...props }: { name: IconName } & Icons.LucideProps) => {
    const LucideIcon = Icons[name] as React.FC<Icons.LucideProps>;
    if (!LucideIcon) return <Icons.HelpCircle {...props} />;
    return <LucideIcon {...props} />;
};

interface CareerGridProps {
    careers: Metier[];
    isStudent: boolean;
    studentId?: string;
    currentCareerId?: string | null;
}

export function CareerGrid({ careers, isStudent, studentId, currentCareerId }: CareerGridProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();

    const handleSelectCareer = (career: Metier) => {
        if (!isStudent || !studentId || isPending || currentCareerId === career.id) {
            return;
        }

        startTransition(async () => {
            try {
                await setStudentCareer(studentId, career.id);
                toast({
                    title: 'Métier appliqué !',
                    description: `Le thème "${career.nom}" a été appliqué à votre profil.`,
                });
                router.push(`/student/${studentId}`);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: 'Impossible d\'appliquer le métier.',
                });
            }
        });
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {careers.map((career) => {
                const theme = career.theme as any;
                const iconName = career.icon as IconName | null;
                const isSelected = currentCareerId === career.id;

                return (
                    <div
                        key={career.id}
                        onClick={() => handleSelectCareer(career)}
                        className={cn(
                            "group relative rounded-lg overflow-hidden transition-all duration-300",
                            isStudent && !isSelected && "cursor-pointer hover:shadow-2xl hover:-translate-y-2",
                            isSelected && "ring-4 ring-primary ring-offset-4 ring-offset-background",
                        )}
                    >
                        <Card
                            className={cn(
                                "overflow-hidden transition-all duration-300 flex flex-col h-full",
                                theme.cursor,
                                !isStudent && "group-hover:shadow-2xl group-hover:-translate-y-2",
                            )}
                        >
                            <div
                                className={cn(
                                    'h-32 flex items-center justify-center p-6 bg-gradient-to-br',
                                    theme.backgroundColor
                                )}
                            >
                                {iconName && <Icon name={iconName} className={cn('h-16 w-16', theme.textColor)} />}
                            </div>
                            <CardHeader>
                                <CardTitle>{career.nom}</CardTitle>
                                <CardDescription className="text-sm">{career.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-semibold">Curseur:</span>
                                    <span className={cn('px-2 py-1 rounded-full bg-muted')}>
                                        {theme.cursor.replace('cursor-', '')}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                        {isPending && (
                            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        )}
                        {isSelected && (
                             <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1.5">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    );
}
