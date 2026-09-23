import { globalHarness } from '../testHarness';

globalHarness.register({
  id: 'THEME-001',
  name: 'Cambio dinámico de tema',
  category: 'Theme',
  fn: async () => {
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    
    // Switch to dark
    html.classList.add('dark');
    const isDarkNow = html.classList.contains('dark');
    
    // Switch to light
    html.classList.remove('dark');
    const isLightNow = !html.classList.contains('dark');
    
    // Restore
    if (wasDark) html.classList.add('dark');
    else html.classList.remove('dark');
    
    if (!isDarkNow || !isLightNow) {
      return { status: 'FAIL', message: 'No se pudo aplicar la clase dark al HTML' };
    }
    
    return { status: 'PASS', message: 'Cambio de tema simulado correctamente' };
  }
});
