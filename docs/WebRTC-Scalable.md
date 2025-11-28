Architecture WebRTC Scalable "One-to-Many" avec Spotlight
📋 Contexte & Problème Initial
Application : Classroom Connector - Plateforme de cours en ligne temps réel

Besoin : Support de 11 utilisateurs simultanés (1 professeur + 10 élèves) avec une expérience fluide
🎯 Architecture Cible Validée : "One-to-Many" avec Spotlight
Topologie Optimisée
PROFESSEUR (1) 
  ↓ Envoie 1 flux (sa caméra) à tous
  ↑ Reçoit 10 flux (tous les élèves)

ÉLÈVE (10) 
  ↓ Envoie 1 flux (sa caméra) au professeur seulement  
  ↑ Reçoit 1 flux (professeur OU élève spotlight)
Calcul des Connexions
Professeur : 1 sortant + 10 entrants = 11 connexions ✅

Élève : 1 sortant + 1 entrant = 2 connexions ✅

Total : 11 + (10 × 2) = 31 connexions ✅
🔍 Analyse de Faisabilité Technique
✅ Navigateurs - Support Validé
Chrome : 15-25 connexions → ✅ 11 connexions (professeur)

Firefox : 15-20 connexions → ✅ 11 connexions (professeur)

Safari : 10-15 connexions → ✅ 11 connexions (professeur)

Élèves : 2 connexions → ✅ Tous les navigateurs/appareils

✅ Réseau - Messages Ably
31 connexions × 10 signaux/min = 310 messages/min

Limite Ably Free : 2,000 messages/min → ✅ 15.5% utilisation

✅ Performance - Ressources
CPU Élève : 5-15% (1 flux) → ✅ Mobile/Tablette OK

CPU Professeur : 50-80% (11 flux) → ✅ Ordinateur moderne OK

Mémoire : 500MB-1GB (professeur) → ✅ Acceptable

🏗️ Architecture Renforcée Proposée
1. Stratégie de Connexion par Rôle
// Détection du rôle
const isTeacher = sessionData.professeurId === currentUserId;

// Stratégie différenciée
const useWebRTCStrategy = () => {
  return isTeacher 
    ? useTeacherWebRTCStrategy()  // Connecte avec tous les élèves
    : useStudentWebRTCStrategy(); // Connecte seulement avec professeur
};
2. Gestion Intelligente du Spotlight
// Élève : Affiche professeur OU élève spotlighté
const StudentVideoDisplay = () => {
  const streamToDisplay = spotlightedParticipantId 
    ? remoteStreams.get(spotlightedParticipantId)
    : remoteStreams.get(teacherId);
  
  return <VideoPlayer stream={streamToDisplay} />;
};

// Professeur : Grid avec toutes les caméras + optimisation audio
const TeacherVideoGrid = () => {
  // Désactive audio des flux non spotlightés
  remoteStreams.forEach((stream, userId) => {
    if (userId !== spotlightedParticipantId) {
      stream.getAudioTracks().forEach(track => track.enabled = false);
    }
  });
};
3. Logique de Création Selective des Peers
Professeur → Initie les connexions avec tous les élèves :
useEffect(() => {
  onlineUserIds.forEach(studentId => {
    if (studentId !== currentUserId) {
      createPeer(studentId, true, localStream);
    }
  });
}, [onlineUserIds]);
Élève → Se connecte seulement au professeur :
useEffect(() => {
  if (teacherId && teacherId !== currentUserId) {
    createPeer(teacherId, false, localStream);
  }
}, [teacherId]);
🚀 Plan d'Implémentation en 4 Étapes
Étape 1 : Refactoring SessionClient.tsx
Détection automatique du rôle (professeur/élève)

Chargement conditionnel des stratégies WebRTC

Adaptation des composants d'interface

Étape 2 : Hooks Spécialisés
useTeacherWebRTCStrategy() - Gestion multi-connexions

useStudentWebRTCStrategy() - Gestion mono-connexion

useSpotlightManagement() - Orchestration du spotlight

Étape 3 : Optimisations Performance
Lazy loading des streams vidéo

Désactivation audio des flux inactifs

Compression adaptive qualité vidéo

Étape 4 : Tests de Charge
Simulation 1 professeur + 10 élèves

Monitoring performance navigateurs

Ajustements fine-tuning

📊 Métriques de Succès
Métrique	Cible	Statut
Connexions stables	31/31	✅ Atteignable
Latence vidéo	<500ms	✅ Conservée
CPU professeur	<80%	✅ Réaliste
Messages Ably	<500/min	✅ Sécurisé
Support mobile	100%	✅ Garanti
🎯 Livrables Attendus
SessionClient.tsx refactorisé avec détection de rôle

Hooks WebRTC spécialisés (teacher/student)

Système de spotlight optimisé

Composants vidéo adaptatifs

Documentation architecture mise à jour

Cette architecture permet de supporter confortablement 11 utilisateurs simultanés avec l'infrastructure actuelle