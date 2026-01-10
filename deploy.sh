#!/bin/bash
set -e # Arrête le script si une commande échoue

echo "Configuration du remote Git..."
# Supprime le remote 'origin' s'il existe déjà, pour éviter les erreurs
git remote remove origin &>/dev/null || true
# Ajoute le remote en utilisant HTTPS
git remote add origin https://github.com/beebee-coder/classroom-virtuelle.git

echo "Nettoyage des fichiers déjà suivis par Git qui devraient être ignorés..."
# Retire .env du suivi Git, s'il est suivi
git rm --cached .env &>/dev/null || true
# Retire deploy.sh du suivi Git, s'il est suivi
git rm --cached deploy.sh &>/dev/null || true

echo "Vérification des changements à commiter..."
# Vérifie s'il y a des changements à commiter (y compris les suppressions du cache)
if ! git diff-index --quiet HEAD --; then
  echo "Création d'un commit pour les modifications..."
  git add .
  # Utilise une configuration locale pour le commit
  git -c user.name="Firebase Studio" -c user.email="studio@example.com" commit -m "Clean up tracked files and sync changes"
else
  echo "Aucun changement à commiter."
fi

echo "Push de la branche 'main' vers le dépôt distant 'origin' (avec --force)..."
git push -u origin main --force

echo "Déploiement terminé."
