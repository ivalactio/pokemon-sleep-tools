import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { VisionProvider } from '../../../domain/services/interfaces';
import type { PokemonDraft } from '../../../domain/vision/models';
import { VisionValidationService } from '../../../services/vision/VisionValidationService';

interface VisionCaptureProps {
  provider: VisionProvider;
  /** Nombre del proveedor activo para mostrar en el estado de carga. */
  providerLabel?: string;
  onExtracted: (draft: PokemonDraft) => void;
  onError: (error: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type ProcessingStatus = 'idle' | 'validating' | 'analyzing' | 'done';

export default function VisionCapture({ provider, providerLabel = 'Proveedor', onExtracted, onError }: VisionCaptureProps) {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = status !== 'idle';

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError(`Tipo de archivo no soportado. Usa PNG, JPEG o WebP.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      onError(`El archivo es demasiado grande (máx 5MB).`);
      return;
    }

    setStatus('validating');
    try {
      setStatus('analyzing');
      const extraction = await provider.extractPokemonFromImage(file);
      const draft = VisionValidationService.validateExtraction(extraction);
      setStatus('done');
      onExtracted(draft);
    } catch (err) {
      setStatus('idle');
      onError(err instanceof Error ? err.message : 'Error desconocido al procesar la imagen');
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
      // Reset input so the same file can be re-selected after an error
      e.target.value = '';
    }
  };

  const STATUS_MESSAGES: Record<ProcessingStatus, string> = {
    idle: '',
    validating: 'Validando imagen...',
    analyzing: `Analizando con ${providerLabel}...`,
    done: 'Análisis completado',
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm flex gap-3 items-start">
        <div className="font-bold shrink-0 mt-0.5">⚠️</div>
        <div>
          <strong className="block mb-1">Funcionalidad experimental inacabada</strong>
          Esta funcionalidad todavía está en desarrollo. El análisis automático puede producir resultados incorrectos o inexactos, por lo que <strong>requiere revisión manual</strong> exhaustiva antes de guardar.
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
        {isProcessing ? (
        <div className="flex flex-col items-center text-slate-600 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="font-medium">{STATUS_MESSAGES[status]}</p>
          <p className="text-xs text-slate-400">No cierres esta pantalla mientras se analiza</p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-bg-surface border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ImageIcon className="w-5 h-5 text-slate-600" />
              <span>Subir Imagen</span>
            </button>
            {/* The capture attribute opens the camera on mobile devices */}
            <label className="flex items-center space-x-2 bg-bg-surface border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
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
    </div>
  );
}
