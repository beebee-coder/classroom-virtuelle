// src/lib/tldraw-utils.ts - Adaptateur de types
import { TLStoreSnapshot, TLEditorSnapshot } from '@tldraw/tldraw';

// Fonction de conversion si nécessaire
export function convertToStoreSnapshot(editorSnapshot: TLEditorSnapshot): TLStoreSnapshot {
  // Logique de conversion selon votre version
  return editorSnapshot as unknown as TLStoreSnapshot;
}

export function convertToEditorSnapshot(storeSnapshot: TLStoreSnapshot): TLEditorSnapshot {
  // Logique de conversion selon votre version  
  return storeSnapshot as unknown as TLEditorSnapshot;
}
