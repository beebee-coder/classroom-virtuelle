// app/teacher/future-classroom/page.tsx
// import { EmotionalAITutor } from '@/components/EmotionalAITutor';
import { VirtualClassroom } from '@/components/VirtualClassroom';
import { NeuroFeedback } from '@/components/NeuroFeedback';
import { CareerPredictor } from '@/components/CareerPredictor';
import { Header } from '@/components/Header';
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';

export default async function FutureClassroomPage() {
  const session = await getAuthSession();
  if (session?.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header user={session.user}>
          <SidebarTrigger />
        </Header>
        <div className="flex flex-1">
          <Sidebar>
            <SidebarContent>
              <Menu user={session.user} />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
              <div className="max-w-7xl mx-auto space-y-8">
                
                <div className="flex items-center gap-4">
                  <BackButton />
                </div>

                {/* Header Futuriste */}
                <div className="text-center mb-12">
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 bg-clip-text text-transparent mb-4">
                    Classe du Futur 4.0
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Plateforme d'apprentissage augmenté par l'IA, la réalité virtuelle et les neurosciences
                  </p>
                </div>

                {/* Grid Principal */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Colonne Gauche */}
                  <div className="space-y-8">
                    {/* <EmotionalAITutor /> */}
                    <NeuroFeedback />
                  </div>

                  {/* Colonne Droite */}
                  <div className="space-y-8">
                    <VirtualClassroom />
                    <CareerPredictor />
                  </div>
                </div>

                {/* Metrics en Temps Réel */}
                <div className="bg-black text-white rounded-2xl p-6 mt-12">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                      <div className="text-3xl font-bold text-green-400">94.7%</div>
                      <div className="text-sm text-gray-400">Engagement Moyen</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-400">3.2x</div>
                      <div className="text-sm text-gray-400">Accélération Apprentissage</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-purple-400">87.3%</div>
                      <div className="text-sm text-gray-400">Retention à 6 Mois</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-yellow-400">AI-Powered</div>
                      <div className="text-sm text-gray-400">Optimisation Continue</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
