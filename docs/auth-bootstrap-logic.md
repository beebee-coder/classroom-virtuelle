# Logique d'Initialisation de l'Authentification

Ce document décrit le processus d'inscription et d'authentification en partant d'une base de données vide, notamment comment le premier utilisateur devient automatiquement le professeur.

---

## 1. Le Premier Utilisateur : L'Enseignant

Le système est conçu pour qu'il n'y ait qu'un seul enseignant principal (`PROFESSEUR`). Le tout premier utilisateur à s'inscrire devient cet enseignant.

### Flux d'Inscription du Premier Utilisateur (via Formulaire)

1.  **Scénario :** Un utilisateur arrive sur la page `/register` alors que la base de données est vide.
2.  **Action :** Il remplit le formulaire d'inscription (nom, email, mot de passe).
3.  **Fichier Clé :** `src/app/api/auth/register/route.ts`
4.  **Logique Côté Serveur :**
    *   La route API reçoit la demande `POST`.
    *   Elle vérifie d'abord si un utilisateur avec le rôle `PROFESSEUR` existe déjà dans la base de données.
    *   **Puisqu'aucun n'existe**, l'API assigne automatiquement le rôle `PROFESSEUR` et le statut `VALIDATED` à ce nouvel utilisateur. Le mot de passe est haché et stocké.

**Résultat :** Le premier compte créé a tous les droits d'administration de l'application.

### Flux d'Inscription/Connexion du Premier Utilisateur (via Google)

Un mécanisme similaire existe si le premier utilisateur se connecte avec Google.

1.  **Scénario :** L'utilisateur clique sur "Continuer avec Google" sur la page `/registre`.
2.  **Fichier Clé :** `src/lib/auth-options.ts`
3.  **Logique Côté Serveur :**
    *   La configuration de `GoogleProvider` contient une fonction `profile`.
    *   Cette fonction compare l'email du profil Google à la variable d'environnement `OWNER_EMAIL`.
    *   Si les emails correspondent, NextAuth.js crée (ou met à jour) l'utilisateur en lui assignant le rôle `PROFESSEUR` et le statut `VALIDATED`, regardless of whether a teacher account already exists. This ensures the owner always has teacher privileges.

---

## 2. Les Utilisateurs Suivants : Les Élèves

Une fois que le compte `PROFESSEUR` est créé, le comportement du système change pour tous les nouveaux utilisateurs.

### Flux d'Inscription d'un Élève (via Formulaire)

1.  **Scénario :** Un nouvel utilisateur s'inscrit sur la page `/register`.
2.  **Fichier Clé :** `src/app/api/auth/register/route.ts`
3.  **Logique Côté Serveur :**
    *   L'API vérifie à nouveau si un `PROFESSEUR` existe.
    *   **Cette fois, un professeur existe.**
    *   Le nouvel utilisateur se voit donc automatiquement assigner le rôle `ELEVE` et le statut `PENDING`.

**Résultat :** L'élève est créé, mais son compte est en attente. Il est redirigé vers une page (`/student/validation-pending`) et une notification arrive dans dashboard professeur ,eleve ne peut pas accéder au tableau de bord tant que le professeur ne l'a pas validé et assigné à une classe a partire de page classe que le professeur a choisie .

### Flux de Connexion d'un Élève (via Google)

1.  **Scénario :** Un nouvel utilisateur se connecte avec Google.
2.  **Fichier Clé :** `src/lib/auth-options.ts`
3.  **Logique Côté Serveur :**
    *   La fonction `profile` du `GoogleProvider` s'exécute.
    *   L'email de l'utilisateur ne correspond pas à `OWNER_EMAIL`.
    *   L'utilisateur se voit donc assigner le rôle `ELEVE` et le statut `PENDING`.

---
si user (professeur ou eleve n'est pas deja inscrit et essay de passer a travers login page , il serait rediriger automatiquement vers page registre avec un message qui l'insite a s'enregistrer pour pouvoir s'authantifier et acceder)
## Résumé des Fichiers Impliqués

-   **`src/app/api/auth/register/route.ts`**: Gère la création de comptes via le formulaire. C'est ici que se trouve la logique qui différencie le premier utilisateur (professeur) des suivants (élèves).
-   **`src/lib/auth-options.ts`**: Définit la stratégie d'authentification globale. La section `GoogleProvider` contient la logique spécifique pour identifier le propriétaire via son email et assigner les rôles lors d'une connexion/inscription Google.
-   **`src/app/login/login-form.tsx`**: Gère l'interface de connexion et la redirection post-authentification. Il dirige les élèves non validés vers la page d'attente.
-   **`src/app/register/register-form.tsx`**: Le formulaire d'inscription qui envoie les données à la route API d'enregistrement.
