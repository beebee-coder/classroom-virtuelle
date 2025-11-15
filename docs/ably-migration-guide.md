# Guide de Migration et Architecture Ably

Ce document résume la migration du système temps réel de Pusher vers Ably et décrit la nouvelle architecture mise en place.

## 1. Contexte de la Migration

L'application dépassait les quotas du plan gratuit de Pusher, entraînant des déconnexions et une perte de synchronisation pour les utilisateurs. Ably a été choisi comme solution de remplacement pour sa robustesse et ses plans plus généreux.

## 2. Nouvelle Architecture avec Ably

L'architecture temps réel repose désormais sur une série de fichiers et de hooks dédiés à Ably, situés dans `src/lib/ably/` et `src/hooks/`.

### 2.1 Configuration des Clients (`lib/ably/`)

-   **`server.ts`**: Initialise un client **REST singleton** pour les opérations côté serveur (comme le déclenchement d'événements). Utilise la clé API secrète.
-   **`client.ts`**: Configure le client **Realtime** pour le navigateur. Ce client utilise une authentification par token via la route API `/api/ably/auth` pour sécuriser les connexions.
-   **`auth/route.ts` (API)**: Route côté serveur qui authentifie la session NextAuth de l'utilisateur et lui délivre un token Ably avec des permissions granulaires pour interagir avec les canaux.

### 2.2 Gestion des Canaux (`lib/ably/channels.ts`)

Ce fichier est une "fabrique" qui génère les noms de canaux de manière standardisée pour éviter les erreurs :
-   `getSessionChannelName(id)`: Pour les canaux de session (ex: `[presence]classroom-connector:session:xyz`).
-   `getClassChannelName(id)`: Pour les canaux de classe (ex: `[presence]classroom-connector:class:abc`).
-   `getUserChannelName(id)`: Pour les canaux privés d'un utilisateur (ex: `classroom-connector:user:123`).

### 2.3 Gestion des Événements (`lib/ably/events.ts` et `triggers.ts`)

-   **`events.ts`**: Contient un objet `AblyEvents` qui définit toutes les constantes pour les noms d'événements (ex: `SESSION_ENDED`, `HAND_RAISE_UPDATE`).
-   **`triggers.ts`**: Exporte la fonction `ablyTrigger`, qui remplace `pusherTrigger`. C'est une action serveur qui publie des événements sur les canaux Ably de manière sécurisée.

### 2.4 Hooks React (`hooks/`)

-   **`useAbly.ts`**: Hook de base qui fournit une instance du client Ably à n'importe quel composant.
-   **`useAblyPresence.ts`**: Hook unifié pour la gestion de la présence. Il s'abonne à un canal de présence et retourne la liste des membres en ligne.
-   **`useAblyWhiteboardSync.ts`**: Gère spécifiquement la synchronisation du tableau blanc. Il écoute les événements de dessin entrants et met en file d'attente (batch) les opérations sortantes pour optimiser les performances.
-   **`useAblyHealth.ts`**: Surveille l'état de la connexion Ably et est utilisé par le composant `AblyStatusIndicator`.

## 3. Flux de Données

1.  **Connexion** : Un composant client (ex: `SessionClient`) utilise le hook `useAbly` pour obtenir le client Ably, qui s'authentifie automatiquement via `/api/ably/auth`.
2.  **Présence** : Le hook `useAblyPresence` s'abonne à un canal de présence (ex: `class-xyz`) et met à jour l'interface avec la liste des utilisateurs connectés.
3.  **Publication d'Événements** : Une action utilisateur (ex: le professeur met un élève en vedette) déclenche une action serveur (ex: `spotlightParticipant`). Cette action serveur appelle `ablyTrigger`.
4.  **Diffusion** : `ablyTrigger` publie l'événement sur le canal de session Ably approprié.
5.  **Réception** : Les hooks côté client (`useAblyPresence`, `useAblyWhiteboardSync`, etc.) sont abonnés au canal et reçoivent l'événement, puis mettent à jour l'état du composant React, ce qui provoque un re-rendu de l'interface.

## 4. Nettoyage

Tous les fichiers, dépendances (`pusher`, `pusher-js`), hooks et routes API liés à Pusher ont été supprimés du projet.