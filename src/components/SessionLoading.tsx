// src/components/SessionLoading.tsx
export default function SessionLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Spinner animé */}
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
                </div>
                
                {/* Texte de chargement */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">
                        Préparation de la session
                    </h2>
                    <p className="text-muted-foreground">
                        Nous initialisons votre environnement de cours en ligne...
                    </p>
                </div>

                {/* Barre de progression simulée */}
                <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full animate-pulse w-3/4"></div>
                </div>

                {/* Indicateurs de fonctionnalités */}
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Audio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Vidéo</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Partage d'écran</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Tableau blanc</span>
                    </div>
                </div>
            </div>
        </div>
    );
}