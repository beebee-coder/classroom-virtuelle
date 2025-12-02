// src/components/ImageDebugger.tsx
'use client';

import { useState, useEffect } from 'react';

interface ImageDebuggerProps {
  imageUrl: string;
}

export function ImageDebugger({ imageUrl }: ImageDebuggerProps) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageInfo, setImageInfo] = useState<any>(null);

  useEffect(() => {
    if (!imageUrl) {
      setImageStatus('error');
      return;
    }

    const img = new Image();
    
    img.onload = () => {
      console.log('✅ [DEBUG] Image chargée avec succès:', {
        url: imageUrl,
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
      setImageStatus('loaded');
      setImageInfo({
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    };

    img.onerror = () => {
      console.error('❌ [DEBUG] Erreur de chargement de l\'image:', imageUrl);
      setImageStatus('error');
    };

    img.src = imageUrl;

    // Test également avec fetch pour voir les headers
    fetch(imageUrl, { method: 'HEAD' })
      .then(response => {
        console.log('📋 [DEBUG] Headers de l\'image:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
      })
      .catch(err => {
        console.error('❌ [DEBUG] Erreur fetch HEAD:', err);
      });
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">❌ Aucune URL d'image fournie</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
      <h3 className="font-bold mb-2">Debug Image</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><strong>Status:</strong> 
            <span className={`ml-2 ${
              imageStatus === 'loaded' ? 'text-green-600' : 
              imageStatus === 'error' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {imageStatus.toUpperCase()}
            </span>
          </p>
          <p><strong>URL:</strong></p>
          <code className="text-xs break-all bg-white p-1 block mt-1">
            {imageUrl}
          </code>
        </div>
        
        {imageInfo && (
          <div>
            <p><strong>Dimensions:</strong> {imageInfo.width} × {imageInfo.height}</p>
            <p><strong>Dimensions naturelles:</strong> {imageInfo.naturalWidth} × {imageInfo.naturalHeight}</p>
          </div>
        )}
      </div>

      {/* Test d'affichage de l'image */}
      <div className="mt-4">
        <p className="text-sm font-medium mb-2">Prévisualisation:</p>
        {imageStatus === 'loaded' ? (
          <img 
            src={imageUrl} 
            alt="Test debug" 
            className="max-w-full h-auto border border-green-500 rounded"
            onError={(e) => {
              console.error('❌ Erreur dans la balise img:', e);
            }}
          />
        ) : imageStatus === 'error' ? (
          <div className="bg-red-100 p-2 rounded text-red-800">
            ❌ L'image ne peut pas être chargée
          </div>
        ) : (
          <div className="bg-yellow-100 p-2 rounded text-yellow-800">
            ⏳ Chargement...
          </div>
        )}
      </div>

      {/* Bouton pour tester dans un nouvel onglet */}
      <button 
        onClick={() => window.open(imageUrl, '_blank')}
        className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
      >
        Ouvrir dans un nouvel onglet
      </button>
    </div>
  );
}
