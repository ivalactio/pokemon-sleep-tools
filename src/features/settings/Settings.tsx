import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-slate-800">{t('nav.settings')}</h1>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-2">
          <label className="font-bold text-slate-700">{t('settings.language')}</label>
          <select
            value={i18n.language}
            onChange={handleLanguageChange}
            className="p-2 border border-slate-300 rounded max-w-xs focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>
  );
}
