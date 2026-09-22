import type { VisionProvider } from '../../domain/services/interfaces';
import type { PokemonExtractionResult } from '../../domain/vision/models';
import i18n from '../../i18n/config';
import type { VisionErrorDTO } from '../../domain/vision/visionErrors';

const VISION_ENDPOINT = '/api/vision/pokemon';

function getErrorMessage(code: string | undefined, status: number, fallback: string): string {
  if (code && i18n.exists(`settings.gemini.errors.${code}`)) {
    return i18n.t(`settings.gemini.errors.${code}`);
  }
  if (code && i18n.exists(`errors.${code}`)) {
    return i18n.t(`errors.${code}`);
  }
  return `Error ${status}: ${fallback}`;
}

export class GeminiVisionProvider implements VisionProvider {
  private userKey: string | null;

  constructor(userKey: string | null = null) {
    this.userKey = userKey;
  }

  async extractPokemonFromImage(image: Blob | File): Promise<PokemonExtractionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const headers: Record<string, string> = {
      'Content-Type': image.type || 'application/octet-stream',
    };
    if (this.userKey) headers['Authorization'] = `Bearer ${this.userKey}`;

    let response: Response;
    try {
      response = await fetch(VISION_ENDPOINT, {
        method: 'POST',
        body: image,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === 'AbortError') {
        throw new Error(getErrorMessage('TIMEOUT', 408, 'Timeout'), { cause: err });
      }
      throw new Error(getErrorMessage('BACKEND_DOWN', 0, 'No se pudo conectar con el servidor'), { cause: err });
    } finally {
      clearTimeout(timeoutId);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (err) {
      throw new Error(getErrorMessage('INVALID_RESPONSE', 502, 'La respuesta del servidor no es válida'), { cause: err });
    }

    if (!response.ok) {
      const errBody = body as VisionErrorDTO;
      throw new Error(getErrorMessage(errBody?.code, response.status, errBody?.error || 'Error desconocido'));
    }

    return body as PokemonExtractionResult;
  }

  static async testConnection(userKey: string | null): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const headers: Record<string, string> = {};
    if (userKey) headers['Authorization'] = `Bearer ${userKey}`;

    let response: Response;
    try {
      response = await fetch('/api/vision/test', {
        method: 'POST',
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(getErrorMessage('BACKEND_DOWN', 0, 'No se pudo conectar con el servidor'), { cause: err });
    } finally {
      clearTimeout(timeoutId);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (err) {
      throw new Error(getErrorMessage('INVALID_RESPONSE', 502, 'La respuesta del servidor no es válida'), { cause: err });
    }

    if (!response.ok) {
      const errBody = body as VisionErrorDTO;
      throw new Error(getErrorMessage(errBody?.code, response.status, errBody?.error || 'Error desconocido'));
    }
  }
}
