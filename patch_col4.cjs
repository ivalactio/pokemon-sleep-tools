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
  'pokemonList?.length === 0',
  'filteredList.length === 0'
);

c = c.replace(
  'pokemonList?.map',
  'filteredList.map'
);

fs.writeFileSync('src/features/collection/Collection.tsx', c);
