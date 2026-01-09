# Guide Technique : Streaming Vidéo (WebRTC) et Mise en Vedette (Spotlight)

Ce document détaille l'architecture et le fonctionnement des fonctionnalités de streaming vidéo et de mise en vedette (spotlight) de l'application.

---

## 1. Architecture du Streaming Vidéo (Peer-to-Peer via WebRTC)

Le système repose sur une architecture **Peer-to-Peer (P2P)** gérée par WebRTC. Cela signifie qu'une fois la connexion établie, les flux vidéo et audio sont échangés directement entre les navigateurs des participants sans passer par un serveur central, ce qui minimise la latence.

Le processus, appelé **"signaling"**, qui permet à deux navigateurs de se trouver et d'établir cette connexion P2P, est orchestré par **Ably**.

### Flux de Connexion (Exemple : Professeur et 1 Élève)

1.  **Initialisation** : Le Professeur (P) et l'Élève (E) se connectent à la page de la session. Leurs hooks `useMediaManagement` respectifs demandent l'accès à la caméra et au micro.
2.  **Présence Ably** :
    *   P et E annoncent leur présence sur le canal Ably de la session (`classroom-connector:session:{id}`) via le hook `useAblyPresence` (utilisé dans `ClassPageClient` pour le professeur, et `StudentClassView` pour l'élève).
    *   Grâce à la présence, P sait que E est en ligne, et vice-versa.
3.  **Initiation de la Connexion (par le Professeur)** :
    *   Dans `SessionClient.tsx`, le `useEffect` principal détecte la présence d'un élève en ligne (`onlineUserIds`).
    *   Le Professeur (P) appelle `createPeer` depuis son `useWebRTCConnection`, avec `initiator: true`.
    *   Cette instance `SimplePeer` génère un premier signal (une "offre" SDP).
    *   P envoie cette **offre** à E via Ably, en utilisant l'action `ablyTrigger` avec l'événement `AblyEvents.SIGNAL`.
4.  **Réponse de l'Élève** :
    *   Le hook `useAblyCommunication` de l'Élève (E) reçoit l'offre de P.
    *   Son `handleIncomingSignal` crée sa propre instance `SimplePeer` (en mode `initiator: false`).
    *   E passe l'offre de P à son instance `SimplePeer`.
    *   L'instance de E génère à son tour un signal (une "réponse" SDP).
    *   E envoie cette **réponse** à P via Ably.
5.  **Échange des Candidats ICE** :
    *   Après l'échange initial, les deux pairs commencent à découvrir comment ils peuvent se connecter directement (adresses IP, ports, etc.). Ces informations sont encapsulées dans des "candidats ICE".
    *   Chaque fois qu'un pair découvre un candidat, il l'envoie à l'autre via Ably (toujours avec l'événement `AblyEvents.SIGNAL`).
6.  **Connexion Établie** :
    *   Une fois que les deux pairs ont échangé suffisamment d'informations, la connexion WebRTC est établie.
    *   L'événement `stream` est déclenché sur l'instance `SimplePeer`, ce qui met à jour l'état `remoteStreams` et permet d'afficher la vidéo du participant distant.

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
    *   Il sélectionne le `MediaStream` correspondant (soit le flux local du professeur, soit un flux distant d'un élève) et le passe au composant `Participant` principal.
    *   L'interface de tous les participants se met à jour pour afficher la vidéo de la personne en vedette dans la vue principale.

---

## 3. Fichiers Clés Impliqués

-   `src/hooks/session/useWebRTCConnection.ts`: Cœur de la logique WebRTC. Gère la création des pairs, l'échange de signaux et la gestion des flux. Il est conçu pour une topologie "un-vers-plusieurs" (le professeur initie vers chaque élève).
-   `src/hooks/session/useAblyCommunication.ts`: Écoute et réagit à tous les événements Ably (signaux, spotlight, fin de session, etc.). C'est le centre névralgique de la communication en temps réel.
-   `src/hooks/session/useMediaManagement.ts`: Gère l'accès à la caméra, au micro et le partage d'écran.
-   `src/hooks/session/useSessionState.ts`: Centralise l'état de la session (outil actif, quiz, etc.) pour découpler la logique métier de la communication.
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
[SESSION PAGE] 🚀 Démarrage fetchSessionData pour: {sessionId}, utilisateur: {teacherId}
[SESSION PAGE] ✅ Données récupérées pour: {sessionId}
[MEDIA] Initialisation du flux média local...
[USE ABLY HOOK] useAblyCommunication monté
[WEBRTC] Initialisation du hook WebRTC

// --- Connexion Ably ---
[ABLY CLIENT] 🔄 Reusing existing global Ably client instance...
[ABLY COMMUNICATION] 📡 Configuration Ably pour le canal: classroom-connector:session:{sessionId}
[ABLY COMMUNICATION] ✅ Abonnement Ably réussi...

// --- Le professeur entre en présence ---
[ABLY COMMUNICATION] ➡️ Entrée en présence...

// --- L'élève rejoint, la présence est détectée ---
[ABLY COMMUNICATION] 🔄 Mise à jour de la présence: [teacherId, studentId]

// --- Début de la négociation WebRTC avec l'élève ---
🎯 [PEER CREATION] - Création peer initiateur pour {studentId}
📤 [SIGNAL] - Signal offer envoyé à {studentId} (total: 1)
// (Plusieurs signaux 'candidate' peuvent suivre)
📤 [SIGNAL] - Signal candidate envoyé à {studentId} (total: 2)
...

// --- Réception du signal de l'élève ---
📨 [SIGNAL IN] - Signal answer reçu de {studentId} (return: true)
🔄 [SIGNAL IN] - Application du signal au peer existant pour {studentId}

// --- Connexion WebRTC établie ---
📥 [STREAM] - Stream reçu de {studentId}, actif: true, vidéo: true, audio: true
✅ [STREAM ADDED] - Stream ajouté pour {studentId} (vidéo: true, audio: true)
🔗 [PEER CONNECT] - Connexion WebRTC établie avec {studentId}
```

### Console de l'Élève (`student`)

```log
// --- Initialisation de la page et des hooks ---
[SESSION PAGE] 🚀 Démarrage fetchSessionData pour: {sessionId}, utilisateur: {studentId}
...

// --- Connexion Ably ---
[ABLY CLIENT] 🔄 Reusing existing global Ably client instance...
[ABLY COMMUNICATION] 📡 Configuration Ably pour le canal: classroom-connector:session:{sessionId}
[ABLY COMMUNICATION] ✅ Abonnement Ably réussi...

// --- L'élève entre en présence ---
[ABLY COMMUNICATION] ➡️ Entrée en présence...

// --- Réception du signal du professeur ---
📨 [SIGNAL IN] - Signal offer reçu de {teacherId} (return: false)
🔄 [SIGNAL IN] - Création nouveau peer répondeur pour {teacherId}
🎯 [PEER CREATION] - Création peer répondeur pour {teacherId}

// --- L'élève envoie sa réponse ---
📤 [SIGNAL] - Signal answer envoyé à {teacherId} (total: 1)
// (Plusieurs signaux 'candidate' peuvent suivre)
📤 [SIGNAL] - Signal candidate envoyé à {teacherId} (total: 2)
...

// --- Connexion WebRTC établie ---
📥 [STREAM] - Stream reçu de {teacherId}, actif: true, vidéo: true, audio: true
✅ [STREAM ADDED] - Stream ajouté pour {teacherId} (vidéo: true, audio: true)
🔗 [PEER CONNECT] - Connexion WebRTC établie avec {teacherId}
```
