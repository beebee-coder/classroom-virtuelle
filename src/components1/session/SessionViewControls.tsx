// src/components/session/SessionViewControls.tsx
'use client';

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Camera, LayoutTemplate, ScreenShare } from "lucide-react";
import { SessionViewMode } from "@/app/session/[id]/page";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface SessionViewControlsProps {
    currentView: SessionViewMode;
    onSetView: (view: SessionViewMode) => void;
}

export function SessionViewControls({ currentView, onSetView }: SessionViewControlsProps) {
    return (
        <div className="p-2 bg-muted rounded-lg flex items-center justify-center border">
            <TooltipProvider>
                <ToggleGroup
                    type="single"
                    value={currentView}
                    onValueChange={(value: string) => {
                        if (value) onSetView(value as SessionViewMode);
                    }}
                    aria-label="Contrôles de la vue"
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem value="split" aria-label="Vue partagée">
                                <LayoutTemplate className="h-4 w-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Vue partagée (Caméra et Tableau Blanc)</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <ToggleGroupItem value="camera" aria-label="Vue caméra">
                                <Camera className="h-4 w-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Vue Caméra seulement</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem value="whiteboard" aria-label="Vue tableau blanc">
                                <LayoutTemplate className="h-4 w-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                         <TooltipContent>
                            <p>Vue Tableau Blanc seulement</p>
                        </TooltipContent>
                    </Tooltip>
                </ToggleGroup>
            </TooltipProvider>
        </div>
    );
}
