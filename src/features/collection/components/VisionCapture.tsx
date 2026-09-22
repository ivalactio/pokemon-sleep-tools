import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { VisionProvider } from '../../../domain/services/interfaces';
import type { PokemonDraft } from '../../../domain/vision/models';
import { VisionValidationService } from '../../../services/vision/VisionValidationService';

interface VisionCaptureProps {
  provider: VisionProvider;
  onExtracted: (draft: PokemonDraft) => void;
  onError: (error: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function VisionCapture({ provider, onExtracted, onError }: VisionCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError(`Tipo de archivo no soportado. Usa PNG, JPEG o WebP.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      onError(`El archivo es demasiado grande (máx 5MB).`);
      return;
    }

    setIsProcessing(true);
    try {
      const extraction = await provider.extractPokemonFromImage(file);
      const draft = VisionValidationService.validateExtraction(extraction);
      onExtracted(draft);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error desconocido al procesar la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
      {isProcessing ? (
        <div className="flex flex-col items-center text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-green-600" />
          <p>Analizando imagen...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ImageIcon className="w-5 h-5 text-slate-600" />
              <span>Subir Imagen</span>
            </button>
            {/* The capture attribute opens the camera on mobile devices */}
            <label className="flex items-center space-x-2 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
              <Camera className="w-5 h-5 text-slate-600" />
              <span>Cámara</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onInputChange}
              />
            </label>
          </div>
          <p className="text-sm text-slate-500">PNG, JPEG o WebP (Max 5MB)</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={onInputChange}
          />
        </div>
      )}
    </div>
  );
}
