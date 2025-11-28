# Guide Technique : Streaming Vidéo (WebRTC) et Mise en Vedette (Spotlight)

Ce document détaille l'architecture et le fonctionnement des fonctionnalités de streaming vidéo et de mise en vedette (spotlight) de l'application.

---

## 1. Architecture du Streaming Vidéo (Peer-to-Peer via WebRTC)

Le système repose sur une architecture **Peer-to-Peer (P2P)** gérée par WebRTC. Cela signifie qu'une fois la connexion établie, les flux vidéo et audio sont échangés directement entre les navigateurs des participants sans passer par un serveur central, ce qui minimise la latence.

Le processus, appelé **"signaling"**, qui permet à deux navigateurs de se trouver et d'établir cette connexion P2P, est orchestré par **Ably**.

### Flux de Connexion (Exemple : Professeur et 1 Élève)

1.  **Initialisation** : Le Professeur (P) et l'Élève (E) se connectent à la page de la session.
2.  **Présence Ably** :
    *   P et E annoncent leur présence sur le canal Ably de la session (`classroom-connector:session:{id}`).
    *   Grâce à la présence, P sait que E est en ligne, et E sait que P est en ligne.
3.  **Initiation de la Connexion (par le Professeur)** :
    *   Le `useWebRTCConnection` du Professeur (P) détecte la présence de l'Élève (E).
    *   P crée une instance `SimplePeer` en mode `initiator: true` pour E.
    *   Cette instance génère un premier signal (une "offre" SDP).
    *   P envoie cette **offre** à E via Ably, sur le canal de la session, en ciblant spécifiquement l'ID de E. (Événement `AblyEvents.SIGNAL`).
4.  **Réponse de l'Élève** :
    *   Le `useWebRTCConnection` de l'Élève (E) reçoit l'offre de P.
    *   E crée sa propre instance `SimplePeer` (en mode `initiator: false`).
    *   E passe l'offre de P à son instance `SimplePeer`.
    *   L'instance de E génère à son tour un signal (une "réponse" SDP).
    *   E envoie cette **réponse** à P via Ably, en ciblant P.
5.  **Échange des Candidats ICE** :
    *   Après l'échange initial, les deux pairs commencent à découvrir comment ils peuvent se connecter directement (adresses IP, ports, etc.). Ces informations sont encapsulées dans des "candidats ICE".
    *   Chaque fois qu'un pair découvre un candidat, il l'envoie à l'autre via Ably (toujours avec l'événement `AblyEvents.SIGNAL`).
6.  **Connexion Établie** :
    *   Une fois que les deux pairs ont échangé suffisamment d'informations, la connexion WebRTC est établie.
    *   Les flux `MediaStream` (vidéo/audio) commencent à être échangés directement. L'événement `stream` est déclenché sur l'instance `SimplePeer`, ce qui permet d'afficher la vidéo du participant distant.

---

## 2. Mécanisme de la Mise en Vedette (Spotlight)

Le "spotlight" ne modifie pas les connexions WebRTC. Il s'agit d'un simple mécanisme de **synchronisation d'état** via Ably, qui dit à tous les clients "quel participant afficher en grand".

1.  **Action du Professeur** : Le professeur clique sur le bouton "Mettre en vedette" d'un participant (ou de lui-même).
2.  **Déclenchement de l'Événement** :
    *   L'action `spotlightParticipant` est appelée côté serveur.
    *   Cette action publie un événement `AblyEvents.PARTICIPANT_SPOTLIGHTED` sur le canal de la session.
    *   Le message contient l'ID du participant à mettre en vedette.
3.  **Réception par les Clients** :
    *   Le hook `useAblyCommunication` de tous les participants (professeur et élèves) écoute cet événement.
    *   À la réception, il met à jour son état `spotlightedParticipantId`.
4.  **Mise à Jour de l'Interface** :
    *   Le composant `SessionClient` détecte le changement de `spotlightedParticipantId`.
    *   Il sélectionne le `MediaStream` correspondant (soit le flux local, soit un flux distant) et le passe au composant `Participant` principal.
    *   L'interface de tous les participants se met à jour pour afficher la vidéo de la personne en vedette dans la vue principale.

---

## 3. Fichiers Clés Impliqués

-   `src/hooks/session/useWebRTCConnection.ts`: Cœur de la logique WebRTC. Gère la création des pairs, l'échange de signaux et la gestion des flux.
-   `src/hooks/session/useAblyCommunication.ts`: Écoute et réagit à tous les événements Ably (signaux, spotlight, fin de session, etc.).
-   `src/components/SessionClient.tsx`: Le composant "chef d'orchestre" qui assemble tous les hooks et les données pour construire l'interface de la session.
-   `src/lib/actions/session.actions.ts`: Contient la *Server Action* `spotlightParticipant` qui déclenche l'événement Ably.
-   `src/lib/ably/triggers.ts`: Contient la fonction `ablyTrigger` utilisée par les *Server Actions* pour publier des messages sur Ably.
-   `src/lib/ably/events.ts`: Fichier de constantes qui définit tous les noms d'événements.

---

## 4. Journaux de Console Attendus (Fonctionnement Idéal)

Voici ce que vous devriez voir dans les consoles lors du démarrage d'une session avec un professeur et un élève.

### Console du Professeur (`teacher`)

```log
// --- Initialisation de la page et des hooks ---
[SESSION PAGE] 📄 Chargement de la page pour la session: {sessionId}
[SESSION PAGE] 🚀 Démarrage fetchSessionData pour la session: {sessionId}
[SESSION PAGE] ✅ Données de session récupérées avec succès pour: {sessionId}
[SESSION PAGE] 📊 Détails: 1 élèves, 2 participants, 0 documents, Quiz actif: false
[USE ABLY HOOK] useAblyCommunication monté - { ... }
[USE ABLY HOOK] TeacherSessionView monté - { ... }

// --- Connexion Ably ---
[ABLY CLIENT] 🔄 Reusing existing global Ably client instance (state: connected, refCount: X)
[USE ABLY HOOK] 🔌 Connection state: connected
[ABLY COMMUNICATION] 📡 Configuration Ably pour le canal: classroom-connector:session:{sessionId}
[ABLY COMMUNICATION] ✅ Abonnement Ably réussi pour classroom-connector:session:{sessionId}

// --- Le professeur entre en présence ---
[ABLY COMMUNICATION] ➡️ Entrée en présence...

// --- L'élève rejoint, la présence est détectée ---
[ABLY COMMUNICATION] 🔄 Mise à jour de la présence: [teacherId, studentId]

// --- Début de la négociation WebRTC avec l'élève ---
[PEER CREATION] 🎯 Création peer initiateur pour {studentId}
[SIGNAL] 📤 Signal offer envoyé à {studentId} (total: 1)
// (Plusieurs signaux 'candidate' peuvent suivre)
[SIGNAL] 📤 Signal candidate envoyé à {studentId} (total: 2)
...

// --- Réception du signal de l'élève ---
[SIGNAL IN] 📨 Signal answer reçu de {studentId}
[SIGNAL IN] 🔄 Application du signal au peer existant pour {studentId}

// --- Connexion WebRTC établie ---
[STREAM] 📥 Stream reçu de {studentId}, actif: true, vidéo: true, audio: true
[STREAM ADDED] ✅ Stream ajouté pour {studentId} (vidéo: true, audio: true)
[PEER CONNECT] 🔗 Connexion WebRTC établie avec {studentId}
```

### Console de l'Élève (`student`)

```log
// --- Initialisation de la page et des hooks ---
[SESSION PAGE] 📄 Chargement de la page pour la session: {sessionId}
[SESSION PAGE] 🚀 Démarrage fetchSessionData pour la session: {sessionId}
[SESSION PAGE] ✅ Données de session récupérées avec succès pour: {sessionId}
// ... logs similaires pour les hooks

// --- Connexion Ably ---
[ABLY CLIENT] 🔄 Reusing existing global Ably client instance (state: connected, refCount: Y)
[USE ABLY HOOK] 🔌 Connection state: connected
[ABLY COMMUNICATION] 📡 Configuration Ably pour le canal: classroom-connector:session:{sessionId}
[ABLY COMMUNICATION] ✅ Abonnement Ably réussi pour classroom-connector:session:{sessionId}

// --- L'élève entre en présence ---
[ABLY COMMUNICATION] ➡️ Entrée en présence...

// --- Réception du signal du professeur ---
[SIGNAL IN] 📨 Signal offer reçu de {teacherId}
[SIGNAL IN] 🔄 Création nouveau peer répondeur pour {teacherId}
[PEER CREATION] 🎯 Création peer répondeur pour {teacherId}

// --- L'élève envoie sa réponse ---
[SIGNAL] 📤 Signal answer envoyé à {teacherId} (total: 1)
// (Plusieurs signaux 'candidate' peuvent suivre)
[SIGNAL] 📤 Signal candidate envoyé à {teacherId} (total: 2)
...

// --- Connexion WebRTC établie ---
[STREAM] 📥 Stream reçu de {teacherId}, actif: true, vidéo: true, audio: true
[STREAM ADDED] ✅ Stream ajouté pour {teacherId} (vidéo: true, audio: true)
[PEER CONNECT] 🔗 Connexion WebRTC établie avec {teacherId}
```
