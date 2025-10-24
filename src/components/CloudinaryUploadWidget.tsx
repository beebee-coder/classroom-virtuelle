// src/components/CloudinaryUploadWidget.tsx
'use client';

import { useState, useEffect, createContext, useCallback, useRef, ReactElement } from 'react';

interface CloudinaryScriptContextType {
  loaded: boolean;
}

interface CloudinaryUploadWidgetProps {
  onUpload: (result: any) => void;
  children: (props: { open: () => void; loaded: boolean; error: string | null }) => ReactElement;
}

interface CloudinaryWindow extends Window {
  cloudinary?: {
    createUploadWidget: (options: any, callback: (error: any, result: any) => void) => any;
  };
}

// Types pour les résultats Cloudinary
interface CloudinaryUploadResult {
  event: string;
  info?: {
    public_id: string;
    secure_url: string;
    original_filename: string;
    format: string;
    bytes: number;
    width?: number;
    height?: number;
  };
}

const CloudinaryScriptContext = createContext<CloudinaryScriptContextType>({ loaded: false });

function CloudinaryUploadWidget({ onUpload, children }: CloudinaryUploadWidgetProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<any>(null);

  // CORRECTION : Utiliser uniquement le cloud démo Cloudinary avec des presets valides
  const cloudName = 'demo'; // Cloud démo officiel de Cloudinary
  const uploadPreset = 'docs_upload_example_uspectz'; // Preset valide du cloud démo

  useEffect(() => {
    console.log('🖼️ [WIDGET] Initialisation du widget Cloudinary...');
    console.log(`🔧 [WIDGET] Configuration - Cloud: ${cloudName}, Preset: ${uploadPreset}`);

    // Avertissement si on utilise le cloud démo
    if (cloudName === 'demo') {
      console.warn('⚠️ [WIDGET] Mode démo Cloudinary activé - pour la production, configurez votre propre cloud');
    }

    const cloudinaryWindow = window as CloudinaryWindow;

    // Vérifier si le script est déjà chargé
    if (cloudinaryWindow.cloudinary) {
      console.log('✅ [WIDGET] Script Cloudinary déjà chargé.');
      setLoaded(true);
      initializeWidget();
      return;
    }

    // Vérifier si le script est en cours de chargement
    if (document.getElementById('cloudinary-upload-widget')) {
      console.log('⏳ [WIDGET] Script Cloudinary déjà en cours de chargement.');
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('async', '');
    script.setAttribute('id', 'cloudinary-upload-widget');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    
    const handleLoad = () => {
      console.log('✅ [WIDGET] Script Cloudinary chargé avec succès.');
      setLoaded(true);
      setError(null);
      initializeWidget();
    };

    const handleError = (err: ErrorEvent) => {
      console.error('❌ [WIDGET] Échec du chargement du script Cloudinary:', err);
      setError('Erreur de chargement du script Cloudinary. Vérifiez votre connexion internet.');
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      // Nettoyer le widget
      if (widgetRef.current) {
        try {
          widgetRef.current.destroy();
          widgetRef.current = null;
        } catch (e) {
          console.warn('⚠️ [WIDGET] Erreur lors du nettoyage du widget:', e);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudName, uploadPreset]);

  const initializeWidget = useCallback(() => {
    const cloudinaryWindow = window as CloudinaryWindow;
    
    if (!cloudinaryWindow.cloudinary) {
      console.error('❌ [WIDGET] Cloudinary non disponible après chargement');
      setError('Cloudinary non disponible');
      return;
    }

    try {
      const options = {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        folder: "classroom_connector_proofs",
        cropping: false, // Important : désactivé pour le cloud démo
        sources: ['local', 'url', 'camera'],
        multiple: false,
        maxFiles: 1,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
        maxFileSize: 5000000, // 5MB
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#90A0B3",
            tabIcon: "#0078FF",
            menuIcons: "#5A616A",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#0078FF",
            action: "#FF620C",
            inactiveTabIcon: "#0E2F5A",
            error: "#F44235",
            inProgress: "#0078FF",
            complete: "#20B832",
            sourceBg: "#E4EBF1"
          }
        }
      };

      const handleUploadCallback = (error: any, result: CloudinaryUploadResult) => {
        if (error) {
          console.error('❌ [WIDGET] Erreur d\'upload Cloudinary:', error);
          
          // Gestion spécifique des erreurs Cloudinary
          if (error.status === 'Upload preset not found') {
            setError('Le preset d\'upload n\'existe pas. Utilisation du mode démo Cloudinary.');
          } else if (error.status === 'upload preset must be whitelisted for unsigned uploads') {
            setError('Le preset n\'est pas autorisé pour les uploads non signés.');
          } else {
            setError(`Erreur d'upload: ${error.status || 'Erreur inconnue'}`);
          }
          return;
        }

        if (!result) return;

        switch (result.event) {
          case 'success':
            console.log('✅ [WIDGET] Upload réussi:', result.info);
            setError(null);
            onUpload(result);
            break;
            
          case 'close':
            console.log('🚪 [WIDGET] Widget fermé.');
            setError(null);
            break;
            
          case 'abort':
            console.log('⏹️ [WIDGET] Upload annulé.');
            setError(null);
            break;
            
          case 'display-changed':
          case 'source-changed':
          case 'upload-added':
          case 'queues-start':
          case 'queues-end':
            // Événements normaux, pas d'erreur
            console.log(`📦 [WIDGET] Événement ${result.event} reçu`);
            break;
            
          default:
            console.log(`📦 [WIDGET] Événement ${result.event} reçu`);
        }
      };

      widgetRef.current = cloudinaryWindow.cloudinary.createUploadWidget(
        options,
        handleUploadCallback
      );

      console.log('✅ [WIDGET] Widget initialisé avec succès');

    } catch (err) {
      console.error('❌ [WIDGET] Erreur lors de l\'initialisation du widget:', err);
      setError('Erreur d\'initialisation du widget Cloudinary');
    }
  }, [cloudName, uploadPreset, onUpload]);

  const openWidget = useCallback(() => {
    console.log('🚀 [WIDGET] Tentative d\'ouverture du widget...');
    
    if (!loaded) {
      console.error("❌ [WIDGET] Script Cloudinary pas encore chargé.");
      setError('Veuillez patienter, le widget est en cours de chargement...');
      return;
    }

    if (!widgetRef.current) {
      console.error("❌ [WIDGET] Widget non initialisé.");
      setError('Widget non initialisé. Veuillez réessayer.');
      return;
    }

    try {
      widgetRef.current.open();
      console.log('✅ [WIDGET] Widget ouvert avec succès');
      setError(null);
    } catch (err) {
      console.error('❌ [WIDGET] Erreur à l\'ouverture du widget:', err);
      setError('Impossible d\'ouvrir le widget. Vérifiez votre connexion.');
    }
  }, [loaded]);
  
  const childrenElement = children({ open: openWidget, loaded, error });

  return (
    <CloudinaryScriptContext.Provider value={{ loaded }}>
      <>
        {childrenElement}
        {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                <strong>Erreur Cloudinary:</strong> {error}
                <div className="mt-1 text-xs">
                    {cloudName === 'demo' ? 
                    'Mode démo activé - configurez vos propres identifiants Cloudinary pour la production' : 
                    'Vérifiez votre configuration Cloudinary'
                    }
                </div>
            </div>
        )}
      </>
    </CloudinaryScriptContext.Provider>
  );
}

export { CloudinaryUploadWidget, CloudinaryScriptContext };
export type { CloudinaryUploadResult, CloudinaryUploadWidgetProps };
