# Référence du Flux d'Authentification et d'Inscription

Ce document liste les fichiers essentiels impliqués dans le processus complet, de l'arrivée d'un utilisateur à sa redirection vers le tableau de bord approprié, en intégrant le nouveau flux d'onboarding.

## 1. Pages d'Entrée (Non authentifié)

- **`/` (Page d'accueil)** :
  - **Fichier** : `src/app/page.tsx`
  - **Logique** : Affiche la page de bienvenue. Si un utilisateur connecté arrive ici, le `middleware` le redirige vers le tableau de bord approprié avant même le rendu de la page.

- **`/login` (Connexion)** :
  - **Fichier** : `src/app/login/login-form.tsx`
  - **Logique** : Gère la connexion via **Credentials** (professeur) ou **Google** (élèves). `next-auth` gère la création de la session. La redirection post-connexion est gérée par le `middleware`.

- **`/register` (Inscription)** :
  - **Fichier** : `src/app/register/register-form.tsx`
  - **Logique** : Contient deux flux :
    1.  **Formulaire Professeur** : Envoie les données à `/api/auth/register` pour créer le compte propriétaire.
    2.  **Bouton Google** : Initie une connexion `signIn('google')` pour les élèves.

## 2. Logique d'Authentification (Cœur du système)

- **`src/lib/auth-options.ts`** : Fichier central pour `next-auth`.
  - **`providers`** : Définit les stratégies `CredentialsProvider` (exclusif au `OWNER_EMAIL`) et `GoogleProvider`.
  - **`GoogleProvider.profile()`** : Fonction cruciale qui assigne le rôle `ELEVE` et le statut `PENDING` lors d'une inscription via Google.
  - **`callbacks.jwt()`** : Enrichit le token JWT. **C'est ici que le flag `isNewUser` est ajouté** si un élève se connecte pour la première fois (il n'a pas encore de `classeId`).
  - **`callbacks.session()`** : Hydrate l'objet `session` côté client avec les données du token (rôle, statut, `isNewUser`).

- **`/api/auth/[...nextauth]/route.ts`** : Expose la configuration de `next-auth` en tant que points d'API.

- **`src/lib/prisma.ts`** :
  - Contient un **middleware Prisma** qui intercepte chaque création d'un `User`.
  - Si le nouvel utilisateur est un `ELEVE`, il déclenche un événement Ably (`NEW_PENDING_STUDENT`) pour notifier en temps réel le tableau de bord du professeur.

## 3. Flux d'Onboarding et de Validation de l'Élève

- **`/student/onboarding/page.tsx` (Nouveau)** :
  - **Objectif** : Accueillir un élève qui vient de s'inscrire mais qui n'a pas encore été assigné à une classe.
  - **Logique** : Le `middleware` redirige ici les élèves avec `isNewUser: true`. La page affiche un message de bienvenue et attend l'assignation. Un polling est mis en place pour vérifier si `classeId` a été ajouté à la session.

- **`/student/validation-pending/page.tsx`** :
  - **Objectif** : Page d'attente pour les élèves déjà assignés mais dont le compte doit être validé par le professeur.
  - **Logique** : Le `middleware` redirige ici les élèves avec `validationStatus: 'PENDING'`. Un `useEffect` vérifie périodiquement si le statut est passé à `VALIDATED`.

- **`/teacher/validations`** :
  - **Page** : `src/app/teacher/validations/page.tsx`
  - **Composant Client** : `StudentValidationConsole.tsx`
  - **Logique** :
    1.  Récupère les élèves avec le statut `PENDING` ou ceux qui n'ont pas de `classeId`.
    2.  Permet au professeur de choisir une classe dans un menu déroulant.
    3.  Appelle l'action `validateStudentRegistration` qui met à jour le `validationStatus` de l'élève à `VALIDATED` **et** lui assigne le `classeId`.

## 4. Protection des Routes (Middleware)

- **`src/middleware.ts`** : C'est le garde du corps de l'application.
  - Il vérifie le token `next-auth` à chaque requête.
  - Redirige les utilisateurs non connectés vers `/login`.
  - Redirige les utilisateurs connectés des pages publiques vers leur dashboard.
  - Applique les règles de redirection pour l'onboarding et la validation en attente.
  - Bloque l'accès aux routes `/teacher/*` pour les élèves et vice-versa.
