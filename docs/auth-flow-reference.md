# Référence du Flux d'Authentification et d'Inscription

Ce document liste les fichiers essentiels impliqués dans le processus complet, de l'arrivée d'un utilisateur à sa redirection vers le tableau de bord approprié.

## 1. Pages d'Entrée (Non authentifié)

- **`src/app/page.tsx`**: Page d'accueil. Affiche la page de bienvenue si l'utilisateur n'est pas connecté. Si une session existe, elle redirige l'utilisateur vers son tableau de bord (`/teacher/dashboard` ou `/student/dashboard`) ou vers la page d'attente si son statut est `PENDING`.

- **`src/app/login/page.tsx` et `src/app/login/login-form.tsx`**: Gère la connexion des utilisateurs existants, soit par identifiants (email/mot de passe), soit via Google. C'est ici que la redirection post-connexion est initiée côté client.

- **`src/app/register/page.tsx` et `src/app/register/register-form.tsx`**: Gère l'inscription de nouveaux utilisateurs, soit via un formulaire, soit en initiant une connexion Google pour la première fois.

## 2. Logique d'Authentification (Cœur du système)

- **`src/lib/auth-options.ts`**: Fichier central pour `next-auth`.
    - **`providers`**: Définit les stratégies `Credentials` (email/password) et `GoogleProvider`.
    - **`GoogleProvider.profile()`**: Fonction cruciale qui assigne le rôle (`PROFESSEUR` ou `ELEVE`) et le statut (`VALIDATED` ou `PENDING`) lors d'une inscription/connexion via Google. Elle vérifie si l'utilisateur existe déjà avant d'en créer un nouveau.
    - **`callbacks (jwt, session)`**: Enrichit le jeton JWT et l'objet de session avec les données personnalisées de l'utilisateur (ID, rôle, statut).

- **`src/app/api/auth/[...nextauth]/route.ts`**: La "catch-all route" qui expose la configuration de `next-auth` en tant que points d'API (`/api/auth/signin`, `/api/auth/callback`, etc.).

## 3. Logique d'Inscription Spécifique

- **`src/app/api/auth/register/route.ts`**: Point d'API **uniquement** pour les inscriptions par formulaire. Il contient la logique pour :
    1.  Vérifier si un utilisateur existe déjà.
    2.  Déterminer le rôle (`PROFESSEUR` si c'est le premier, sinon `ELEVE`).
    3.  Hacher le mot de passe.
    4.  Créer l'utilisateur en base de données.
    
- **`src/lib/prisma.ts` (Middleware Prisma)** : C'est le nouveau cœur de la notification temps réel.
    - Un middleware est configuré pour intercepter chaque création (`create`) d'un `User`.
    - Si le nouvel utilisateur est un `ELEVE` avec le statut `PENDING`, le middleware déclenche l'action serveur `broadcastNewPendingStudent`. Cette approche garantit que la notification est envoyée de manière fiable, quelle que soit la méthode d'inscription (formulaire ou Google).

## 4. Gestion des Notifications Temps Réel

- **`src/lib/actions/ably-session.actions.ts`**: Contient l'action serveur `broadcastNewPendingStudent`, qui publie un message sur le canal Ably global des élèves en attente.

- **`src/app/teacher/validations/ValidationConsoleClient.tsx`**: Le composant côté client qui **écoute** le canal Ably `pending-students`. Il reçoit les notifications en temps réel et met à jour l'interface du professeur avec les nouveaux élèves à valider.

## 5. Validation et Redirection des Élèves

- **`src/app/teacher/validations/page.tsx`**: Page côté serveur qui récupère la liste initiale de **tous** les élèves en attente (`PENDING`) depuis la base de données pour le professeur.

- **`src/lib/actions/teacher.actions.ts`**: Contient l'action `validateStudent`, appelée par le professeur depuis la console de validation. Elle met à jour le statut de l'élève à `VALIDATED` et l'assigne à une classe.

- **`src/app/student/validation-pending/page.tsx`**: La page où un élève est "bloqué". Un `useEffect` vérifie périodiquement l'état de sa session. Dès que le statut passe à `VALIDATED`, il redirige l'élève vers son tableau de bord.
