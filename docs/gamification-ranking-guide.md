# Guide Technique : Gamification et Classement des Élèves

Ce document détaille l'architecture et le fonctionnement du système de gamification, d'attribution de points et de classement des élèves au sein de la plateforme Classroom Connector.

---

## 1. Principes Fondamentaux

Le système de gamification vise à encourager l'engagement des élèves en transformant les activités scolaires et parascolaires en un jeu où ils peuvent gagner des points, suivre leur progression et se mesurer amicalement à leurs camarades.

Les piliers de ce système sont :
-   **Les Points** : Monnaie virtuelle qui mesure l'effort et la réussite.
-   **Les Tâches** : Actions concrètes que les élèves doivent accomplir pour gagner des points.
-   **La Validation** : Mécanisme par lequel une tâche est confirmée comme étant terminée, soit automatiquement, soit par un professeur, soit par un parent.
-   **Le Classement** : Affichage transparent de la performance des élèves en fonction de leurs points.
-   **La Personnalisation (Métiers)** : Un système de thèmes visuels que le professeur peut assigner pour personnaliser l'expérience de l'élève.

---

## 2. Le Système de Points et de Tâches

### 2.1 Modèles de Données (`prisma/schema.prisma`)

La logique repose sur trois modèles Prisma principaux :

1.  **`User`** :
    -   Contient le champ `points` (de type `Int`) qui stocke le score total de l'élève. C'est ce champ qui est utilisé pour le classement.
    -   La relation avec `StudentProgress` permet de suivre toutes les tâches associées à un élève.

2.  **`Task`** :
    -   Représente une tâche à accomplir. Chaque tâche possède des attributs clés :
        -   `points`: Le nombre de points que la tâche rapporte.
        -   `type`: Fréquence de la tâche (`DAILY`, `WEEKLY`, `MONTHLY`).
        -   `validationType`: Qui doit valider la tâche (`AUTOMATIC`, `PROFESSOR`, `PARENT`).
        -   `requiresProof`: Un booléen indiquant si une preuve visuelle (image) est nécessaire.

3.  **`StudentProgress`** :
    -   Table de jointure qui lie un `User` (élève) à une `Task`.
    -   Son champ `status` (`PENDING_VALIDATION`, `VERIFIED`, `REJECTED`) est crucial pour le flux de validation.
    -   Contient `submissionUrl` pour stocker l'URL de la preuve téléversée sur Cloudinary.

### 2.2 Flux d'Accomplissement d'une Tâche

1.  **Affichage** : Le composant `src/components/TaskBoard.tsx` affiche les tâches disponibles pour l'élève sur son tableau de bord (`/student/dashboard`).
2.  **Action de l'élève** :
    -   L'élève clique sur "Marquer comme fait", "Demander validation parentale" ou "Soumettre une preuve".
    -   Ceci déclenche l'action serveur `completeTask` dans `src/lib/actions/task.actions.ts`.
3.  **Logique de `completeTask`** :
    -   Cette action crée ou met à jour une entrée `StudentProgress`.
    -   Si `validationType` est `AUTOMATIC`, le statut passe à `VERIFIED` et les points sont immédiatement ajoutés au score de l'élève.
    -   Sinon, le statut passe à `PENDING_VALIDATION` et aucune point n'est attribué à ce stade.
4.  **Validation** :
    -   **Professeur** : La page `/teacher/validations` utilise l'action `getTasksForProfessorValidation` pour lister les soumissions. La validation déclenche `validateTaskByProfessor`, qui met à jour le statut et les points.
    -   **Parent** : La page `/student/[id]/parent` utilise un système de mot de passe parental. La validation déclenche `validateTaskByParent`.

### 2.3 Points d'Activité (Heartbeat)

-   **Fichier** : `src/lib/actions/activity.actions.ts`
-   **Logique** : La fonction `trackStudentActivity` est conçue pour être appelée périodiquement (par un "heartbeat" côté client, non implémenté pour l'instant). Elle ajoute un petit nombre de points pour récompenser simplement l'activité de l'élève sur la plateforme.

---

## 3. Classement et Affichage

Le classement est un résultat direct de la somme des points de chaque élève.

-   **Tri par Points** : Les requêtes Prisma qui récupèrent les listes d'élèves (ex: dans `src/app/teacher/class/[id]/page.tsx` et `src/app/student/class/[id]/page.tsx`) utilisent systématiquement `orderBy: { points: 'desc' }`.
-   **Composants d'Affichage** :
    -   `src/app/teacher/class/[id]/StudentGrid.tsx` et `src/app/student/class/[id]/page.tsx` affichent la grille des élèves, triée par points.
    -   Les composants `StudentCard.tsx` et `StudentProfileCard.tsx` sont responsables de l'affichage visuel de chaque élève, y compris son total de points et sa couronne de "Top Student".

---

## 4. Personnalisation (Thèmes Métiers)

Cette fonctionnalité permet au professeur de personnaliser l'interface de l'élève.

-   **Modèle `Metier`** : Contient un champ `theme` (de type `String` JSON) qui stocke des variables de style (couleurs, curseur, etc.).
-   **Assignation** (`src/components/CareerSelector.tsx`) : Le professeur choisit un métier pour un élève, ce qui déclenche l'action `setStudentCareer`.
-   **Action `setStudentCareer`** (`src/lib/actions/student.actions.ts`) : Met à jour le champ `metierId` dans la table `EtatEleve` de l'élève.
-   **Application du Thème** (`src/components/CareerThemeWrapper.tsx`) : Ce composant "wrapper" est utilisé sur le tableau de bord de l'élève (`/student/dashboard`). Il lit le métier assigné à l'élève et injecte les variables CSS du thème dans la page, modifiant ainsi dynamiquement l'apparence de l'interface.

---

## 5. Fichiers Clés

-   **Modèles de données** : `prisma/schema.prisma`
-   **Logique des Actions (Serveur)** :
    -   `src/lib/actions/task.actions.ts` (soumission par l'élève)
    -   `src/lib/actions/teacher.actions.ts` (validation par le professeur)
    -   `src/lib/actions/parent.actions.ts` (validation par le parent)
    -   `src/lib/actions/student.actions.ts` (assignation de métier)
-   **Composants d'Interface (UI)** :
    -   `src/components/TaskBoard.tsx` (Tableau des tâches de l'élève)
    -   `src/app/teacher/tasks/page.tsx` (Éditeur de tâches pour le professeur)
    -   `src/app/teacher/validations/page.tsx` (Console de validation du professeur)
    -   `src/app/student/[id]/parent/page.tsx` (Interface de validation parentale)
    -   `src/app/student/class/[id]/page.tsx` (Vue de la classe pour l'élève avec classement)
    -   `src/components/CareerThemeWrapper.tsx` (Applique le thème visuel)
