import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import type { OwnedPokemon, StaticDataSchema } from '../../domain/models';
import _gamedata from '../../data/static/gamedata.json';
import { getNatureDisplayName } from '../../services/i18n-game';

const gamedata = _gamedata as unknown as StaticDataSchema;

const pokemonSchema = z.object({
  speciesId: z.string().min(1, "Especie es requerida"),
  nickname: z.string(),
  level: z.number().min(1).max(100),
  natureId: z.string().min(1, "Naturaleza es requerida"),
  shiny: z.boolean()
});

type PokemonFormData = z.infer<typeof pokemonSchema>;

export default function PokemonForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const { register, handleSubmit, formState: { errors } } = useForm<PokemonFormData>({
    resolver: zodResolver(pokemonSchema),
    defaultValues: {
      speciesId: '',
      nickname: '',
      level: 1,
      natureId: '',
      shiny: false
    }
  });

  const onSubmit = async (data: PokemonFormData) => {
    const now = new Date().getTime();
    const pokemon: OwnedPokemon = {
      id: id || crypto.randomUUID(),
      speciesId: data.speciesId,
      nickname: data.nickname,
      level: data.level,
      ribbonLevel: 0,
      natureId: data.natureId,
      subskills: { 10: null, 25: null, 50: null, 75: null, 100: null },
      ingredientChoices: {
        1: gamedata.species.find(s => s.name === data.speciesId)?.ingredient0?.[0]?.ingredient.name || null,
        30: null,
        60: null
      },
      skillLevel: 1,
      shiny: data.shiny,
      notes: '',
      sneakySnacking: true,
      helpingFrequencySeen: null,
      carryLimitSeen: null,
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      gameDataVersion: '1.0.0'
    };

    if (id) {
      await collectionRepository.update(pokemon);
    } else {
      await collectionRepository.add(pokemon);
    }
    navigate('/coleccion');
  };

  return (
    <div className="bg-bg-surface p-6 rounded-xl border border-slate-200 shadow-sm max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{id ? t('pokemon_form.title_edit') : t('pokemon_form.title_add')}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('pokemon_form.species')}</label>
          <select {...register('speciesId')} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500">
            <option value="">{t('pokemon_form.select_species')}</option>
            {gamedata.species.map(s => (
              <option key={s.name} value={s.name}>{s.displayName}</option>
            ))}
          </select>
          {errors.speciesId && <p className="text-red-500 text-sm mt-1">{errors.speciesId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('pokemon_form.nickname')}</label>
          <input {...register('nickname')} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('pokemon_form.level')}</label>
          <input type="number" {...register('level', { valueAsNumber: true })} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('pokemon_form.nature')}</label>
          <select {...register('natureId')} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500">
            <option value="">{t('pokemon_form.select_nature')}</option>
            {gamedata.natures.map(n => (
              <option key={n.name} value={n.name}>{getNatureDisplayName(t, n.name)}</option>
            ))}
          </select>
          {errors.natureId && <p className="text-red-500 text-sm mt-1">{errors.natureId.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" {...register('shiny')} id="shiny" className="rounded text-green-500 focus:ring-green-500" />
          <label htmlFor="shiny" className="text-sm font-medium text-slate-700">{t('pokemon_form.shiny')}</label>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">
            {t('pokemon_form.cancel')}
          </button>
          <button type="submit" className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg">
            {t('pokemon_form.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
