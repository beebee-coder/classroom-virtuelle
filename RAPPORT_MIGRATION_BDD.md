# Rapport et Plan de Migration : Données Factices vers Base de Données Prisma

Ce document décrit la stratégie et les étapes nécessaires pour faire migrer l'application "Classroom Connector" d'une architecture basée sur des données factices (dummy data) vers une intégration complète avec une base de données PostgreSQL gérée par l'ORM Prisma.

**Objectif Final :** Une application 100% fonctionnelle où toutes les lectures et écritures de données (utilisateurs, classes, tâches, sessions, etc.) sont persistées en base de données.

---

## État Actuel

L'application utilise actuellement des fichiers comme `src/lib/dummy-data.ts` et des objets en mémoire dans les "Server Actions" pour simuler le comportement d'une base de données. Les appels à Prisma sont commentés ou inexistants. Le schéma Prisma (`prisma/schema.prisma`) et le script de `seed` sont maintenant en place, mais ne sont pas encore utilisés par la logique de l'application.

---

## Plan de Migration - Étape par Étape

La migration sera effectuée fonctionnalité par fonctionnalité pour assurer une transition contrôlée.

### ✅ Étape 0 : Préparation et Nettoyage (Terminée)
- [x] Correction de toutes les erreurs de schéma Prisma (`P1012`).
- [x] Correction des erreurs de configuration (`npm install` qui échoue).
- [x] **Suppression du fichier `src/lib/types.ts`** : Les types manuels sont remplacés par les types générés automatiquement par Prisma pour garantir la cohérence.
- [x] **Mise à jour des imports** : Tous les fichiers de l'application importent maintenant leurs types depuis `@prisma/client` au lieu de `src/lib/types.ts`.
- [x] Résolution de toutes les erreurs TypeScript initiales.

---

### ⏳ Étape 1 : Authentification et Données Utilisateur

-   **Objectif :** Remplacer la logique de session factice (`dummyRole` cookie) par une véritable authentification via NextAuth.js et le `CredentialsProvider`.
-   **Fichiers à modifier :**
    -   `src/app/login/page.tsx` : Remplacer la logique de `handleDummyLogin` par un appel à la fonction `signIn` de NextAuth.
    -   `src/lib/auth-options.ts` : Configurer le `CredentialsProvider` pour qu'il interroge la base de données Prisma (`prisma.user.findUnique`) afin de vérifier l'email et le mot de passe.
    -   `src/lib/session.ts` : Supprimer la logique de session factice et utiliser `getServerSession` de NextAuth.
    -   Actions liées à l'utilisateur (`user.actions.ts`) : Connecter `updateUserProfileImage` à la base de données.

---

### Étape 2 : Gestion des Classes et des Élèves (Professeur)

-   **Objectif :** Permettre aux professeurs de créer et de voir de vraies classes et de vrais élèves depuis la base de données.
-   **Fichiers à modifier :**
    -   `src/lib/actions/class.actions.ts` : Implémenter la logique Prisma pour `createClass` et `addStudentToClass`.
    -   `src/app/teacher/classes/page.tsx` : Remplacer les `dummyClassrooms` par un appel à `prisma.classroom.findMany` pour récupérer les classes du professeur connecté.
    -   `src/app/teacher/class/[id]/page.tsx` : Remplacer les données factices par un appel à `prisma.classroom.findUnique` pour charger les détails d'une classe et la liste de ses élèves.

---

### Étape 3 : Gestion des Tâches (Professeur & Élève)

-   **Objectif :** Remplacer le système de tâches factices par une gestion complète via la base de données.
-   **Fichiers à modifier :**
    -   `src/lib/actions/task.actions.ts` : Implémenter la logique Prisma pour `createTask`, `updateTask`, `deleteTask` et `completeTask`. La fonction `completeTask` créera ou mettra à jour une entrée dans le modèle `StudentProgress`.
    -   `src/app/teacher/tasks/page.tsx` : Charger les tâches depuis la base de données avec `prisma.task.findMany`.
    -   `src/components/TaskBoard.tsx` : La logique interne devrait fonctionner correctement une fois que les `props` (`tasks` et `studentProgress`) proviennent de la base de données.
    -   `src/app/student/dashboard/page.tsx` : Charger les tâches et la progression de l'élève connecté via Prisma.

---

### Étape 4 : Gestion des Annonces

-   **Objectif :** Stocker et récupérer les annonces depuis la base de données.
-   **Fichiers à modifier :**
    -   `src/lib/actions/announcement.actions.ts` : Implémenter la logique Prisma pour `createAnnouncement`, `getPublicAnnouncements`, `getStudentAnnouncements`, et `getClassAnnouncements`.
    -   Les pages (`/`, `/student/dashboard`, `/teacher/class/[id]`) qui affichent les annonces utiliseront ces nouvelles actions sans modification de leur code.

---

### Étape 5 : Système de Validation (Parent & Professeur)

-   **Objectif :** Connecter le système de validation des tâches à la base de données.
-   **Fichiers à modifier :**
    -   `src/lib/actions/parent.actions.ts` : Implémenter la logique Prisma pour `setParentPassword`, `verifyParentPassword`, `getTasksForValidation` (interroger `StudentProgress`), et `validateTaskByParent` (mettre à jour `StudentProgress` et `User.points`).
    -   `src/lib/actions/teacher.actions.ts` : Implémenter la logique Prisma pour `getTasksForProfessorValidation` et `validateTaskByProfessor`.
    -   `src/app/teacher/validations/page.tsx` : Utiliser la nouvelle action pour charger les tâches à valider.

---

### Étape 6 : Sessions de Cours en Direct

-   **Objectif :** Persister la création et la participation aux sessions.
-   **Fichiers à modifier :**
    -   `src/lib/actions/session.actions.ts` :
        -   Dans `createCoursSession`, remplacer la logique de stockage en mémoire par la création d'une entrée dans le modèle `CoursSession` et `ParticipantSession`.
        -   `getSessionDetails` interrogera la base de données pour récupérer les informations de la session.
        -   `endCoursSession` mettra à jour l'heure de fin dans `CoursSession`.
    -   `src/app/session/[id]/page.tsx` : Le code devrait fonctionner tel quel en utilisant la nouvelle action `getSessionDetails`.

---

### Étape 7 : Finalisation et Nettoyage

-   **Objectif :** Supprimer tout le code et les fichiers liés aux données factices.
-   **Fichiers à supprimer/modifier :**
    -   Supprimer `src/lib/dummy-data.ts`.
    -   Nettoyer tous les commentaires `// ---=== BYPASS BACKEND ===---`.
    -   Vérifier qu'aucune importation de `dummy-data` ne subsiste.
    -   Exécuter `npm run typecheck` une dernière fois pour s'assurer qu'il n'y a plus aucune erreur.

Ce plan structuré nous permettra de progresser de manière logique et de garantir que chaque fonctionnalité est correctement migrée avant de passer à la suivante.