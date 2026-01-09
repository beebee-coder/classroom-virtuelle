// src/components/session/breakout/BreakoutRoomsManager.tsx
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Rocket, Users, Shuffle, Send, FileText } from 'lucide-react';
import type { BreakoutRoom, DocumentInHistory } from '@/types';
import type { User as PrismaUser } from '@prisma/client';
import { ablyTrigger } from '@/lib/ably/triggers';
import { AblyEvents } from '@/lib/ably/events';
import { getSessionChannelName } from '@/lib/ably/channels';

interface BreakoutRoomsManagerProps {
    sessionId: string;
    students: PrismaUser[];
    documentHistory: DocumentInHistory[];
}

export function BreakoutRoomsManager({ sessionId, students, documentHistory }: BreakoutRoomsManagerProps) {
    const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
    const [unassignedStudents, setUnassignedStudents] = useState<PrismaUser[]>(students);
    const [isLaunched, setIsLaunched] = useState(false);

    const handleRoomCountChange = (countStr: string) => {
        const count = parseInt(countStr, 10);
        if (isNaN(count) || count < 1) return;

        const newRooms: BreakoutRoom[] = Array.from({ length: count }, (_, i) => ({
            id: `room-${i + 1}`,
            name: `Groupe ${i + 1}`,
            task: '',
            participants: [],
            documentId: null,
            documentName: null,
            documentUrl: null,
        }));
        
        const allStudentsInRooms = rooms.flatMap(r => r.participants);
        const allStudentsAvailable = [...unassignedStudents, ...allStudentsInRooms];

        setRooms(newRooms);
        setUnassignedStudents(allStudentsAvailable);
    };

    const autoAssignStudents = () => {
        if (rooms.length === 0) return;
        const shuffledStudents = [...unassignedStudents].sort(() => Math.random() - 0.5);
        const newRooms = rooms.map(room => ({ ...room, participants: [] as PrismaUser[] }));
        
        shuffledStudents.forEach((student, index) => {
            newRooms[index % rooms.length].participants.push(student);
        });

        setRooms(newRooms);
        setUnassignedStudents([]);
    };

    const handleTaskChange = (roomId: string, task: string) => {
        setRooms(rooms.map(room => room.id === roomId ? { ...room, task } : room));
    };

    const handleDocumentChange = (roomId: string, documentId: string) => {
        if (documentId === 'none') {
            setRooms(rooms.map(room => room.id === roomId ? {
                ...room,
                documentId: null,
                documentName: null,
                documentUrl: null,
            } : room));
        } else {
            const selectedDoc = documentHistory.find(doc => doc.id === documentId);
            setRooms(rooms.map(room => room.id === roomId ? { 
                ...room, 
                documentId: selectedDoc?.id || null,
                documentName: selectedDoc?.name || null,
                documentUrl: selectedDoc?.url || null,
             } : room));
        }
    }

    const handleLaunch = async () => {
        if (rooms.some(room => !room.task.trim())) {
            alert("Veuillez assigner une tâche (consigne) à chaque groupe.");
            return;
        }

        console.log('🚀 [BREAKOUT] Lancement des groupes de travail...');
        await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.BREAKOUT_ROOMS_STARTED, { rooms });
        setIsLaunched(true);
    };

    const handleEnd = async () => {
        console.log('🛑 [BREAKOUT] Fin des groupes de travail...');
        await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.BREAKOUT_ROOMS_ENDED, {});
        setIsLaunched(false);
        setRooms([]);
        setUnassignedStudents(students);
    };

    // Drag and drop logic
    const onDragStart = (e: React.DragEvent, studentId: string) => e.dataTransfer.setData("studentId", studentId);
    const onDragOver = (e: React.DragEvent) => e.preventDefault();
    const onDrop = (e: React.DragEvent, roomId: string | null) => {
        e.preventDefault();
        const studentId = e.dataTransfer.getData("studentId");
        if (!studentId) return;

        let studentToMove: PrismaUser | undefined;
        let sourceRoomId: string | null = null;
        
        studentToMove = unassignedStudents.find(s => s.id === studentId);
        if (!studentToMove) {
            for (const room of rooms) {
                const found = room.participants.find(p => p.id === studentId);
                if (found) {
                    studentToMove = found;
                    sourceRoomId = room.id;
                    break;
                }
            }
        }
        
        if (!studentToMove) return;

        const newRooms = rooms.map(r => ({ ...r, participants: [...r.participants] }));
        let newUnassigned = [...unassignedStudents];

        if (sourceRoomId) {
            const sourceRoom = newRooms.find(r => r.id === sourceRoomId)!;
            sourceRoom.participants = sourceRoom.participants.filter(p => p.id !== studentId);
        } else {
            newUnassigned = newUnassigned.filter(s => s.id !== studentId);
        }

        if (roomId) {
            const destRoom = newRooms.find(r => r.id === roomId)!;
            if (!destRoom.participants.some(p => p.id === studentId)) {
                destRoom.participants.push(studentToMove);
            }
        } else {
            if (!newUnassigned.some(s => s.id === studentId)) {
                newUnassigned.push(studentToMove);
            }
        }

        setRooms(newRooms);
        setUnassignedStudents(newUnassigned);
    };

    if (isLaunched) {
        return (
            <Card className="h-full w-full flex flex-col">
                <CardHeader>
                    <CardTitle>Groupes de Travail Actifs</CardTitle>
                    <CardDescription>Les élèves sont répartis. Vous pouvez mettre fin à la session à tout moment.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4">
                    {rooms.map(room => (
                        <div key={room.id} className="p-4 border rounded-lg">
                            <h4 className="font-bold">{room.name}</h4>
                            <p className="text-sm text-muted-foreground mb-2">Consigne: {room.task}</p>
                            {room.documentName && <p className="text-sm text-muted-foreground mb-2">Document: {room.documentName}</p>}
                            <div className="flex flex-wrap gap-2">
                                {room.participants.map(p => <div key={p.id} className="text-xs bg-muted px-2 py-1 rounded">{p.name}</div>)}
                            </div>
                        </div>
                    ))}
                </CardContent>
                <div className="p-6 border-t">
                    <Button variant="destructive" className="w-full" onClick={handleEnd}>
                        Terminer les Groupes
                    </Button>
                </div>
            </Card>
        );
    }
    
    return (
        <div className="h-full w-full flex flex-col gap-4 p-4">
            <div className="flex-shrink-0">
                <Card>
                    <CardHeader>
                        <CardTitle>Configurer les Groupes de Travail</CardTitle>
                        <CardDescription>
                            Définissez le nombre de groupes, assignez les élèves, donnez une consigne et un document, puis lancez.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Label>Nombre de groupes</Label>
                        <Select onValueChange={handleRoomCountChange} defaultValue={rooms.length > 0 ? rooms.length.toString() : ""}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(Math.min(10, students.length || 1))].map((_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={autoAssignStudents} disabled={rooms.length === 0}>
                            <Shuffle className="mr-2 h-4 w-4" /> Répartir aléatoirement
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
                <div 
                    className="md:col-span-1 border-dashed border-2 rounded-lg p-4 overflow-y-auto"
                    onDrop={(e) => onDrop(e, null)}
                    onDragOver={onDragOver}
                >
                    <h3 className="font-semibold mb-2">Élèves non assignés ({unassignedStudents.length})</h3>
                    <div className="space-y-2">
                        {unassignedStudents.map(student => (
                            <div key={student.id} draggable onDragStart={(e) => onDragStart(e, student.id)} className="flex items-center gap-2 p-2 bg-card border rounded cursor-grab">
                                <User className="h-4 w-4" /> {student.name}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto p-1">
                    {rooms.map(room => (
                        <div 
                            key={room.id}
                            className="border rounded-lg p-4 flex flex-col gap-3 bg-background"
                            onDrop={(e) => onDrop(e, room.id)}
                            onDragOver={onDragOver}
                        >
                            <h3 className="font-bold">{room.name} ({room.participants.length})</h3>
                            <Input 
                                placeholder="Consigne pour ce groupe..." 
                                value={room.task}
                                onChange={(e) => handleTaskChange(room.id, e.target.value)}
                            />
                             <Select onValueChange={(docId) => handleDocumentChange(room.id, docId)} value={room.documentId ?? 'none'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Associer un document..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucun document</SelectItem>
                                    {documentHistory.map(doc => (
                                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="space-y-2 min-h-[50px] bg-muted/50 p-2 rounded flex-1">
                                {room.participants.map(student => (
                                    <div key={student.id} draggable onDragStart={(e) => onDragStart(e, student.id)} className="flex items-center gap-2 p-2 bg-card border rounded cursor-grab">
                                        <User className="h-4 w-4" /> {student.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

             <div className="flex-shrink-0 p-4 border-t bg-card">
                <Button className="w-full" onClick={handleLaunch} disabled={rooms.length === 0}>
                    <Rocket className="mr-2" /> Lancer les Groupes
                </Button>
            </div>
        </div>
    );
}
