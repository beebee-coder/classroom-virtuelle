#!/bin/bash

# Configuration et push d'un dépôt existant depuis la ligne de commande

echo "Configuration du remote Git..."
# Ajoute le dépôt distant 'origin'. Si 'origin' existe déjà, cette commande échouera.
# Pour la robustesse, on pourrait vérifier son existence ou le mettre à jour.
git remote add origin https://github.com/beebee-coder/classroom-virtuelle.git

echo "Renommage de la branche en 'main'..."
# Renomme la branche actuelle en 'main'
git branch -M main

echo "Push de la branche 'main' vers le dépôt distant 'origin'..."
# Pousse la branche 'main' et configure le suivi pour les futurs 'git pull/push'
git push -u origin main

echo "Déploiement terminé."
