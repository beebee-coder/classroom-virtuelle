#!/bin/bash

# Configuration et push d'un dépôt existant depuis la ligne de commande

REMOTE_URL="https://github.com/beebee-coder/classroom-virtuelle.git"
BRANCH_NAME="main"

echo "Configuration du remote Git..."

# Vérifie si le remote 'origin' existe déjà
if git remote | grep -q 'origin'; then
  echo "Le remote 'origin' existe déjà. On s'assure que l'URL est correcte."
  git remote set-url origin ${REMOTE_URL}
else
  echo "Ajout du remote 'origin'."
  git remote add origin ${REMOTE_URL}
fi

echo "Ajout de tous les fichiers au suivi Git..."
git add .

echo "Création du commit initial..."
# Vérifie s'il y a des modifications à commiter pour éviter une erreur
if git diff-index --quiet HEAD --; then
  echo "Aucune modification à commiter. Le commit initial existe probablement déjà."
else
  git commit -m "Initial project commit"
fi

echo "Renommage de la branche en '${BRANCH_NAME}'..."
# Renomme la branche actuelle en 'main'
git branch -M ${BRANCH_NAME}

echo "Push de la branche '${BRANCH_NAME}' vers le dépôt distant 'origin' (avec --force)..."
# Pousse la branche 'main' et configure le suivi pour les futurs 'git pull/push'
# L'option --force est ajoutée pour écraser l'historique distant et résoudre les erreurs de non-fast-forward.
git push --force -u origin ${BRANCH_NAME}

echo "Déploiement terminé."
