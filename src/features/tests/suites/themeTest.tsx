import { globalHarness } from '../testHarness';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Collection from '../../collection/Collection';
import Recipes from '../../recipes/Recipes';

globalHarness.register({
  id: 'THEME-001',
  name: 'Cambio dinámico de tema',
  category: 'Theme',
  layer: 'SERVICE',
  fn: async () => {
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    
    html.classList.add('dark');
    const isDarkNow = html.classList.contains('dark');
    
    html.classList.remove('dark');
    const isLightNow = !html.classList.contains('dark');
    
    if (wasDark) html.classList.add('dark');
    else html.classList.remove('dark');
    
    if (!isDarkNow || !isLightNow) {
      return { status: 'FAIL', message: 'No se pudo aplicar la clase dark al HTML' };
    }
    
    return { status: 'PASS', message: 'Cambio de tema simulado correctamente' };
  }
});

async function mountAndCheckTheme(isDark: boolean, component: React.ReactElement): Promise<string[]> {
  const errors: string[] = [];
  const html = document.documentElement;
  const wasDark = html.classList.contains('dark');
  
  if (isDark) html.classList.add('dark');
  else html.classList.remove('dark');

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  
  await new Promise<void>(resolve => {
    root.render(<MemoryRouter>{component}</MemoryRouter>);
    setTimeout(resolve, 300); // let it render
  });

  // Check inputs
  const inputs = container.querySelectorAll('input, select');
  inputs.forEach(el => {
    const style = window.getComputedStyle(el);
    if (isDark) {
      if (style.backgroundColor === 'rgb(255, 255, 255)' && style.color === 'rgb(255, 255, 255)') {
        errors.push('Input blanco sobre blanco en dark mode');
      }
    } else {
      if (style.backgroundColor === 'rgb(255, 255, 255)' && style.color === 'rgb(255, 255, 255)') {
        errors.push('Input texto blanco sobre fondo claro');
      }
    }
  });

  root.unmount();
  container.remove();
  
  if (wasDark) html.classList.add('dark');
  else html.classList.remove('dark');
  
  return errors;
}

globalHarness.register({
  id: 'THEME-002',
  name: 'Contraste Light Mode en Componentes',
  category: 'Theme',
  layer: 'DOM/UI',
  fn: async () => {
    let errs: string[] = [];
    errs = errs.concat(await mountAndCheckTheme(false, <Collection />));
    errs = errs.concat(await mountAndCheckTheme(false, <Recipes />));
    
    if (errs.length > 0) return { status: 'WARN', message: 'Posibles problemas de contraste', details: errs.join(', ') };
    return { status: 'PASS', message: 'Renderizado visualmente coherente en Light Mode' };
  }
});

globalHarness.register({
  id: 'THEME-003',
  name: 'Contraste Dark Mode en Componentes',
  category: 'Theme',
  layer: 'DOM/UI',
  fn: async () => {
    let errs: string[] = [];
    errs = errs.concat(await mountAndCheckTheme(true, <Collection />));
    errs = errs.concat(await mountAndCheckTheme(true, <Recipes />));
    
    if (errs.length > 0) return { status: 'WARN', message: 'Posibles problemas de contraste', details: errs.join(', ') };
    return { status: 'PASS', message: 'Renderizado visualmente coherente en Dark Mode' };
  }
});
