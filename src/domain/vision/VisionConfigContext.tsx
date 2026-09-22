import { createContext, useContext, useState, type ReactNode } from 'react';

export type ProviderKey = 'mock' | 'gemini';

export interface VisionConfig {
  provider: ProviderKey;
  setProvider: (p: ProviderKey) => void;
  geminiApiKey: string | null;
  setGeminiApiKey: (key: string | null) => void;
}

const VisionConfigContext = createContext<VisionConfig | null>(null);

export function VisionConfigProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ProviderKey>('mock');
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);

  return (
    <VisionConfigContext.Provider value={{ provider, setProvider, geminiApiKey, setGeminiApiKey }}>
      {children}
    </VisionConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVisionConfig() {
  const context = useContext(VisionConfigContext);
  if (!context) {
    throw new Error('useVisionConfig must be used within a VisionConfigProvider');
  }
  return context;
}

