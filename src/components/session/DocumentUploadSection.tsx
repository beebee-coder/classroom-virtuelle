// src/components/session/DocumentUploadSection.tsx
'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { DocumentInHistory } from '@/types';

interface DocumentUploadSectionProps {
  sessionId: string;
  onUploadSuccess: (doc: { name: string; url: string }) => void;
}

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const WARNING_THRESHOLD_BYTES = MAX_FILE_SIZE_BYTES * 0.9; // 90% de la limite

export function DocumentUploadSection({ sessionId, onUploadSuccess }: DocumentUploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Réinitialiser les états
    setUploadError(null);
    setUploadWarning(null);
    setUploadSuccess(false);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`Le fichier est trop volumineux (max ${MAX_FILE_SIZE_MB}MB)`);
      return;
    }

    if (file.size > WARNING_THRESHOLD_BYTES) {
      setUploadWarning(`Attention: Le fichier est volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB). L'envoi peut être long.`);
    }

    if (!cloudName || !uploadPreset) {
      setUploadError('Configuration Cloudinary manquante');
      return;
    }

    setIsUploading(true);

    try {
      console.log('📤 [DOC UPLOAD] Début de l\'upload du fichier:', file.name);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('resource_type', 'auto');
      formData.append('folder', 'classroom_connector_docs');

      const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!cloudinaryResponse.ok) {
        const errorText = await cloudinaryResponse.text();
        console.error('❌ [DOC UPLOAD] Erreur Cloudinary:', errorText);
        throw new Error(`Erreur Cloudinary: ${cloudinaryResponse.status}`);
      }

      const cloudinaryResult = await cloudinaryResponse.json();
      console.log('✅ [DOC UPLOAD] Upload Cloudinary réussi:', cloudinaryResult);

      const newDoc = {
        name: file.name,
        url: cloudinaryResult.secure_url,
      };

      console.log('📤 [DOC UPLOAD] Appel de onUploadSuccess avec:', newDoc);
      onUploadSuccess(newDoc);
      
      setUploadSuccess(true);
      setUploadWarning(null); // Cache l'avertissement en cas de succès

      console.log('✅ [DOC UPLOAD] Processus complet réussi');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('❌ [DOC UPLOAD] Erreur complète:', error);
      
      if (error instanceof Error) {
        setUploadError('Erreur: ' + error.message);
      } else {
        setUploadError('Erreur inconnue lors du partage du fichier');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (!cloudName || !uploadPreset) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Configuration Cloudinary manquante.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button 
        onClick={handleButtonClick}
        disabled={isUploading}
        className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
      >
        {isUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : uploadSuccess ? (
          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        {isUploading ? 'Upload en cours...' : uploadSuccess ? 'Fichier partagé !' : 'Partager un fichier'}
      </button>

      {uploadError && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {uploadWarning && !uploadError && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{uploadWarning}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>Fichier partagé avec succès !</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center">
        Tous types de fichiers (max ${MAX_FILE_SIZE_MB}MB)
      </div>
    </div>
  );
}
