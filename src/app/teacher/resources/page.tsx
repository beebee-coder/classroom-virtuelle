// src/app/teacher/resources/page.tsx
import { redirect } from 'next/navigation';
import { getAuthSession } from "@/lib/auth";
import { getTeacherDocuments } from '@/lib/actions/session.actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/BackButton';
import { FileText, Folder } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TeacherResourcesPage() {
    console.log('📚 [PAGE] Loading Teacher Resources page...');
    const session = await getAuthSession();

    if (!session?.user || session.user.role !== 'PROFESSEUR') {
        redirect('/login');
    }

    const documents = await getTeacherDocuments();
    console.log(`✅ [PAGE] Found ${documents.length} documents for the library.`);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Ma Bibliothèque de Ressources</h1>
                        <p className="text-muted-foreground">
                            Retrouvez tous les documents que vous avez partagés.
                        </p>
                    </div>
                </div>
            </div>

            {documents.length === 0 ? (
                <Card className="text-center p-8">
                    <CardHeader>
                        <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <CardTitle>Votre bibliothèque est vide</CardTitle>
                        <CardDescription>
                            Les documents que vous partagez dans les sessions apparaîtront ici.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {documents.map(doc => (
                        <a 
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block"
                        >
                            <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
                                <CardHeader className="flex-row items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <FileText className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle className="text-base font-medium truncate" title={doc.name}>
                                        {doc.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">
                                        Ajouté le {format(parseISO(doc.createdAt), "d MMMM yyyy", { locale: fr })}
                                    </p>
                                </CardContent>
                            </Card>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
