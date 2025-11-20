# Documentation des Fonctionnalités de Classroom Connector

## Arborescence du Projet (Après Évolutions)

```
classroom-virtuelle-main/
│
├── 📁 docs/
│
├── 📁 prisma/
│
├── 📁 public/
│
├── 📁 src/
│   ├── 📁 ai/
│   ├── 📁 app/
│   │   ├── 📁 api/
│   │   │   ├── 📁 ably/
│   │   │   ├── 📁 auth/
│   │   │   └── 📁 session/
│   │   ├── 📁 login/
│   │   ├── 📁 session/
│   │   │   └── 📁 [id]/
│   │   │       └── page.tsx
│   │   ├── 📁 student/
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📁 parent/
│   │   │   └── 📁 dashboard/
│   │   └── 📁 teacher/
│   │       ├── 📁 class/
│   │       ├── 📁 classes/
│   │       ├── 📁 dashboard/
│   │       └── 📁 validations/
│   │
│   ├── 📁 components/
│   │   ├── 📁 ably/
│   │   ├── 📁 session/
│   │   │   ├── 📁 breakout/
│   │   │   │   └── BreakoutRoomsManager.tsx
│   │   │   ├── 📁 quiz/
│   │   │   │   ├── QuizLauncher.tsx
│   │   │   │   └── QuizView.tsx
│   │   │   ├── ClassStudentList.tsx
│   │   │   ├── DocumentHistory.tsx
│   │   │   ├── DocumentUploadSection.tsx
│   │   │   ├── DocumentViewer.tsx
│   │   │   ├── QuickPollResults.tsx
│   │   │   ├── SessionHeader.tsx
│   │   │   ├── StudentSessionView.tsx
│   │   │   └── TeacherSessionView.tsx
│   │   ├── 📁 ui/
│   │   └── ... (autres composants)
│   │
│   ├── 📁 hooks/
│   │   ├── useAbly.ts
│   │   ├── useAblyHealth.ts
│   │   ├── useAblyPresence.ts
│   │   └── useAblyWhiteboardSync.ts
│   │
│   ├── 📁 lib/
│   │   ├── 📁 ably/
│   │   │   ├── channels.ts
│   │   │   ├── client.ts
│   │   │   ├── events.ts
│   │   │   └── server.ts
│   │   ├── 📁 actions/
│   │   │   ├── ably-session.actions.ts
│   │   │   ├── activity.actions.ts
│   │   │   └── session.actions.ts
│   │   ├── auth-options.ts
│   │   ├── constants.ts
│   │   └── prisma.ts
│   │
│   └── 📁 types/
│       ├── index.ts
│       └── next-auth.d.ts
│
└── ... (Autres fichiers de configuration)
```

## Fonctionnalités Temps Réel (via Ably)

Le système de communication en temps réel a été entièrement migré vers Ably et considérablement enrichi.

### Socle Technique
-   **Authentification Sécurisée** : Les clients s'authentifient via un flux de token sécurisé qui vérifie leur session NextAuth.
-   **Gestion de la Présence** : Les hooks `useAblyPresence` permettent de savoir en temps réel qui est connecté dans une classe ou une session.
-   **Synchronisation des Événements** : Tous les événements sont maintenant diffusés via des canaux Ably typés, définis dans `src/lib/ably/events.ts`.

### Outils Pédagogiques Avancés

-   **Tableau Blanc Collaboratif Avancé** :
    -   Synchronisation performante des opérations de dessin via une stratégie de "batching" gérée par le hook `useAblyWhiteboardSync`.
    -   **Partage de Documents** : Le professeur peut téléverser des images ou PDF via une interface dédiée. Les fichiers sont stockés sur Cloudinary et l'URL est diffusée en temps réel pour un affichage instantané chez tous les participants.
    -   **Gestion des Contrôles** : Le professeur peut assigner le contrôle du tableau blanc à n'importe quel élève.

-   **Partage d'Écran** :
    -   Le professeur peut partager son écran (ou une fenêtre/onglet) en utilisant l'API native `getDisplayMedia`.
    -   Le flux vidéo de la caméra est dynamiquement remplacé par le flux de l'écran pour tous les participants via WebRTC, assurant une diffusion fluide.

-   **Groupes de Travail (Breakout Rooms)** :
    -   Une interface (`BreakoutRoomsManager.tsx`) permet au professeur de créer des sous-groupes.
    -   Il peut assigner les élèves manuellement (par glisser-déposer) ou de manière aléatoire.
    -   Une consigne (`task`) peut être définie pour chaque groupe.
    -   Le lancement diffuse un événement `BREAKOUT_ROOMS_STARTED` aux élèves concernés pour les rediriger (logique future).

-   **Quiz Interactifs en Temps Réel** :
    -   **Création** : Le professeur dispose d'un lanceur de quiz (`QuizLauncher.tsx`) pour créer des questions à choix multiples.
    -   **Diffusion** : Le lancement du quiz déclenche un événement `QUIZ_STARTED` qui l'affiche sur l'écran des élèves.
    -   **Suivi en Direct** : Chaque réponse d'élève est envoyée via l'événement `QUIZ_RESPONSE`. Le professeur voit les statistiques de réponse pour chaque question se mettre à jour en temps réel.
    -   **Résultats** : À la fin, le professeur peut afficher les résultats finaux agrégés à toute la classe.

-   **Sondage Rapide de Compréhension** :
    -   Les élèves disposent de trois boutons (`Compris`, `Confus`, `Perdu`) pour signaler leur niveau de compréhension à tout moment.
    -   Le professeur voit une synthèse en temps réel du nombre d'élèves dans chaque catégorie, lui permettant d'adapter son cours instantanément.

### Engagement et Gamification

-   **Points d'Activité (Heartbeat)** :
    -   Pendant une session, le client de chaque élève envoie périodiquement une "pulsation" au serveur.
    -   L'action `trackStudentActivity` vérifie cette activité et attribue des points à l'élève, qui s'ajoutent à son score global.
    -   Le système inclut des gardes-fous (limite journalière) pour assurer l'équité.
