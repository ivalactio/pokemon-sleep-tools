export type IslandId =
  | 'greengrass'
  | 'cyan'
  | 'taupe'
  | 'snowdrop'
  | 'lapis'
  | 'power_plant'
  | 'amber_canyon';

export interface IslandConfig {
  id: IslandId;
  name: string;               // Nombre display
  shortName: string;          // Para el payload de SleepAPI (e.g. 'greengrass')
  defaultFavoriteBerries: string[]; // Bayas fijas (vacío para Greengrass)
}

// Islas basadas en las áreas estándar de investigación de Pokémon Sleep (2026)
// NOTA: v1 NO soporta modos "Expert" (Greengrass Expert, Cyan Expert).
export const ISLANDS: IslandConfig[] = [
  { id: 'greengrass',   name: 'Greengrass Isle',        shortName: 'greengrass', defaultFavoriteBerries: [] }, // Aleatorias semanales
  { id: 'cyan',         name: 'Cyan Beach',             shortName: 'cyan',       defaultFavoriteBerries: ['ORAN', 'PECHA', 'PAMTRE'] },
  { id: 'taupe',        name: 'Taupe Hollow',           shortName: 'taupe',      defaultFavoriteBerries: ['LEPPA', 'FIGY', 'SITRUS'] },
  { id: 'snowdrop',     name: 'Snowdrop Tundra',        shortName: 'snowdrop',   defaultFavoriteBerries: ['RAWST', 'PERSIM', 'WIKI'] },
  { id: 'lapis',        name: 'Lapis Lakeside',         shortName: 'lapis',      defaultFavoriteBerries: ['CHERI', 'MAGO', 'DURIN'] },
  { id: 'power_plant',  name: 'Old Gold Power Plant',   shortName: 'gold',       defaultFavoriteBerries: ['GREPA', 'BLUK', 'BELUE'] },
  { id: 'amber_canyon', name: 'Amber Canyon',           shortName: 'amber',      defaultFavoriteBerries: ['CHESTO', 'LUM', 'YACHE'] },
];

export function getIsland(id: IslandId): IslandConfig {
  const island = ISLANDS.find(i => i.id === id);
  if (!island) throw new Error(`Isla desconocida: ${id}`);
  return island;
}
