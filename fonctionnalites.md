# Documentation des Fonctionnalités de Classroom Connector

Ce document détaille l'ensemble des fonctionnalités implémentées dans la plateforme, en mettant l'accent sur les outils pédagogiques temps réel et les mécanismes d'engagement des élèves.

## Arborescence du Projet

L'architecture du projet est conçue pour être modulaire et évolutive, en s'appuyant sur les conventions de Next.js et une séparation claire des responsabilités.

```
classroom-virtuelle/
│
├── 📁 docs/
│   ├── auth-bootstrap-logic.md
│   ├── auth-flow-reference.md
│   ├── auth-reference.md
│   ├── gamification-ranking-guide.md
│   └── streaming-and-spotlight-guide.md
│
├── 📁 prisma/
│
├── 📁 public/
│
├── 📁 src/
│   ├── 📁 ai/
│   │   ├── flows/
│   │   └── schemas.ts
│   │
│   ├── 📁 app/
│   │   ├── 📁 api/
│   │   │   ├── ably/
│   │   │   ├── auth/
│   │   │   └── session/
│   │   ├── 📁 (pages)/
│   │   │   ├── librairie-metiers/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── session/[id]/
│   │   │   ├── student/
│   │   │   └── teacher/
│   │   └── layout.tsx, page.tsx, globals.css ...
│   │
│   ├── 📁 components/
│   │   ├── 📁 session/
│   │   │   ├── breakout/
│   │   │   ├── quiz/
│   │   │   ├── ClassStudentList.tsx
│   │   │   ├── DocumentHistory.tsx
│   │   │   ├── ... (et autres composants de session)
│   │   ├── 📁 ui/
│   │   └── ... (autres composants)
│   │
│   ├── 📁 hooks/
│   │   ├── session/
│   │   ├── useAbly.ts
│   │   ├── useAblyHealth.ts
│   │   ├── useAblyPresence.ts
│   │   └── useAblyWhiteboardSync.ts
│   │
│   ├── 📁 lib/
│   │   ├── 📁 ably/
│   │   ├── 📁 actions/
│   │   ├── auth-options.ts
│   │   ├── constants.ts
│   │   └── prisma.ts
│   │
│   └── 📁 types/
│       ├── index.ts
│       └── next-auth.d.ts
│
└── ... (Fichiers de configuration: next.config.js, tailwind.config.ts, etc.)
```

---

## Fonctionnalités Temps Réel (via Ably)

Le système de communication en temps réel a été entièrement migré vers Ably et considérablement enrichi pour offrir une expérience de classe virtuelle fluide et interactive.

### Socle Technique
-   **Authentification Sécurisée** : Les clients s'authentifient via un flux de token sécurisé (`/api/ably/auth`) qui vérifie leur session NextAuth, garantissant que seuls les utilisateurs connectés peuvent accéder aux canaux.
-   **Gestion de la Présence** : Le hook `useAblyPresence` permet de savoir en temps réel qui est connecté dans une classe ou une session, affichant le statut "en ligne" ou "hors ligne" des participants.
-   **Synchronisation des Événements** : Tous les événements (lever de main, changement d'outil, etc.) sont maintenant diffusés via des canaux Ably typés et sécurisés, définis dans `src/lib/ably/events.ts`.

### Outils Pédagogiques Avancés

-   **Tableau Blanc Collaboratif Avancé** :
    -   Synchronisation performante des opérations de dessin gérée par le hook `useAblyWhiteboardSync`, qui utilise une stratégie de "batching" pour optimiser les envois de données.
    -   **Partage de Documents** : Le professeur peut téléverser des images ou des PDF. Les fichiers sont hébergés sur Cloudinary, et l'URL est diffusée en temps réel pour un affichage instantané chez tous les participants.
    -   **Gestion des Contrôles** : Le professeur peut assigner le contrôle du tableau blanc à n'importe quel élève, lui donnant la possibilité de dessiner.

-   **Partage d'Écran** :
    -   Le professeur peut partager son écran (ou une fenêtre/onglet) en utilisant l'API native `getDisplayMedia`.
    -   Le flux vidéo de sa caméra est dynamiquement remplacé par le flux de l'écran pour tous les participants via WebRTC, assurant une diffusion fluide et à faible latence.

-   **Groupes de Travail (Breakout Rooms)** :
    -   Une interface (`BreakoutRoomsManager.tsx`) permet au professeur de créer des sous-groupes en quelques clics.
    -   Il peut assigner les élèves manuellement (par glisser-déposer) ou de manière aléatoire.
    -   Une consigne (`task`) et un document peuvent être attachés à chaque groupe.
    -   Le lancement de la fonctionnalité diffuse un événement `BREAKOUT_ROOMS_STARTED` qui isole les élèves dans une vue dédiée.

-   **Quiz Interactifs en Temps Réel** :
    -   **Création** : Le professeur dispose d'une interface dédiée (`QuizLauncher.tsx`) pour créer des questions à choix multiples.
    -   **Diffusion** : Le lancement du quiz déclenche un événement `QUIZ_STARTED` qui l'affiche sur l'écran des élèves.
    -   **Suivi en Direct** : Chaque réponse d'élève est envoyée via l'événement `QUIZ_RESPONSE`. Le professeur voit les statistiques de réponse (nombre de réponses par option) se mettre à jour en temps réel.
    -   **Résultats** : À la fin, le professeur peut afficher un classement des meilleurs scores à toute la classe.

-   **Sondage Rapide de Compréhension** :
    -   Les élèves disposent de trois boutons (`Compris`, `Confus`, `Perdu`) pour signaler leur niveau de compréhension à tout moment.
    -   Le professeur voit une synthèse en temps réel du nombre d'élèves dans chaque catégorie (`QuickPollResults.tsx`), lui permettant d'adapter son cours instantanément.

### Engagement et Gamification

-   **Points d'Activité (Heartbeat)** :
    -   Pendant une session en direct, le client de chaque élève envoie périodiquement une "pulsation" au serveur.
    -   L'action serveur `trackStudentActivity` vérifie cette activité et attribue des points à l'élève, qui s'ajoutent à son score global.
    -   Le système inclut des gardes-fous (limite journalière, etc.) pour assurer l'équité et prévenir les abus.
Agis en tant qu'expert senior en développement Next.js, TypeScript et architecture de systèmes temps réel.  je vais de te donner les consoles log de professeur et console log de l'eleve , tu va investiguer les erreurs une par une ,examiner localiser les fichiers concernés ,tu me demandes les fichiers concerner je te donne un par un ,tu va corriger les erreures puis s'assurer de ne pas commetre ni laisser des erreurs ni reformer d'autres fonctionalitées qui fonctionne deja , donc correction specefique (dans le cadre de la structure generale et la logique structurelle ) de typescript et de logique ,rendre le meilleur des versions corrigés seule et bien suivre l'enchainement des corrections ,une fois corriger tu passe a l'erreur suivante : aprés avoire redonner le fichier complet corrigé
