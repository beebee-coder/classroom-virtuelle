# Logique d'Initialisation de l'Authentification

Ce document décrit le processus d'inscription et d'authentification en partant d'une base de données vide, notamment comment le premier utilisateur devient automatiquement le professeur et comment les élèves sont intégrés.

---

## 1. Le Premier Utilisateur : L'Enseignant (Propriétaire)

Le système est conçu pour qu'il n'y ait qu'un seul enseignant principal (`PROFESSEUR`), identifié par une variable d'environnement `OWNER_EMAIL`.

### Flux d'Inscription (via Formulaire)

1.  **Scénario :** Un utilisateur arrive sur la page `/register`.
2.  **Action :** Il remplit le formulaire d'inscription (nom, email, mot de passe).
3.  **Fichier Clé :** `src/app/api/auth/register/route.ts`
4.  **Logique Côté Serveur :**
    *   La route API reçoit la demande `POST`.
    *   **Sécurité** : Elle vérifie si l'email fourni correspond à `process.env.OWNER_EMAIL`. Si ce n'est pas le cas, l'inscription est rejetée.
    *   Si l'email correspond, l'API assigne automatiquement le rôle `PROFESSEUR` et le statut `VALIDATED` à ce nouvel utilisateur. Le mot de passe est haché et stocké.

**Résultat :** Le premier compte créé via le formulaire (avec le bon email) a tous les droits d'administration de l'application.

---

## 2. Les Utilisateurs Suivants : Les Élèves

Tous les autres utilisateurs sont considérés comme des élèves et ne peuvent s'inscrire/se connecter que via Google.

### Flux d'Inscription/Connexion d'un Élève (via Google)

1.  **Scénario :** Un nouvel utilisateur clique sur "Continuer avec Google" sur la page `/login` ou `/register`.
2.  **Fichier Clé :** `src/lib/auth-options.ts`
3.  **Logique Côté Serveur (`GoogleProvider`) :**
    *   Le `profile` callback de GoogleProvider est exécuté. Il crée un objet utilisateur avec `role: 'ELEVE'` et `validationStatus: 'PENDING'`.
    *   Le `PrismaAdapter` prend le relais :
        *   S'il s'agit d'un **nouvel utilisateur**, il crée une entrée dans la table `User` avec ces informations. `classeId` est laissé `null`.
        *   S'il s'agit d'un **utilisateur existant**, il met simplement à jour ses informations de profil (nom, image).
4.  **Middleware Prisma** :
    *   Le middleware dans `src/lib/prisma.ts` détecte la création du nouvel utilisateur élève.
    *   Il déclenche un événement `NEW_PENDING_STUDENT` sur le canal Ably de la classe (s'il est assigné) ou sur un canal global pour notifier le professeur.

### Redirection et Onboarding de l'Élève

1.  **Fichier Clé :** `src/middleware.ts`
2.  **Logique du Middleware :**
    *   Après une connexion réussie, le `middleware` examine le token JWT de l'élève.
    *   **Cas 1 : Nouvel élève (sans classe)** : Si `token.classeId` est `null` (ou si le flag `isNewUser` est présent), l'élève est redirigé vers `/student/onboarding`. Sur cette page, il verra un message l'informant que son compte est en attente d'assignation à une classe.
    *   **Cas 2 : Élève en attente de validation** : Si l'élève est déjà assigné à une classe mais que son `validationStatus` est `PENDING`, il est redirigé vers `/student/validation-pending`. Cette page vérifie périodiquement son statut jusqu'à ce qu'il soit validé par le professeur.
    *   **Cas 3 : Élève validé** : L'élève est redirigé vers son tableau de bord (`/student/dashboard`).

### Validation par le Professeur

-   **Fichier Clé :** `src/app/teacher/validations/page.tsx`
-   **Logique** :
    *   Le professeur voit la liste des élèves en attente (ceux sans classe et ceux avec `status: 'PENDING'`).
    *   Pour un nouvel élève, il lui assigne une classe. L'action `validateStudentRegistration` met à jour le `classeId` et passe le `validationStatus` à `VALIDATED`.
    *   L'élève est alors débloqué et peut accéder à son tableau de bord.
