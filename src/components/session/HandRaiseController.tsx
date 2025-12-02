// src/components/session/HandRaiseController.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hand } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { User } from '@prisma/client';

interface HandRaiseControllerProps {
  raisedHandQueue: User[];
  onAcknowledgeNext: () => void;
}

export function HandRaiseController({ raisedHandQueue, onAcknowledgeNext }: HandRaiseControllerProps) {
  
  return (
    <Card className='bg-background/80'>
        <Accordion type="single" collapsible defaultValue="hand-raises">
            <AccordionItem value="hand-raises" className="border-b-0">
                <AccordionTrigger className="p-6">
                     <div className="flex items-center gap-2 text-base font-semibold">
                        <Hand className="h-5 w-5 text-primary" />
                        Mains Levées ({raisedHandQueue.length})
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="space-y-3 pt-0">
                        {raisedHandQueue.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center">Aucune main levée pour le moment.</p>
                        ) : (
                          <>
                            {raisedHandQueue.map((user, index) => (
                                <div key={user.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center gap-3">
                                      <span className="font-bold text-blue-600">{index + 1}.</span>
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-sm">{user.name}</span>
                                  </div>
                                </div>
                            ))}
                            <Button className="w-full mt-4" onClick={onAcknowledgeNext} disabled={raisedHandQueue.length === 0}>
                              Traiter le suivant
                            </Button>
                          </>
                        )}
                    </CardContent>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </Card>
  );
}
