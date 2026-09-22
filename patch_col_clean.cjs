const fs = require('fs');
let c = fs.readFileSync('src/features/collection/Collection.tsx', 'utf8');

c = c.replace(
  "import { Plus, Image as ImageIcon, Sparkles, FlaskConical } from 'lucide-react';",
  "import { Plus, Image as ImageIcon, Sparkles, FlaskConical, Search, Download } from 'lucide-react';"
);

c = c.replace(
  'const [draft, setDraft] = useState<PokemonDraft | null>(null);',
  `const [draft, setDraft] = useState<PokemonDraft | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'level' | 'name'>('level');

  const filteredList = (pokemonList || []).filter(p => {
    if (search && !p.nickname?.toLowerCase().includes(search.toLowerCase()) && !p.speciesId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'level') return b.level - a.level;
    if (sortBy === 'name') return (a.nickname || a.speciesId).localeCompare(b.nickname || b.speciesId);
    return b.level - a.level;
  });

  const handleExport = () => {
    const data = JSON.stringify(pokemonList, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pokesleep_backup.json';
    a.click();
  };`
);

c = c.replace(
  '<div className="flex justify-between items-center mb-6">',
  `<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">`
);

c = c.replace(
  '{/* ACTIONS */}',
  `{/* GESTION AVANZADA */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-3 py-2 bg-bg-surface border border-border-main rounded-lg text-sm w-full sm:w-48" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-bg-surface border border-border-main rounded-lg px-3 py-2 text-sm">
            <option value="level">Mayor Nivel</option>
            <option value="name">Nombre</option>
          </select>
          <button onClick={handleExport} className="p-2 border border-border-main rounded-lg bg-bg-surface hover:bg-slate-100" title="Exportar Backup JSON">
            <Download size={18} className="text-text-muted"/>
          </button>
        </div>

        {/* ACTIONS */}`
);

c = c.replace(
  'pokemonList?.length === 0',
  'filteredList.length === 0'
);

c = c.replace(
  'pokemonList?.map',
  'filteredList.map'
);

fs.writeFileSync('src/features/collection/Collection.tsx', c);
