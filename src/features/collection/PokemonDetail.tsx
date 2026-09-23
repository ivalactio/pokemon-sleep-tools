import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { 
  ArrowLeft, Trash2, Calculator, AlertCircle, Sparkles, 
  Award, Shield, CheckCircle2, Package, Flame, Clock, 
  Compass, Zap, UtensilsCrossed, Save, Check
} from 'lucide-react';
import gamedata from '../../data/static/gamedata.json';
import { useTranslation } from 'react-i18next';
import { translateSubskill, getSpeciesMainSkillDisplayName, translateIngredient, translateBerry, getNatureDisplayName, translateSpecialty } from '../../services/i18n-game';
import { SleepApiEngine } from '../../services/sleepapi/sleepapi-engine';
import type { OwnedPokemon, ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../domain/models';
import { ISLANDS } from '../../domain/optimizer/islands';
import { Badge, ActionButton, Panel } from '../../components/ui';
import { validatePokemon } from '../../utils/pokemonValidator';

const engine = new SleepApiEngine(gamedata as unknown as StaticDataSchema);

export default function PokemonDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const pokemon = useLiveQuery(() => id ? collectionRepository.getById(id) : undefined, [id]);

  const [draft, setDraft] = useState<OwnedPokemon | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [config, setConfig] = useState<SimulationConfig>({
    camp: false,
    bedtime: '22:00',
    wakeup: '06:00',
    island: 'greengrass',
    areaBonus: 0
  });

  const [estimate, setEstimate] = useState<ProductionEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spriteError, setSpriteError] = useState(false);

  // Sync draft when pokemon is loaded or updated from Dexie
  useEffect(() => {
    if (pokemon) {
      if (!draft || draft.id !== pokemon.id || saveStatus === 'idle') {
        setDraft(JSON.parse(JSON.stringify(pokemon)));
      }
    }
  }, [pokemon]);

  // Compute dirty status
  const isDirty = useMemo(() => {
    if (!pokemon || !draft) return false;
    return JSON.stringify(pokemon) !== JSON.stringify(draft);
  }, [pokemon, draft]);

  if (!pokemon || !draft) return <div className="p-8 text-center text-text-muted">{t('app.loading')}</div>;

  const species = gamedata.species.find(s => s.name === draft.speciesId);

  // Calculate configuration completeness
  let filledPoints = 0;
  if (draft.natureId) filledPoints += 1;
  if (draft.ingredientChoices[1]) filledPoints += 1;
  if (draft.ingredientChoices[30]) filledPoints += 1;
  if (draft.ingredientChoices[60]) filledPoints += 1;
  const subskillLevels: (10 | 25 | 50 | 75 | 100)[] = [10, 25, 50, 75, 100];
  subskillLevels.forEach(lvl => {
    if (draft.subskills[lvl]) filledPoints += 1;
  });
  const completenessPercent = Math.round((filledPoints / 9) * 100);

  const handleDelete = async () => {
    if (window.confirm("¿Seguro que quieres eliminar este Pokémon?")) {
      await collectionRepository.delete(pokemon.id);
      navigate('/coleccion');
    }
  };

  const handleSave = async () => {
    if (!draft) return;

    // Run domain validation
    const validation = validatePokemon(draft, gamedata as unknown as StaticDataSchema);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      const errorList = Object.values(validation.errors).join('. ');
      setSaveErrorMessage(`Validación fallida: ${errorList}`);
      setSaveStatus('error');
      return;
    }

    setValidationErrors({});
    setSaveErrorMessage(null);
    setSaveStatus('saving');

    try {
      await collectionRepository.update({
        ...draft,
        updatedAt: Date.now()
      });
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveErrorMessage(err instanceof Error ? err.message : 'Error al guardar en la base de datos');
    }
  };

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await engine.estimateProduction(draft, config);
      setEstimate(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getSpecialtyBadge = () => {
    const specialty = species?.specialty;
    if (!specialty) return null;
    if (specialty === 'berry') {
      return <Badge variant="warning">🍓 {translateSpecialty(t, 'berry')}</Badge>;
    }
    if (specialty === 'ingredient') {
      return <Badge variant="success">🥗 {translateSpecialty(t, 'ingredient')}</Badge>;
    }
    if (specialty === 'skill') {
      return <Badge variant="primary">⚡ {translateSpecialty(t, 'skill')}</Badge>;
    }
    return <Badge variant="info">✨ {translateSpecialty(t, specialty)}</Badge>;
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Top Nav Action Bar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-text-main transition-colors"
        >
          <ArrowLeft size={18} /> {t('pokemon_detail.back_to_box', { defaultValue: 'Volver a la Caja' })}
        </button>

        <div className="flex items-center gap-3">
          <ActionButton 
            variant="primary" 
            onClick={handleSave}
            disabled={!isDirty || saveStatus === 'saving'}
            icon={saveStatus === 'saving' ? Clock : saveStatus === 'saved' ? Check : Save}
            className={
              saveStatus === 'saved'
                ? 'bg-success-main border-success-main text-white'
                : isDirty
                ? 'bg-primary-main text-white shadow-md hover:bg-primary-main/90'
                : 'opacity-50 cursor-not-allowed'
            }
          >
            {saveStatus === 'saving' 
              ? 'Guardando...' 
              : saveStatus === 'saved' 
              ? '¡Guardado!' 
              : isDirty 
              ? 'Guardar' 
              : 'Sin cambios'}
          </ActionButton>

          <ActionButton 
            variant="outline" 
            onClick={handleDelete}
            icon={Trash2}
            className="text-error-main hover:bg-error-bg hover:text-error-main border-error-main/20"
          >
            {t('app.delete', { defaultValue: 'Eliminar' })}
          </ActionButton>
        </div>
      </div>

      {/* Global Save / Validation Status Banners */}
      {saveErrorMessage && (
        <div className="bg-error-bg text-error-text p-4 rounded-xl border border-error-main/30 flex items-start gap-3 text-sm shadow-sm">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">No se pudieron guardar los cambios:</p>
            <p className="mt-0.5">{saveErrorMessage}</p>
          </div>
        </div>
      )}

      {saveStatus === 'saved' && (
        <div className="bg-success-bg text-success-main p-4 rounded-xl border border-success-main/30 flex items-center gap-3 text-sm shadow-sm">
          <CheckCircle2 size={20} className="shrink-0" />
          <span className="font-bold">¡Los cambios se han guardado correctamente!</span>
        </div>
      )}

      {/* Hero Profile Card */}
      <div className="bg-bg-surface border border-border-main rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Sprite Presentation Frame */}
          <div className="relative group shrink-0">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl bg-gradient-to-b from-bg-app to-bg-surface border border-border-main flex items-center justify-center p-3 shadow-inner">
              {species && !spriteError ? (
                <img 
                  src={`/pokemon/${species.pokedexNumber}.png`} 
                  alt={species.displayName}
                  className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform"
                  onError={() => setSpriteError(true)}
                />
              ) : (
                <Package size={52} className="text-text-muted opacity-40" />
              )}
            </div>
            {draft.shiny && (
              <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow border border-amber-300 flex items-center gap-1">
                <Sparkles size={10} /> SHINY
              </span>
            )}
          </div>

          {/* Core Info & Metadata */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <input 
                    type="text" 
                    value={draft.nickname || ''} 
                    placeholder={species?.displayName || draft.speciesId} 
                    onChange={e => setDraft({ ...draft, nickname: e.target.value })} 
                    className="text-2xl md:text-3xl font-black text-text-main bg-transparent border-b border-dashed border-border-main hover:border-primary-main focus:border-primary-main focus:outline-none transition-colors" 
                  />
                  <span className="text-xs text-text-muted font-bold">✎</span>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                  <select 
                    value={draft.speciesId} 
                    onChange={e => {
                      const newSpeciesId = e.target.value;
                      const newSpecies = gamedata.species.find(s => s.name === newSpeciesId);
                      const ing0 = newSpecies?.ingredient0?.[0]?.ingredient.name || null;
                      const ing30Opts = newSpecies?.ingredient30?.map(i => i.ingredient.name) || [];
                      const ing60Opts = newSpecies?.ingredient60?.map(i => i.ingredient.name) || [];

                      const newIng30 = ing30Opts.includes(draft.ingredientChoices[30] || '') ? draft.ingredientChoices[30] : null;
                      const newIng60 = ing60Opts.includes(draft.ingredientChoices[60] || '') ? draft.ingredientChoices[60] : null;

                      setSpriteError(false);
                      setDraft({
                        ...draft,
                        speciesId: newSpeciesId,
                        ingredientChoices: { 1: ing0, 30: newIng30, 60: newIng60 }
                      });
                    }} 
                    className={`text-sm font-semibold text-text-muted bg-bg-app border rounded-md px-2 py-1 focus:outline-none focus:border-primary-main ${validationErrors.speciesId ? 'border-error-main bg-error-bg/10' : 'border-border-main'}`}
                  >
                    {gamedata.species.map(s => (
                      <option className="bg-bg-surface text-text-main" key={s.name} value={s.name}>
                        #{s.pokedexNumber} {s.displayName}
                      </option>
                    ))}
                  </select>
                  {validationErrors.speciesId && (
                    <span className="text-xs text-error-main font-bold">{validationErrors.speciesId}</span>
                  )}
                </div>
              </div>

              {/* Completeness Pill */}
              <div className="bg-bg-app border border-border-main p-3 rounded-xl flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-text-muted uppercase">
                    {t('pokemon_detail.completeness', { defaultValue: 'Configuración' })}
                  </p>
                  <p className={`text-lg font-black ${completenessPercent === 100 ? 'text-success-main' : 'text-primary-main'}`}>
                    {completenessPercent}%
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-bg-surface border border-border-main flex items-center justify-center">
                  {completenessPercent === 100 ? (
                    <CheckCircle2 size={20} className="text-success-main" />
                  ) : (
                    <Flame size={20} className="text-primary-main" />
                  )}
                </div>
              </div>
            </div>

            {/* Badges / Chips Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              {getSpecialtyBadge()}

              {species?.berry && (
                <Badge variant="default">
                  🫐 {translateBerry(t, species.berry.name)}
                </Badge>
              )}

              {/* Level Control */}
              <div className={`inline-flex items-center gap-1.5 bg-bg-app border px-2.5 py-1 rounded-lg text-xs font-bold text-text-main ${validationErrors.level ? 'border-error-main bg-error-bg/10' : 'border-border-main'}`}>
                <span className="text-text-muted">{t('app.level', { defaultValue: 'Nv.' })}</span>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  value={draft.level} 
                  onChange={e => setDraft({ ...draft, level: parseInt(e.target.value) || 1 })} 
                  className="w-12 bg-transparent text-center font-extrabold focus:outline-none focus:ring-1 focus:ring-primary-main rounded" 
                />
              </div>

              {/* Shiny Toggle */}
              <button 
                onClick={() => setDraft({ ...draft, shiny: !draft.shiny })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                  draft.shiny 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                    : 'bg-bg-app text-text-muted border-border-main hover:text-text-main'
                }`}
              >
                <Sparkles size={12} /> Shiny
              </button>
            </div>
            {validationErrors.level && (
              <p className="text-xs text-error-main font-bold mt-1">{validationErrors.level}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Parameters, Skills, and Ingredients */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stats & Main Skill (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Skill Card */}
          <Panel className="space-y-4 border-l-4 border-l-primary-main">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary-bg/20 text-primary-main">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-text-main text-sm uppercase tracking-wide">
                    {t('pokemon_detail.main_skill')}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {t('pokemon_detail.main_skill_desc', { defaultValue: 'Habilidad principal de la especie' })}
                  </p>
                </div>
              </div>
              <Badge variant="primary">{t('app.level', { defaultValue: 'Nv.' })} {draft.skillLevel}</Badge>
            </div>

            <div className="bg-bg-app p-4 rounded-xl border border-border-main space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-text-muted uppercase">
                  {t('pokemon_detail.skill', { defaultValue: 'Habilidad' })}
                </span>
                <span className="font-bold text-sm text-text-main">
                  {getSpeciesMainSkillDisplayName(t, species)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border-main">
                <span className="text-xs font-bold text-text-muted uppercase">{t('pokemon_detail.skill_level')}</span>
                <select 
                  value={draft.skillLevel} 
                  onChange={e => setDraft({ ...draft, skillLevel: parseInt(e.target.value) || 1 })} 
                  className="px-3 py-1.5 border border-border-main rounded-lg text-sm bg-bg-surface text-text-main font-bold focus:border-primary-main focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(l => (
                    <option className="bg-bg-surface text-text-main" key={l} value={l}>
                      {t('app.level', { defaultValue: 'Nv.' })} {l}
                    </option>
                  ))}
                </select>
              </div>
              {validationErrors.skillLevel && (
                <p className="text-xs text-error-main font-bold mt-1">{validationErrors.skillLevel}</p>
              )}
            </div>
          </Panel>

          {/* Base Stats & Nature */}
          <Panel className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-bg-app text-text-muted">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-text-main text-sm uppercase tracking-wide">
                  {t('pokemon_detail.base_stats')}
                </h3>
                <p className="text-xs text-text-muted">
                  {t('pokemon_detail.base_stats_desc', { defaultValue: 'Rasgos individuales y naturaleza' })}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Nature Selector */}
              <div className="bg-bg-app p-3 rounded-xl border border-border-main flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-text-muted uppercase block">{t('pokemon_detail.nature')}</span>
                  <span className="text-xs text-text-muted">
                    {t('pokemon_detail.nature_desc', { defaultValue: 'Afecta bonos de producción' })}
                  </span>
                </div>
                <select 
                  value={draft.natureId} 
                  onChange={e => setDraft({ ...draft, natureId: e.target.value })} 
                  className={`p-2 border rounded-lg text-sm bg-bg-surface text-text-main font-semibold min-w-[140px] focus:border-primary-main focus:outline-none ${validationErrors.natureId ? 'border-error-main' : 'border-border-main'}`}
                >
                  <option className="bg-bg-surface text-text-main" value="">{t('pokemon_detail.none')}</option>
                  {gamedata.natures.map(n => (
                    <option className="bg-bg-surface text-text-main" key={n.name} value={n.name}>
                      {getNatureDisplayName(t, n.name)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ribbon Level */}
              <div className="bg-bg-app p-3 rounded-xl border border-border-main flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-text-muted uppercase block">{t('pokemon_detail.ribbon_level')}</span>
                    <span className="text-xs text-text-muted">
                      {t('pokemon_detail.ribbon_desc', { defaultValue: 'Horas de sueño compartidas' })}
                    </span>
                  </div>
                </div>
                <select 
                  value={draft.ribbonLevel || 0} 
                  onChange={e => setDraft({ ...draft, ribbonLevel: parseInt(e.target.value) as 0|1|2|3|4 })} 
                  className="p-2 border border-border-main rounded-lg text-sm bg-bg-surface text-text-main font-semibold focus:border-primary-main focus:outline-none"
                >
                  {[0, 1, 2, 3, 4].map(r => (
                    <option className="bg-bg-surface text-text-main" key={r} value={r}>
                      {t('pokemon_detail.level_short')} {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sneaky Snacking */}
              <div className="bg-bg-app p-3 rounded-xl border border-border-main flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text-muted uppercase block">{t('pokemon_detail.sneaky_snacking')}</span>
                  <span className="text-xs text-text-muted">
                    {t('pokemon_detail.sneaky_snacking_desc', { defaultValue: 'Continúa produciendo tras llenar inventario' })}
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={draft.sneakySnacking} 
                  onChange={e => setDraft({ ...draft, sneakySnacking: e.target.checked })} 
                  className="w-5 h-5 rounded border-border-main text-primary-main focus:ring-primary-main bg-bg-surface cursor-pointer" 
                />
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Column: Ingredients & Subskills (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Ingredients Slots Card */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-success-bg/20 text-success-main">
                  <UtensilsCrossed size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-text-main text-sm uppercase tracking-wide">
                    {t('pokemon_detail.ingredients')}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {t('pokemon_detail.ingredients_desc', { defaultValue: 'Desbloqueo de ingredientes por nivel' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 30, 60].map(lvl => {
                const options = species ? (lvl === 1 ? species.ingredient0 : lvl === 30 ? species.ingredient30 : species.ingredient60) : [];
                const isUnlocked = draft.level >= lvl;
                const chosen = draft.ingredientChoices[lvl as 1|30|60];
                const errKey = `ingredient_${lvl}`;
                const hasErr = Boolean(validationErrors[errKey]);

                return (
                  <div 
                    key={lvl} 
                    className={`p-4 rounded-xl border transition-all ${
                      hasErr
                        ? 'bg-error-bg/10 border-error-main'
                        : isUnlocked 
                        ? 'bg-bg-app border-border-main shadow-xs' 
                        : 'bg-bg-app/50 border-border-main/50 opacity-60'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-bg-surface border border-border-main text-text-main">
                        {t('app.level', { defaultValue: 'Nv.' })} {lvl}
                      </span>
                      {isUnlocked ? (
                        <span className="text-[10px] font-bold text-success-main">
                          {t('pokemon_detail.active', { defaultValue: 'Activo' })}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-text-muted">
                          {t('pokemon_detail.locked', { defaultValue: 'Bloqueado' })}
                        </span>
                      )}
                    </div>

                    <label className="block text-xs font-semibold text-text-muted mb-1">
                      {t('pokemon_detail.ingredient', { defaultValue: 'Ingrediente' })}
                    </label>
                    <select
                      value={chosen || ''}
                      onChange={e => setDraft({ 
                        ...draft, 
                        ingredientChoices: { ...draft.ingredientChoices, [lvl]: e.target.value || null } 
                      })}
                      className="w-full p-2 border border-border-main rounded-lg text-sm bg-bg-surface text-text-main font-medium focus:border-primary-main focus:outline-none"
                    >
                      <option className="bg-bg-surface text-text-main" value="">{t('pokemon_detail.select')}</option>
                      {options?.map(opt => (
                        <option className="bg-bg-surface text-text-main" key={opt.ingredient.name} value={opt.ingredient.name}>
                          {translateIngredient(t, opt.ingredient.name)} (x{opt.amount})
                        </option>
                      ))}
                    </select>
                    {hasErr && (
                      <p className="text-[10px] font-bold text-error-main mt-1.5">{validationErrors[errKey]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Subskills Slots Card */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-warning-bg/20 text-warning-main">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-text-main text-sm uppercase tracking-wide">
                    {t('pokemon_detail.subskills')}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {t('pokemon_detail.subskills_desc', { defaultValue: 'Habilidades secundarias (Slots 10 a 100)' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subskillLevels.map(lvl => {
                const isUnlocked = draft.level >= lvl;
                const chosen = draft.subskills[lvl];
                const errKey = `subskill_${lvl}`;
                const hasErr = Boolean(validationErrors[errKey]);

                return (
                  <div 
                    key={lvl} 
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      hasErr
                        ? 'bg-error-bg/10 border-error-main'
                        : isUnlocked 
                        ? 'bg-bg-app border-border-main shadow-xs' 
                        : 'bg-bg-app/50 border-border-main/50 opacity-60'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-bg-surface border border-border-main text-text-main">
                        {t('app.level', { defaultValue: 'Nv.' })} {lvl}
                      </span>
                      {isUnlocked ? (
                        <span className="text-[10px] font-bold text-success-main">
                          {t('pokemon_detail.active', { defaultValue: 'Activo' })}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-text-muted">
                          {t('pokemon_detail.locked', { defaultValue: 'Bloqueado' })}
                        </span>
                      )}
                    </div>

                    <select
                      value={chosen || ''}
                      onChange={e => setDraft({ 
                        ...draft, 
                        subskills: { ...draft.subskills, [lvl]: e.target.value || null } 
                      })}
                      className="w-full p-2 border border-border-main rounded-lg text-xs bg-bg-surface text-text-main font-semibold truncate focus:border-primary-main focus:outline-none"
                    >
                      <option className="bg-bg-surface text-text-main" value="">{t('pokemon_detail.empty')}</option>
                      {gamedata.subSkills
                        .filter(sk => {
                          const isSelectedElsewhere = Object.entries(draft.subskills).some(([otherLvl, subskillName]) =>
                            Number(otherLvl) !== lvl && subskillName === sk.name
                          );
                          return !isSelectedElsewhere;
                        })
                        .map(sk => (
                          <option className="bg-bg-surface text-text-main" key={sk.name} value={sk.name}>
                            {translateSubskill(t, sk.name)}
                          </option>
                      ))}
                    </select>
                    {hasErr && (
                      <p className="text-[10px] font-bold text-error-main mt-1.5">{validationErrors[errKey]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      {/* Production Simulator Panel */}
      <Panel className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-main pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-primary-main text-white shadow-sm">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-text-main text-base">
                {t('pokemon_detail.calc_production')}
              </h3>
              <p className="text-xs text-text-muted">{t('pokemon_detail.calc_production_desc')}</p>
            </div>
          </div>

          <ActionButton 
            variant="primary" 
            onClick={handleCalculate}
            disabled={loading}
            icon={loading ? Clock : Calculator}
            className="shadow-md"
          >
            {loading ? t('pokemon_detail.calculating') : t('pokemon_detail.calculate')}
          </ActionButton>
        </div>

        {/* Simulator Parameters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-bg-app p-3 rounded-xl border border-border-main">
            <label className="block text-[10px] font-bold text-text-muted uppercase mb-1 flex items-center gap-1">
              <Compass size={12} /> {t('pokemon_detail.island')}
            </label>
            <select 
              value={config.island} 
              onChange={e => setConfig({...config, island: e.target.value as any})} 
              className="w-full p-1.5 border border-border-main rounded-lg text-sm bg-bg-surface text-text-main font-semibold focus:outline-none"
            >
              {ISLANDS.map(island => (
                <option className="bg-bg-surface text-text-main" key={island.id} value={island.id}>{island.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-bg-app p-3 rounded-xl border border-border-main">
            <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">
              {t('pokemon_detail.area_bonus')} (%)
            </label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              value={config.areaBonus} 
              onChange={e => setConfig({...config, areaBonus: parseInt(e.target.value) || 0})} 
              className="w-full p-1.5 border border-border-main rounded-lg text-sm bg-bg-surface text-text-main font-bold focus:outline-none" 
            />
          </div>

          <div className="bg-bg-app p-3 rounded-xl border border-border-main">
            <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">
              {t('pokemon_detail.bedtime')}
            </label>
            <input 
              type="time" 
              value={config.bedtime} 
              onChange={e => setConfig({...config, bedtime: e.target.value})} 
              className="w-full p-1.5 border border-border-main rounded-lg text-sm bg-bg-surface text-text-main font-semibold focus:outline-none" 
            />
          </div>

          <div className="bg-bg-app p-3 rounded-xl border border-border-main">
            <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">
              {t('pokemon_detail.wakeup')}
            </label>
            <input 
              type="time" 
              value={config.wakeup} 
              onChange={e => setConfig({...config, wakeup: e.target.value})} 
              className="w-full p-1.5 border border-border-main rounded-lg text-sm bg-bg-surface text-text-main font-semibold focus:outline-none" 
            />
          </div>

          <div className="bg-bg-app p-3 rounded-xl border border-border-main flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-text-muted uppercase">{t('pokemon_detail.camp')}</span>
              <span className="text-xs text-text-muted">{t('pokemon_detail.camp_bonus')}</span>
            </div>
            <input 
              type="checkbox" 
              checked={config.camp} 
              onChange={e => setConfig({...config, camp: e.target.checked})} 
              className="w-5 h-5 rounded border-border-main text-primary-main focus:ring-primary-main bg-bg-surface cursor-pointer" 
            />
          </div>
        </div>

        {error && (
          <div className="bg-error-bg/20 text-error-text p-4 rounded-xl border border-error-main/30 flex items-center gap-3 text-sm">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}

        {/* Simulator Results Breakdown */}
        {estimate && (
          <div className="bg-bg-app p-5 rounded-xl border border-border-main space-y-4">
            <div className="flex justify-between items-center border-b border-border-main pb-2">
              <h4 className="font-extrabold text-sm text-text-main uppercase tracking-wide">
                {t('pokemon_detail.estimated_result')} ({estimate.period})
              </h4>
              <span className="text-xs text-text-muted">
                {t('pokemon_detail.calculated_at')} {new Date(estimate.calculatedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Berries Card */}
              <div className="bg-bg-surface p-4 rounded-xl border border-border-main shadow-xs space-y-2">
                <div className="flex items-center justify-between text-warning-main font-bold text-xs uppercase">
                  <span>🍓 {t('pokemon_detail.berries')}</span>
                  <span>{t('pokemon_detail.total_day')}</span>
                </div>
                {estimate.berries.map((b, i) => (
                  <div key={i} className="flex justify-between items-baseline pt-1">
                    <span className="text-sm font-semibold text-text-main">{translateBerry(t, b.name)}</span>
                    <span className="text-xl font-black text-warning-main">{b.amount.toFixed(1)}</span>
                  </div>
                ))}
              </div>

              {/* Ingredients Card */}
              <div className="bg-bg-surface p-4 rounded-xl border border-border-main shadow-xs space-y-2">
                <div className="flex items-center justify-between text-success-main font-bold text-xs uppercase">
                  <span>🥗 {t('pokemon_detail.ingredients')}</span>
                  <span>{t('pokemon_detail.total_day')}</span>
                </div>
                <div className="space-y-1">
                  {estimate.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-text-main">{translateIngredient(t, ing.name)}</span>
                      <span className="text-sm font-black text-success-main">{ing.amount.toFixed(1)}</span>
                    </div>
                  ))}
                  {estimate.ingredients.length === 0 && (
                    <span className="text-xs text-text-muted">{t('pokemon_detail.no_production')}</span>
                  )}
                </div>
              </div>

              {/* Main Skill Procs Card */}
              <div className="bg-bg-surface p-4 rounded-xl border border-border-main shadow-xs space-y-2">
                <div className="flex items-center justify-between text-primary-main font-bold text-xs uppercase">
                  <span>⚡ {t('pokemon_detail.skill')}</span>
                  <span>{t('pokemon_detail.frequency')}</span>
                </div>
                <div className="pt-2">
                  <div className="text-2xl font-black text-primary-main">
                    {estimate.skillProcs.toFixed(2)}
                  </div>
                  <span className="text-xs text-text-muted">{t('pokemon_detail.procs')} {t('pokemon_detail.expected_per_day')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
