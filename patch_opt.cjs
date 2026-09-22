const fs = require('fs');
let c = fs.readFileSync('src/features/optimizer/OptimizerPage.tsx', 'utf8');

if (!c.includes('import { TeamCompareModal }')) {
  c = c.replace(
    "import { TeamDetailModal } from './components/TeamDetailModal';",
    "import { TeamDetailModal } from './components/TeamDetailModal';\nimport { TeamCompareModal } from './components/TeamCompareModal';"
  );
}

if (!c.includes('const [compareList')) {
  c = c.replace('const [selectedResult, setSelectedResult] = useState<TeamResult | null>(null);', 
  'const [selectedResult, setSelectedResult] = useState<TeamResult | null>(null);\n  const [compareList, setCompareList] = useState<TeamResult[]>([]);\n  const [showCompare, setShowCompare] = useState(false);');
}

if (!c.includes('setCompareList([])')) {
  c = c.replace('const handleOptimize = async () => {', 'const handleOptimize = async () => {\n    setCompareList([]);');
}

if (!c.includes('compareList.includes(res)')) {
  c = c.replace(
    'return (\n                <div key={i} className="bg-bg-surface border border-border-main rounded-xl p-5 shadow-sm space-y-4 cursor-pointer hover:border-indigo-400 transition-colors" onClick={() => setSelectedResult(res)}>',
    'return (\n                <div key={i} className={`bg-bg-surface border ${compareList.includes(res) ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-border-main"} rounded-xl p-5 shadow-sm space-y-4 cursor-pointer hover:border-indigo-400 transition-colors`} onClick={() => setSelectedResult(res)}>'
  );

  c = c.replace(
    '<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-main pb-3 gap-2">',
    `<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-main pb-3 gap-2">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" checked={compareList.includes(res)} onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            if (compareList.length < 2) setCompareList([...compareList, res]);
                          } else {
                            setCompareList(compareList.filter(c => c !== res));
                          }
                        }} />
                      </div>`
  );
}

if (!c.includes('<TeamCompareModal')) {
  c = c.replace(
    '<TeamDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />',
    `{compareList.length === 2 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
            <button onClick={() => setShowCompare(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
              Comparar Equipos
            </button>
          </div>
        )}

        {showCompare && compareList.length === 2 && <TeamCompareModal teams={compareList as [TeamResult, TeamResult]} onClose={() => setShowCompare(false)} />}

        <TeamDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />`
  );
}

fs.writeFileSync('src/features/optimizer/OptimizerPage.tsx', c);
