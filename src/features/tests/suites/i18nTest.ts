import { globalHarness } from '../testHarness';
import esJson from '../../../i18n/locales/es.json';
import enJson from '../../../i18n/locales/en.json';

globalHarness.register({
  id: 'I18N-001',
  name: 'Estructura de claves es.json vs en.json',
  category: 'i18n',
  fn: async () => {
    const missingInEn: string[] = [];
    const missingInEs: string[] = [];
    
    function compare(a: any, b: any, prefix: string, missingObj: string[]) {
      for (const key in a) {
        if (typeof a[key] === 'object' && a[key] !== null) {
          if (!b[key]) missingObj.push(prefix + key);
          else compare(a[key], b[key], prefix + key + '.', missingObj);
        } else {
          if (!b[key]) missingObj.push(prefix + key);
        }
      }
    }
    
    compare(esJson, enJson, '', missingInEn);
    compare(enJson, esJson, '', missingInEs);
    
    if (missingInEn.length > 0 || missingInEs.length > 0) {
      return { 
        status: 'FAIL', 
        message: 'Diferencias estructurales', 
        error: `Faltan en EN: ${missingInEn.length}. Faltan en ES: ${missingInEs.length}` 
      };
    }
    
    return { status: 'PASS', message: 'Estructuras 100% idénticas' };
  }
});

globalHarness.register({
  id: 'I18N-002',
  name: 'Cambio dinámico de idioma (ES -> EN -> ES)',
  category: 'i18n',
  fn: async ({ i18n, t }) => {
    const original = i18n.language;
    
    await i18n.changeLanguage('es');
    const esText = t('app.title');
    if (!esText) return { status: 'FAIL', message: 'Traducción ES falló' };
    
    await i18n.changeLanguage('en');
    const enText = t('app.title');
    if (!enText) return { status: 'FAIL', message: 'Traducción EN falló' };
    
    await i18n.changeLanguage(original);
    
    return { status: 'PASS', message: `Traducido correctamente. ES: ${esText}, EN: ${enText}` };
  }
});
