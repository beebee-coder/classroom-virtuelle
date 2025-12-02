// src/components/Html5Whiteboard.tsx
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pen, Eraser, Trash2, Download } from 'lucide-react';
import { Button } from './ui/button';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Separator } from './ui/separator';
import type { WhiteboardOperation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface WhiteboardProps {
  sessionId: string;
  userId: string;
  isController: boolean;
  operations: WhiteboardOperation[];
  onEvent: (op: WhiteboardOperation[]) => void;
  flushOperations?: () => void;
}

type Tool = 'pen' | 'eraser';

// Fonction de dessin optimisée
const drawPath = (ctx: CanvasRenderingContext2D, path: { points: {x: number, y: number}[], color: string, brushSize: number }) => {
  if (path.points.length < 2) return;
  
  ctx.beginPath();
  ctx.moveTo(path.points[0].x, path.points[0].y);
  
  for (let i = 1; i < path.points.length; i++) {
    ctx.lineTo(path.points[i].x, path.points[i].y);
  }
  
  ctx.strokeStyle = path.color;
  ctx.lineWidth = path.brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
};

export const Html5Whiteboard: React.FC<WhiteboardProps> = React.memo(function Whiteboard({
  sessionId,
  userId,
  isController,
  operations = [],
  onEvent,
  flushOperations,
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  
  const lastPointRef = useRef<{ x: number, y: number } | null>(null);
  const currentPathId = useRef<string | null>(null);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paths = new Map<string, { points: {x: number, y: number}[], color: string, brushSize: number }>();
    const sortedOperations = [...operations].sort((a, b) => a.timestamp - b.timestamp);

    for (const op of sortedOperations) {
      if (op.type === 'CLEAR') {
        paths.clear();
      } else if (op.type === 'DRAW') {
        let path = paths.get(op.pathId);
        if (!path) {
          path = {
            points: [op.payload.from],
            color: op.payload.color,
            brushSize: op.payload.brushSize,
          };
          paths.set(op.pathId, path);
        }
        path.points.push(op.payload.to);
      }
    }
    
    paths.forEach(p => drawPath(ctx, p));
  }, [operations]);
  
  useEffect(() => {
    redrawCanvas();
  }, [operations, redrawCanvas]);

  useEffect(() => {
    const handleResize = () => redrawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isController) return;
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (!point) return;

    setIsDrawing(true);
    lastPointRef.current = point;
    currentPathId.current = uuidv4();
  }, [isController, getCanvasPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !isController || !lastPointRef.current || !currentPathId.current) return;
    
    const currentPoint = getCanvasPoint(e.clientX, e.clientY);
    if (!currentPoint) return;
    
    const event: WhiteboardOperation = {
      id: uuidv4(),
      pathId: currentPathId.current,
      userId,
      sessionId,
      timestamp: Date.now(),
      type: 'DRAW',
      payload: {
        from: lastPointRef.current,
        to: currentPoint,
        tool: tool,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        brushSize: tool === 'eraser' ? 20 : brushSize,
      },
    };
    
    onEvent([event]); 
    lastPointRef.current = currentPoint;
  }, [isDrawing, isController, getCanvasPoint, tool, color, brushSize, onEvent, sessionId, userId]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    lastPointRef.current = null;
    currentPathId.current = null;
    
    if (flushOperations) {
      flushOperations();
    }
  }, [isDrawing, flushOperations]);

  const handleClearCanvas = useCallback(() => {
    if (!isController) return;
    
    const event: WhiteboardOperation = {
      id: uuidv4(),
      pathId: uuidv4(),
      userId,
      sessionId,
      timestamp: Date.now(),
      type: 'CLEAR'
    };
    
    onEvent([event]);
    
    if (flushOperations) {
      flushOperations();
    }
  }, [isController, onEvent, sessionId, userId, flushOperations]);

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${sessionId}-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, [sessionId]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isController) return;
    e.preventDefault();
    const touch = e.touches[0];
    const point = getCanvasPoint(touch.clientX, touch.clientY);
    if (!point) return;

    setIsDrawing(true);
    lastPointRef.current = point;
    currentPathId.current = uuidv4();
  }, [isController, getCanvasPoint]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDrawing || !isController) return;
    e.preventDefault();
    const touch = e.touches[0];
    const currentPoint = getCanvasPoint(touch.clientX, touch.clientY);
    if (!currentPoint || !lastPointRef.current || !currentPathId.current) return;

    const event: WhiteboardOperation = {
      id: uuidv4(),
      pathId: currentPathId.current,
      userId,
      sessionId,
      timestamp: Date.now(),
      type: 'DRAW',
      payload: {
        from: lastPointRef.current,
        to: currentPoint,
        tool: tool,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        brushSize: tool === 'eraser' ? 20 : brushSize,
      },
    };

    onEvent([event]);
    lastPointRef.current = currentPoint;
  }, [isDrawing, isController, getCanvasPoint, tool, color, brushSize, onEvent, sessionId, userId]);

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  return (
    <div className="h-full w-full bg-white border rounded-lg flex flex-col">
      {isController && (
        <div className="p-3 bg-background border-b flex flex-wrap items-center justify-between gap-2 md:gap-4">
          {/* Groupe Outils */}
          <div className="flex items-center gap-1.5">
            <ToggleGroup 
              type="single" 
              value={tool} 
              onValueChange={(value: Tool) => value && setTool(value)} 
              size="sm"
              aria-label="Sélectionner l'outil"
            >
              <ToggleGroupItem value="pen" aria-label="Crayon" className="h-9 w-9 p-0">
                <Pen className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="eraser" aria-label="Gomme" className="h-9 w-9 p-0">
                <Eraser className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            <div className="flex items-center gap-1.5">
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 cursor-pointer rounded border border-input bg-background hover:bg-accent transition-colors"
                disabled={tool === 'eraser'}
                aria-label="Choisir la couleur"
              />
              <span className="text-xs text-muted-foreground hidden sm:block">Couleur</span>
            </div>

            <div className="flex items-center gap-1.5">
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20 accent-primary"
                aria-label="Taille du pinceau"
              />
              <span className="text-xs font-mono w-6 text-right">{brushSize}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button 
              onClick={handleClearCanvas} 
              variant="ghost" 
              size="sm" 
              className="h-9 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Effacer tout le tableau"
            >
              <Trash2 className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline text-xs">Tout effacer</span>
            </Button>
            
            <Button 
              onClick={downloadCanvas} 
              variant="outline" 
              size="sm" 
              className="h-9 px-2.5 border-primary/30 text-primary hover:bg-primary/10"
              aria-label="Télécharger le tableau"
            >
              <Download className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline text-xs">Exporter</span>
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 relative bg-white overflow-hidden select-none">
        {/* Badge flottant : outil actif */}
        {isController && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border border-border shadow-sm text-xs font-medium">
            {tool === 'pen' ? (
              <>
                <Pen className="h-3 w-3 text-primary" />
                <span className="text-primary">Dessin</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-foreground">{brushSize}px</span>
              </>
            ) : (
              <>
                <Eraser className="h-3 w-3 text-destructive" />
                <span className="text-destructive">Gomme</span>
              </>
            )}
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className={`w-full h-full ${isController ? 'cursor-crosshair touch-none' : 'cursor-default'}`}
          onMouseDown={isController ? handleMouseDown : undefined}
          onMouseMove={isController ? handleMouseMove : undefined}
          onMouseUp={isController ? handleMouseUp : undefined}
          onMouseLeave={isController ? handleMouseUp : undefined}
          onTouchStart={isController ? handleTouchStart : undefined}
          onTouchMove={isController ? handleTouchMove : undefined}
          onTouchEnd={isController ? handleTouchEnd : undefined}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
});

Html5Whiteboard.displayName = 'Html5Whiteboard';