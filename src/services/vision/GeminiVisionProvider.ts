import type { VisionProvider } from '../../domain/services/interfaces';
import type { PokemonExtractionResult } from '../../domain/vision/models';

/**
 * GeminiVisionProvider serves as the boundary between the React frontend
 * and the future Gemini extraction service.
 * 
 * To ensure security, the actual Gemini API calls will be made from a backend server
 * or serverless function so the API key is not exposed to the client.
 * 
 * This provider will send the image to our secure backend endpoint, which will
 * return the structured JSON (PokemonExtractionResult).
 */
export class GeminiVisionProvider implements VisionProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extractPokemonFromImage(_image: Blob | File): Promise<PokemonExtractionResult> {
    throw new Error("Not implemented yet. En la futura Fase 4, este método enviará la imagen a nuestro backend seguro que se comunicará con Gemini.");
  }
}
