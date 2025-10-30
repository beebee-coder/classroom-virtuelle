// src/lib/tldraw-utils.ts
import { TLStoreSnapshot } from '@tldraw/tldraw';

/**
 * Fonction utilitaire pour valider un snapshot tldraw.
 * (Exemple de contenu pour ce fichier)
 */
export function isValidSnapshot(snapshot: any): snapshot is TLStoreSnapshot {
  return (
    snapshot &&
    typeof snapshot === 'object' &&
    'store' in snapshot &&
    'schema' in snapshot
  );
}
