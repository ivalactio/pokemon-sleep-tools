import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Download, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { globalHarness } from './testHarness';
import type { TestResult } from './types';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';

// Import all suites to register them
import './suites/collectionTest';
import './suites/i18nTest';
import './suites/themeTest';
import './suites/recipesTest';
import './suites/optimizerTest';
import './suites/comparatorTest';
import './suites/persistenceTest';
import './suites/plannerTest';
import './suites/integrationTest';
import './suites/edgeTest';
import './suites/navigationTest';

export default function TestsPage() {
  const { t, i18n } = useTranslation();
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [collectionSize, setCollectionSize] = useState<number | null>(null);

  useEffect(() => {
    collectionRepository.getAll().then(all => setCollectionSize(all.length)).catch(() => setCollectionSize(0));
    // Initialize results state with pending
    const initial: Record<string, TestResult> = {};
    globalHarness.getTests().forEach(test => {
      initial[test.id] = { id: test.id, name: test.name, category: test.category, layer: test.layer, status: 'PENDING' };
    });
    setResults(initial);
  }, []);

  const handleProgress = (res: TestResult) => {
    setResults(prev => ({ ...prev, [res.id]: res }));
  };

  const runAll = async () => {
    setIsRunning(true);
    // Reset
    const reset: Record<string, TestResult> = {};
    globalHarness.getTests().forEach(test => {
      reset[test.id] = { id: test.id, name: test.name, category: test.category, layer: test.layer, status: 'PENDING' };
    });
    setResults(reset);

    await globalHarness.runAll({ t, i18n, dispatch: null }, handleProgress);
    setIsRunning(false);
  };

  const runCategory = async (category: string) => {
    setIsRunning(true);
    await globalHarness.runCategory(category, { t, i18n, dispatch: null }, handleProgress);
    setIsRunning(false);
  };

  const exportJSON = () => {
    const data = JSON.stringify(Object.values(results), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    const values = Object.values(results);
    const pass = values.filter(r => r.status === 'PASS').length;
    const warn = values.filter(r => r.status === 'WARN').length;
    const fail = values.filter(r => r.status === 'FAIL').length;
    
    let md = `# PokéSleep Optimizer — QA Report\n\n`;
    md += `Fecha: ${new Date().toISOString()}\n`;
    md += `Colección detectada: ${collectionSize ?? 'Desconocida'} Pokémon\n\n`;
    md += `Resumen: ${pass} PASS, ${warn} WARN, ${fail} FAIL\n\n`;

    const byCategory = values.reduce((acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    }, {} as Record<string, TestResult[]>);

    for (const [cat, tests] of Object.entries(byCategory)) {
      md += `## ${cat}\n\n`;
      for (const t of tests) {
        md += `- **[${t.status}]** ${t.id} - ${t.name} (${t.duration}ms)\n`;
        if (t.message) md += `  - ${t.message}\n`;
        if (t.error) md += `  - ERROR: ${t.error}\n`;
      }
      md += `\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-report-${new Date().toISOString()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const values = Object.values(results);
  const pass = values.filter(r => r.status === 'PASS').length;
  const warn = values.filter(r => r.status === 'WARN').length;
  const fail = values.filter(r => r.status === 'FAIL').length;
  const total = values.length;
  const runCount = values.filter(r => r.status !== 'PENDING' && r.status !== 'RUNNING').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">QA Dashboard</h1>
          <p className="text-text-muted">Entorno temporal de validación sobre la colección real.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportJSON} className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-main rounded text-sm hover:bg-bg-surface-hover">
            <Download size={16} /> JSON
          </button>
          <button onClick={exportMarkdown} className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-main rounded text-sm hover:bg-bg-surface-hover">
            <Download size={16} /> Markdown
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg-surface p-4 rounded-lg border border-border-main">
          <div className="text-text-muted text-sm font-medium">Estado General</div>
          <div className="text-2xl font-bold mt-1">
            {fail > 0 ? <span className="text-red-500">FAIL</span> : warn > 0 ? <span className="text-amber-500">WARN</span> : runCount > 0 && runCount === total ? <span className="text-green-500">PASS</span> : 'PENDING'}
          </div>
        </div>
        <div className="bg-bg-surface p-4 rounded-lg border border-border-main">
          <div className="text-text-muted text-sm font-medium">Colección Real</div>
          <div className="text-2xl font-bold mt-1 text-indigo-500">{collectionSize ?? '...'} PKMN</div>
        </div>
        <div className="bg-bg-surface p-4 rounded-lg border border-border-main">
          <div className="text-text-muted text-sm font-medium">Progreso</div>
          <div className="text-2xl font-bold mt-1">{runCount} / {total}</div>
        </div>
        <div className="bg-bg-surface p-4 rounded-lg border border-border-main flex items-center justify-between">
          <div className="flex gap-4">
            <div className="text-green-500 font-bold">{pass} P</div>
            <div className="text-amber-500 font-bold">{warn} W</div>
            <div className="text-red-500 font-bold">{fail} F</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={runAll} disabled={isRunning} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50">
          <Play size={16} /> Ejecutar Todos
        </button>
        <button onClick={() => runCategory('Integration')} disabled={isRunning} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50">
          <Play size={16} /> Full integration scenario
        </button>
        <button onClick={() => runCategory('Collection')} disabled={isRunning} className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-main rounded text-sm hover:bg-bg-surface-hover">
          Colección
        </button>
        <button onClick={() => runCategory('Optimizer')} disabled={isRunning} className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-main rounded text-sm hover:bg-bg-surface-hover">
          Optimizer
        </button>
        <button onClick={() => runCategory('Persistence')} disabled={isRunning} className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-main rounded text-sm hover:bg-bg-surface-hover">
          Persistencia
        </button>
      </div>

      <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-main border-b border-border-main">
            <tr>
              <th className="p-3">Estado</th>
              <th className="p-3">ID</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Capa</th>
              <th className="p-3">Tiempo</th>
              <th className="p-3">Mensaje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-main">
            {values.map(res => (
              <tr key={res.id} className="hover:bg-bg-main transition-colors">
                <td className="p-3">
                  {res.status === 'PASS' && <CheckCircle className="text-green-500" size={18} />}
                  {res.status === 'WARN' && <AlertTriangle className="text-amber-500" size={18} />}
                  {res.status === 'FAIL' && <XCircle className="text-red-500" size={18} />}
                  {res.status === 'RUNNING' && <Loader2 className="text-indigo-500 animate-spin" size={18} />}
                  {res.status === 'PENDING' && <Clock className="text-text-muted" size={18} />}
                </td>
                <td className="p-3 font-mono text-xs">{res.id}</td>
                <td className="p-3 font-medium">{res.name}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-bg-app rounded text-xs border border-border-main">{res.category}</span></td>
                <td className="p-3"><span className="px-2 py-0.5 bg-bg-surface-hover rounded text-xs font-mono border border-border-main text-indigo-400">{res.layer || 'SERVICE'}</span></td>
                <td className="p-3 text-text-muted">{res.duration !== undefined ? `${res.duration}ms` : '-'}</td>
                <td className="p-3">
                  <div className="text-text-main">{res.message}</div>
                  {res.error && <div className="text-red-500 text-xs mt-1">{res.error}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Loader2(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
