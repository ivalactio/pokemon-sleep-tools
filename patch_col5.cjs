const fs = require('fs');
let c = fs.readFileSync('src/features/collection/Collection.tsx', 'utf8');

c = c.replace(
  '{!pokemonList || pokemonList.length === 0 ? (',
  '{!filteredList || filteredList.length === 0 ? ('
);

c = c.replace(
  '{pokemonList.map(p => (',
  '{filteredList.map(p => ('
);

fs.writeFileSync('src/features/collection/Collection.tsx', c);
