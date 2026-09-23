import React, { useState } from 'react';
import type { OwnedPokemon } from '../../domain/models';
import { Badge } from './index';
import gamedata from '../../data/static/gamedata.json';
import { translateIngredient, getSpeciesMainSkillDisplayName, translateSpecialty, getNatureDisplayName } from '../../services/i18n-game';
import { useTranslation } from 'react-i18next';
import { Star, AlertCircle, Package } from 'lucide-react';
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
  const [imageError, setImageError] = useState(false);

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
    const s = spec?.toLowerCase();
    if (s === 'berry' || s === 'berries') return 'warning';
    if (s === 'ingredient' || s === 'ingredients') return 'success';
    return 'info';
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
          {imageError ? (
            <Package size={32} className="text-text-muted opacity-50" />
          ) : (
            <img 
              src={`/pokemon/${species.pokedexNumber}.png`} 
              alt={species.displayName || species.name}
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-text-main truncate">
              {pokemon.nickname || species.displayName || species.name}
            </h3>
            <span className="text-xs font-black text-text-muted">{t('app.level')} {pokemon.level}</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            <Badge variant={getSpecialtyColor(species.specialty)}>{translateSpecialty(t, species.specialty)}</Badge>
            {pokemon.natureId && <Badge>{getNatureDisplayName(t, pokemon.natureId)}</Badge>}
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
          <p className="text-xs font-bold text-text-muted uppercase mb-1">{t('pokemon_detail.skill')}</p>
          <p className="text-sm text-text-main truncate">{species ? getSpeciesMainSkillDisplayName(t, species) : '-'}</p>
        </div>
      </div>

      {/* Footer Alerts */}
      {!complete && (
        <div className="px-4 py-2 bg-error-bg border-t border-error-main/20 flex items-center gap-2 text-error-text text-xs font-bold">
          <AlertCircle size={14} />
          {t('collection.missing_data')}
        </div>
      )}
    </div>
  );
}
