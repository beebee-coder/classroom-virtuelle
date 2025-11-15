// src/components/session/PDFUploadSection.tsx
'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { shareDocument } from '@/lib/actions/session.actions';

interface PDFUploadSectionProps {
  sessionId: string;
  onUploadSuccess: () => void;
}

export function PDFUploadSection({ sessionId, onUploadSuccess }: PDFUploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Veuillez sélectionner un fichier PDF valide');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Le fichier est trop volumineux (maximum 50MB)');
      return;
    }

    if (!cloudName || !uploadPreset) {
      setUploadError('Configuration Cloudinary manquante');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      console.log('📤 [PDF UPLOAD] Début de l\'upload du PDF:', file.name);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('resource_type', 'auto');
      formData.append('folder', 'classroom_connector_pdfs');

      const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!cloudinaryResponse.ok) {
        const errorText = await cloudinaryResponse.text();
        console.error('❌ [PDF UPLOAD] Erreur Cloudinary:', errorText);
        throw new Error(`Erreur Cloudinary: ${cloudinaryResponse.status}`);
      }

      const cloudinaryResult = await cloudinaryResponse.json();
      console.log('✅ [PDF UPLOAD] Upload Cloudinary réussi:', cloudinaryResult);

      const newDoc = {
        name: file.name.replace('.pdf', ''),
        url: cloudinaryResult.secure_url,
      };

      console.log('📤 [PDF UPLOAD] Appel de shareDocument avec:', newDoc);
      
      const result = await shareDocument(sessionId, newDoc);
      
      console.log('✅ [PDF UPLOAD] shareDocument réussi:', result);
      
      setUploadSuccess(true);
      onUploadSuccess();

      console.log('✅ [PDF UPLOAD] Processus complet réussi');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('❌ [PDF UPLOAD] Erreur complète:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('500')) {
          setUploadError('Erreur serveur lors du partage du document. Vérifiez la console pour plus de détails.');
        } else if (error.message.includes('Cloudinary')) {
          setUploadError('Erreur lors de l\'upload vers Cloudinary: ' + error.message);
        } else {
          setUploadError('Erreur: ' + error.message);
        }
      } else {
        setUploadError('Erreur inconnue lors du partage du PDF');
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
        accept=".pdf,application/pdf"
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
        {isUploading ? 'Upload en cours...' : uploadSuccess ? 'PDF partagé !' : 'Partager un PDF'}
      </button>

      {uploadError && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>PDF partagé avec succès !</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center">
        Formats acceptés : PDF (max 50MB)
      </div>
    </div>
  );
}
