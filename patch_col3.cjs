const fs = require('fs');
let c = fs.readFileSync('src/features/collection/Collection.tsx', 'utf8');

c = c.replace(
  '<div className="flex gap-2">',
  `<div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-3 py-2 bg-bg-surface border border-border-main rounded-lg text-sm w-full sm:w-32" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-bg-surface border border-border-main rounded-lg px-3 py-2 text-sm">
            <option value="level">Nv</option>
            <option value="name">Nombre</option>
          </select>
          <button onClick={handleExport} className="p-2 border border-border-main rounded-lg bg-bg-surface hover:bg-slate-100" title="Exportar Backup JSON">
            <Download size={18} className="text-text-muted"/>
          </button>`
);

fs.writeFileSync('src/features/collection/Collection.tsx', c);
