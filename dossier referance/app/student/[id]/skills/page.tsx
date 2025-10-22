// src/app/student/[id]/skills/page.tsx
import { BackButton } from '@/components/BackButton';

export default function StudentSkillsPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="mb-6">
        <BackButton />
      </div>
      <h1 className="text-2xl font-bold mb-6">Compétences de l'élève</h1>
      
      <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg p-4 mb-6">
        <p className="flex items-center gap-2">
            <span className="font-bold">🚧 Maintenance</span>
            <span>Cette section est temporairement indisponible. Elle sera de retour très bientôt !</span>
        </p>
      </div>

      {/* Statistiques basiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 rounded-lg shadow text-center">
          <div className="text-lg font-semibold text-muted-foreground">Tâches</div>
          <div className="text-2xl text-primary font-bold mt-2">24</div>
        </div>
        <div className="bg-card p-4 rounded-lg shadow text-center">
          <div className="text-lg font-semibold text-muted-foreground">Réussite</div>
          <div className="text-2xl text-green-600 font-bold mt-2">85%</div>
        </div>
        <div className="bg-card p-4 rounded-lg shadow text-center">
          <div className="text-lg font-semibold text-muted-foreground">Participation</div>
          <div className="text-2xl text-purple-600 font-bold mt-2">92%</div>
        </div>
        <div className="bg-card p-4 rounded-lg shadow text-center">
          <div className="text-lg font-semibold text-muted-foreground">Succès</div>
          <div className="text-2xl text-orange-600 font-bold mt-2">3</div>
        </div>
      </div>
    </div>
  );
}
