# Documentation des Fonctionnalités de Classroom Connector

## 1. Lancement de l'Application et Authentification
### 1.1 Page d'Accueil
- **Pour les visiteurs non connectés** : Une page de présentation affiche les fonctionnalités clés de la plateforme et les annonces publiques.
- **Redirection automatique** : Les utilisateurs déjà connectés (professeurs ou élèves) sont automatiquement redirigés vers leur tableau de bord respectif.
### 1.2 Connexion
- **Accès** : La page de connexion est accessible depuis la page d'accueil.
- **Méthodes d'authentification** :
    - **Identifiants (Email/Mot de passe)** : Permet de se connecter avec des comptes de démonstration prédéfinis. Le mot de passe par défaut est `password`.
    - **Google** : Permet de se connecter ou de s'inscrire avec un compte Google. Un nouvel utilisateur est automatiquement créé avec le rôle "ÉLÈVE".
- **Séparation des rôles** : Le système gère deux rôles principaux : `PROFESSEUR` et `ELEVE`.
## 2. Espace Professeur
Le professeur a accès à un ensemble d'outils pour gérer ses classes et interagir avec les élèves.
### 2.1 Tableau de Bord Principal
- Vue d'ensemble des actions principales :
    - **Gérer les Classes** : Accéder à la liste de ses classes.
    - **Validations** : Voir les tâches soumises par les élèves en attente de validation.
    - **Créer une Annonce** : Publier des informations pour une classe ou pour tous.
### 2.2 Gestion des Classes
- **Création de classe** : Le professeur peut ajouter de nouvelles classes.
- **Gestion des élèves** : Dans une classe, il peut ajouter de nouveaux élèves en fournissant leur nom et email.
- **Vue d'ensemble de la classe** :
    - Affiche tous les élèves sous forme de cartes.
    - Indique le statut de connexion (en ligne / hors ligne) de chaque élève.
    - Permet de sélectionner les élèves en ligne pour démarrer une session vidéo.
### 2.3 Gestion des Tâches et Validations
- **Éditeur de tâches** : Le professeur peut créer, modifier ou supprimer des tâches pour tous les élèves (quotidiennes, hebdomadaires, mensuelles).
- **Console de validation** : Le professeur examine les preuves soumises par les élèves et peut :
    - **Approuver** : Attribuer des points, avec la possibilité d'ajuster le score.
    - **Rejeter** : Renvoyer la tâche à l'élève avec un motif.
### 2.4 Démarrage d'une Session
- Depuis la page d'une classe, le professeur sélectionne les élèves connectés et clique sur **"Démarrer la session"**.
- Cela crée une nouvelle session vidéo et envoie une invitation en temps réel aux élèves sélectionnés.
## 3. Espace Élève
L'élève dispose d'un tableau de bord personnalisé pour suivre sa progression et interagir.
### 3.1 Tableau de Bord Principal
- Affiche les points totaux, les annonces et la liste des tâches.
- Reçoit des invitations en temps réel pour rejoindre les sessions démarrées par le professeur.
### 3.2 Gestion des Tâches
- **Visualisation** : Les tâches sont groupées par fréquence (Quotidien, Hebdomadaire, Mensuel).
- **Interaction** :
    - **Validation simple** : Pour les tâches ne nécessitant pas de preuve.
    - **Soumission de preuve** : Pour les tâches le demandant, un widget permet de téléverser un fichier (image, etc.).
    - **Validation parentale** : Pour certaines tâches, l'élève peut demander une validation qui sera effectuée dans un "Espace Parent" sécurisé par mot de passe.
- **Statut** : Le statut de chaque tâche (à faire, en attente, validée) est clairement indiqué.
### 3.3 Personnalisation
- **Librairie des métiers** : L'élève peut choisir un "métier" qui applique un thème visuel (couleurs, curseur, image de fond) à son interface.
## 4. Fonctionnalités de la Session en Direct
La session en direct est le cœur interactif de l'application.
###4.1 Pour le Professeur (Vue Enseignant)
- **Vue globale** : Affiche sa propre caméra, les caméras des élèves connectés, et des placeholders pour les élèves hors ligne ou sans vidéo.
- **Partage d'écran** : Le professeur peut partager son écran avec tous les participants. Le flux vidéo du partage remplace alors le tableau blanc.
- **Tableau blanc** : Un espace de dessin partagé (fonctionnalité actuellement en maintenance).
- **Mise en vedette (Spotlight)** : Peut mettre en avant la vidéo d'un participant pour tous les autres.
- **Suivi de la compréhension** :
    - Un panneau affiche en temps réel le niveau de compréhension des élèves (Compris, Confus, Perdu).
    - Permet d'identifier rapidement les élèves qui ont besoin d'aide.
- **Gestion des mains levées** :
    - Un panneau liste tous les élèves qui ont levé la main.
    - Le professeur peut "baisser la main" d'un élève après lui avoir donné la parole.
- **Chronomètre de session** : Le professeur peut démarrer, pauser et réinitialiser un chronomètre visible par tous les participants.
- **Fin de session** : Le professeur peut terminer la session pour tous les participants.
### 4.2 Pour l'Élève (Vue Étudiant)
- **Vue principale** : Affiche la vidéo de la personne en vedette (par défaut le professeur) ou le partage d'écran.
- **Lever la main** : Un bouton permet à l'élève de signaler qu'il a une question. Son statut est visible par le professeur.
- **Indiquer sa compréhension** : Des boutons (sourire, neutre, triste) permettent de communiquer son niveau de compréhension en temps réel et de manière non-intrusive.
- **Quitter la session** : L'élève peut quitter la session à tout moment.
### Architecture des dossiers et des Fichiers
Voici une vue détaillée de la structure des dossiers et fichiers du projet pour mieux comprendre son organisation.

- **`/src/app`**: Cœur de l'application Next.js (App Router).
  - **`/api`**: Contient les routes API pour la logique backend (ex: authentification Pusher, signalisation WebRTC).
  - **`/student`, `/teacher`, etc.**: Dossiers de routes pour les différentes sections de l'application. Chaque dossier contient des pages (`page.tsx`) et des composants spécifiques à la route.
  - **`layout.tsx`**: Le layout principal de l'application.
  - **`page.tsx`**: La page d'accueil pour les visiteurs non connectés.
  - **`globals.css`**: Fichier CSS global, incluant les variables de thème Tailwind/ShadCN.

- **`/src/components`**: Composants React réutilisables.
  - **`/ui`**: Composants génériques de l'interface utilisateur (Button, Card, etc.), souvent issus de ShadCN.
  - **Autres fichiers `.tsx`**: Composants spécifiques à l'application (ex: `Header.tsx`, `StudentCard.tsx`).

- **`/src/lib`**: Utilitaires, logique métier et configuration.
  - **`/actions`**: Fichiers contenant les "Server Actions" de Next.js pour les mutations de données (ex: `task.actions.ts`).
  - **`/auth-options.ts`**: Configuration de NextAuth pour l'authentification.
  - **`/pusher`**: Configuration des clients et serveurs Pusher pour la communication temps réel.
  - **`/prisma.ts`**: Initialisation du client Prisma pour l'interaction avec la base de données.
  - **`types.ts`**: Définitions des types TypeScript personnalisés utilisés dans l'application.

- **`/src/hooks`**: Hooks React personnalisés (ex: `useActivityTracker.ts` pour suivre l'activité de l'utilisateur).

- **`/prisma`**: Tout ce qui concerne la base de données.
  - **`schema.prisma`**: Fichier de définition du schéma de la base de données (modèles, relations).
  - **`/migrations`**: Dossier contenant les fichiers de migration de la base de données générés par Prisma.
  - **`seed.ts`**: Script pour peupler la base de données avec des données initiales de test.

- **`/docs`**: Dossier pour la documentation du projet.
  - **`fonctionnalites.md`**: Ce fichier, documentant les fonctionnalités.

- **`/public`**: (Dossier standard de Next.js) Pour les assets statiques comme les images ou les polices.

- **Fichiers à la racine**:
  - `next.config.ts`: Fichier de configuration de Next.js.
  - `package.json`: Liste des dépendances et des scripts du projet.
  - `tsconfig.json`: Configuration de TypeScript.
  - `tailwind.config.ts`: Configuration de Tailwind CSS.
