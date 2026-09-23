import React from 'react';
import type { OwnedPokemon } from '../../domain/models';
import { Badge } from './index';
import gamedata from '../../data/static/gamedata.json';
import { translateIngredient } from '../../services/i18n-game';
import { useTranslation } from 'react-i18next';
import { Star, AlertCircle } from 'lucide-react';
import { isComplete } from '../../utils/pokemonUtils';

interface PokemonCardProps {
  pokemon: OwnedPokemon;
  onClick?: (p: OwnedPokemon) => void;
  onToggleFavorite?: (e: React.MouseEvent, p: OwnedPokemon) => void;
}

export function PokemonCard({ pokemon, onClick, onToggleFavorite }: PokemonCardProps) {
  const { t } = useTranslation();
  const species = gamedata.species.find(s => s.name === pokemon.speciesId) || gamedata.species[0];
  const complete = isComplete(pokemon);

  // Derive ingredients
  const ing30 = (pokemon.ingredientChoices as any)?.[30];
  const ing60 = (pokemon.ingredientChoices as any)?.[60];
  const baseIng = species.ingredient0?.[0]?.ingredient.name;
  
  const ings = [
    baseIng,
    pokemon.level >= 30 ? ing30 : null,
    pokemon.level >= 60 ? ing60 : null
  ].filter(Boolean) as string[];

  const getSpecialtyColor = (spec: string): 'success' | 'warning' | 'info' => {
    if (spec === 'Berries') return 'success';
    if (spec === 'Ingredients') return 'warning';
    return 'info';
  };

  const getSpecialtyLabel = (spec: string) => {
    if (spec === 'Berries') return 'Bayas';
    if (spec === 'Ingredients') return 'Ing.';
    return 'Hab.';
  };

  return (
    <div 
      onClick={() => onClick?.(pokemon)}
      className="bg-bg-surface rounded-xl border border-border-main shadow-sm hover:border-primary-main/50 transition-colors relative cursor-pointer flex flex-col overflow-hidden group"
    >
      {/* Favorite Button */}
      {onToggleFavorite && (
        <button 
          onClick={(e) => onToggleFavorite(e, pokemon)} 
          className="absolute top-2 right-2 z-10 p-2 text-text-muted hover:text-warning-main transition-colors"
        >
          <Star size={20} className={pokemon.isFavorite ? 'fill-warning-main text-warning-main' : ''} />
        </button>
      )}

      {/* Header Info */}
      <div className="p-4 flex gap-4 items-center bg-bg-app border-b border-border-main group-hover:bg-primary-bg transition-colors">
        <div className="w-16 h-16 flex-shrink-0 bg-bg-surface rounded-full border-2 border-border-main p-1 overflow-hidden flex items-center justify-center">
          {/* Simple sprite fallback for now, assuming standard icon path */}
          <img 
            src={`/images/pokemon/${species.pokedexNumber}.png`} 
            alt={species.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/favicon.ico';
              (e.target as HTMLImageElement).className = "w-8 h-8 opacity-50 grayscale";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-text-main truncate">
              {pokemon.nickname || species.name}
            </h3>
            <span className="text-xs font-black text-text-muted">Nv. {pokemon.level}</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            <Badge variant={getSpecialtyColor(species.specialty)}>{getSpecialtyLabel(species.specialty)}</Badge>
            {pokemon.natureId && <Badge>{pokemon.natureId}</Badge>}
          </div>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Ingredients */}
        <div>
          <p className="text-xs font-bold text-text-muted uppercase mb-1">{t('collection.ingredients')}</p>
          <div className="flex gap-1">
            {ings.length > 0 ? ings.map((ing, i) => (
              <Badge key={i}>{translateIngredient(t, ing)}</Badge>
            )) : <span className="text-xs text-text-muted">-</span>}
          </div>
        </div>

        {/* Skill */}
        <div>
          <p className="text-xs font-bold text-text-muted uppercase mb-1">Habilidad</p>
          <p className="text-sm text-text-main truncate">{species.skill.name}</p>
        </div>
      </div>

      {/* Footer Alerts */}
      {!complete && (
        <div className="px-4 py-2 bg-error-bg border-t border-error-main/20 flex items-center gap-2 text-error-text text-xs font-bold">
          <AlertCircle size={14} />
          Datos incompletos
        </div>
      )}
    </div>
  );
}
