import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVisionConfig } from '../../domain/vision/VisionConfigContext';
import { GeminiVisionProvider } from '../../services/vision/GeminiVisionProvider';
import { Eye, EyeOff, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { provider, setProvider, geminiApiKey, setGeminiApiKey } = useVisionConfig();
  const { theme, setTheme } = useTheme();

  const [inputKey, setInputKey] = useState(geminiApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvider(e.target.value as 'mock' | 'gemini');
    setTestStatus('idle');
    setTestMessage(null);
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputKey(val);
    setGeminiApiKey(val || null); // guardado solo en memoria (contexto)
    setTestStatus('idle');
    setTestMessage(null);
  };

  const deleteKey = () => {
    setInputKey('');
    setGeminiApiKey(null);
    setTestStatus('idle');
    setTestMessage(null);
  };

  const testConnection = async () => {
    setTestStatus('testing');
    setTestMessage(null);
    try {
      // Usamos el inputKey, o null para que intente usar el del server
      await GeminiVisionProvider.testConnection(inputKey || null);
      setTestStatus('success');
      setTestMessage(t('settings.gemini.status_success'));
    } catch (err) {
      setTestStatus('error');
      setTestMessage((err as Error).message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-text-main">{t('nav.settings')}</h1>

      <div className="bg-bg-surface p-6 rounded-xl border border-border-main shadow-sm flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-bold text-text-main">{t('settings.language')}</label>
          <select
            value={i18n.language}
            onChange={handleLanguageChange}
            className="p-2 border border-border-main rounded max-w-xs focus:ring-indigo-500 focus:border-indigo-500 bg-bg-surface text-text-main dark:bg-gray-800 dark:text-white"
          >
            <option className="dark:bg-gray-800 dark:text-white" value="es">Español</option>
            <option className="dark:bg-gray-800 dark:text-white" value="en">English</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-bold text-text-main">{t('settings.theme')}</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
            className="p-2 border border-border-main rounded max-w-xs focus:ring-indigo-500 focus:border-indigo-500 bg-bg-surface"
          >
            <option className="dark:bg-gray-800 dark:text-white" value="light">{t('settings.light')}</option>
            <option className="dark:bg-gray-800 dark:text-white" value="dark">{t('settings.dark')}</option>
          </select>
        </div>
      </div>

      <div className="bg-bg-surface p-6 rounded-xl border border-border-main shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-text-main border-b pb-2">{t('settings.gemini.title')}</h2>
        
        <div className="flex flex-col gap-2">
          <label className="font-bold text-text-main">{t('settings.gemini.provider_label')}</label>
          <select
            value={provider}
            onChange={handleProviderChange}
            className="p-2 border border-border-main rounded max-w-xs focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
          >
            <option className="dark:bg-gray-800 dark:text-white" value="mock">{t('settings.gemini.provider_mock')}</option>
            <option className="dark:bg-gray-800 dark:text-white" value="gemini">{t('settings.gemini.provider_gemini')}</option>
          </select>
        </div>

        {provider === 'gemini' && (
          <div className="space-y-4 pt-4">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-text-main">{t('settings.gemini.api_key_label')}</label>
              
              <div className="flex items-center gap-2 max-w-lg">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={handleKeyChange}
                    placeholder={t('settings.gemini.api_key_placeholder')}
                    className="w-full p-2 pr-10 border border-border-main rounded focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-muted"
                    title={showKey ? t('settings.gemini.hide_key') : t('settings.gemini.show_key')}
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testStatus === 'testing'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium disabled:opacity-50 whitespace-nowrap"
                >
                  {testStatus === 'testing' ? t('settings.gemini.status_testing') : t('settings.gemini.test_connection')}
                </button>
                
                {inputKey && (
                  <button
                    type="button"
                    onClick={deleteKey}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    title={t('settings.gemini.delete_key')}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              
              <p className="text-sm text-text-muted">{t('settings.gemini.no_key_warning')}</p>
              {inputKey && (
                <p className="text-xs text-amber-600 font-medium">{t('settings.gemini.byok_warning')}</p>
              )}
            </div>

            {testMessage && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm border ${
                testStatus === 'success' 
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300'
              }`}>
                {testStatus === 'success' ? <CheckCircle size={18} className="text-green-600" /> : <AlertCircle size={18} className="text-red-600" />}
                {testMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
