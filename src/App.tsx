import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { arenas, arenaById } from './data/arenas';
import { characterById, characters } from './data/characters';
import { storeEvents } from './data/events';
import { audioEngine, type MusicTrack } from './game/audio/AudioEngine';
import { simulateBattle } from './game/combat/engine';
import { getTeamBonuses } from './game/combat/synergies';
import { createTournament, validateTeam } from './game/tournament/tournament';
import { seedFromTime } from './utils/rng';
import { clearSave, loadSave, persistSave, recordBattle } from './utils/storage';
import type { Arena, BattleAction, BattleResult, Character, Department, GameSettings, SaveData, Team, TournamentState } from './types/game';
import { BrandHeader } from './components/BrandHeader';
import { PixelPortrait } from './components/PixelPortrait';

const BattleCanvas = lazy(() => import('./components/BattleCanvas').then((module) => ({ default: module.BattleCanvas })));

type Screen = 'loading' | 'menu' | 'team' | 'bracket' | 'arena-select' | 'battle' | 'result' | 'champion' | 'characters' | 'arenas' | 'events' | 'history' | 'settings' | 'how';
type MatchStage = 'semi' | 'final';
const departments: Array<Department | 'Tümü' | 'Yöneticiler'> = ['Tümü', 'Takım Sporları', 'Quechua', 'Su / Kış', 'Danışma', 'Yöneticiler'];

const titleCase = (name: string) => name.charAt(0) + name.slice(1).toLocaleLowerCase('tr-TR');
const teamPower = (team: Team) => team.characterIds.reduce((total, id) => total + characterById[id]!.power, 0);

export function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [tournament, setTournament] = useState<TournamentState>();
  const [stage, setStage] = useState<MatchStage>('semi');
  const [activeBattle, setActiveBattle] = useState<BattleResult>();
  const [recordedBattleKey, setRecordedBattleKey] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setScreen('menu'), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    audioEngine.configure(save.settings);
    if (screen === 'loading') return;
    const map: Partial<Record<Screen, MusicTrack>> = { menu: 'menu', team: 'select', characters: 'select', arenas: 'select', events: 'select', bracket: 'select', 'arena-select': 'select', battle: stage === 'final' ? 'final' : 'battle', result: activeBattle?.winnerId === 'player' ? 'victory' : 'defeat', champion: 'victory' };
    if (map[screen]) audioEngine.playMusic(map[screen]!);
    return () => { if (screen === 'battle') audioEngine.stopMusic(); };
  }, [screen, stage, activeBattle?.winnerId, save.settings]);

  useEffect(() => {
    const syncSettings = (event: Event) => setSave((current) => ({ ...current, settings: (event as CustomEvent<GameSettings>).detail }));
    window.addEventListener('atlantis-settings', syncSettings);
    return () => window.removeEventListener('atlantis-settings', syncSettings);
  }, []);

  useEffect(() => {
    if (screen === 'loading') return;
    history.pushState({ atlantisScreen: screen }, '', location.href);
    const handleBack = () => setScreen('menu');
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [screen]);

  const go = (next: Screen) => { audioEngine.sfx('click'); setScreen(next); window.scrollTo({ top: 0 }); };
  const updateSettings = (next: GameSettings) => {
    const updated = { ...save, settings: next };
    setSave(updated); persistSave(updated); audioEngine.configure(next);
  };

  const startTournament = (ids: string[], name: string) => {
    const next = createTournament(ids, seedFromTime(), name);
    setTournament(next); setStage('semi'); setActiveBattle(undefined); setRecordedBattleKey(''); go('bracket');
  };

  const chooseArena = (arena: Arena) => {
    if (!tournament) return;
    audioEngine.sfx('select');
    if (stage === 'semi') {
      const playerBattle = simulateBattle(tournament.teams[0]!, tournament.teams[1]!, arena, tournament.seed + 101);
      const aiBattle = simulateBattle(tournament.teams[2]!, tournament.teams[3]!, arenaById['atlantis-magaza']!, tournament.seed + 202);
      const next = { ...tournament, semiPlayer: playerBattle, semiAi: aiBattle };
      setTournament(next); setActiveBattle(playerBattle);
    } else {
      const firstWinner = tournament.semiPlayer!.winnerId === tournament.semiPlayer!.leftTeam.id ? tournament.semiPlayer!.leftTeam : tournament.semiPlayer!.rightTeam;
      const secondWinner = tournament.semiAi!.winnerId === tournament.semiAi!.leftTeam.id ? tournament.semiAi!.leftTeam : tournament.semiAi!.rightTeam;
      const final = simulateBattle(firstWinner, secondWinner, arena, tournament.seed + 303);
      setTournament({ ...tournament, final }); setActiveBattle(final);
    }
    setRecordedBattleKey(''); go('battle');
  };

  const finishWatching = () => {
    if (!activeBattle || !tournament) return;
    const key = `${activeBattle.seed}-${activeBattle.winnerId}`;
    if (recordedBattleKey !== key) {
      const next = recordBattle(save, activeBattle, 'player');
      setSave(next); setRecordedBattleKey(key);
    }
    setScreen('result');
  };

  const continueTournament = () => {
    if (!tournament || !activeBattle) return;
    if (stage === 'semi' && activeBattle.winnerId === 'player') { setStage('final'); go('arena-select'); return; }
    if (stage === 'semi') {
      const firstWinner = activeBattle.winnerId === activeBattle.leftTeam.id ? activeBattle.leftTeam : activeBattle.rightTeam;
      const secondWinner = tournament.semiAi!.winnerId === tournament.semiAi!.leftTeam.id ? tournament.semiAi!.leftTeam : tournament.semiAi!.rightTeam;
      const final = simulateBattle(firstWinner, secondWinner, arenaById['atlantis-magaza']!, tournament.seed + 303);
      setTournament({ ...tournament, final, championId: final.winnerId }); setActiveBattle(final); setStage('final'); setRecordedBattleKey(''); go('battle'); return;
    }
    const wonTournament = activeBattle.winnerId === 'player';
    const nextSave = { ...save, tournaments: save.tournaments + (wonTournament ? 1 : 0) };
    if (wonTournament) persistSave(nextSave);
    setSave(nextSave); setTournament({ ...tournament, championId: activeBattle.winnerId }); go('champion');
  };

  const newGame = () => { setTournament(undefined); setActiveBattle(undefined); setStage('semi'); go('team'); };

  if (screen === 'loading') return <LoadingScreen />;
  if (screen === 'menu') return <MenuScreen save={save} onGo={go} onStart={newGame} />;
  if (screen === 'team') return <TeamBuilder onBack={() => go('menu')} onComplete={startTournament} />;
  if (screen === 'bracket' && tournament) return <BracketScreen tournament={tournament} onBack={() => go('team')} onContinue={() => go('arena-select')} />;
  if (screen === 'arena-select') return <ArenaSelect save={save} stage={stage} onBack={() => go(stage === 'semi' ? 'bracket' : 'result')} onChoose={chooseArena} />;
  if (screen === 'battle' && activeBattle) return <BattleScreen key={activeBattle.seed} result={activeBattle} settings={save.settings} onSettings={updateSettings} onDone={finishWatching} onExit={() => go('menu')} />;
  if (screen === 'result' && activeBattle) return <ResultScreen result={activeBattle} stage={stage} onContinue={continueTournament} onReplay={() => go('battle')} onNew={newGame} onHome={() => go('menu')} />;
  if (screen === 'champion' && activeBattle) return <ChampionScreen result={activeBattle} onNew={newGame} onHome={() => go('menu')} />;
  if (screen === 'characters') return <CharacterGuide onBack={() => go('menu')} />;
  if (screen === 'arenas') return <ArenaGuide save={save} onBack={() => go('menu')} />;
  if (screen === 'events') return <EventGuide onBack={() => go('menu')} />;
  if (screen === 'history') return <HistoryScreen save={save} onBack={() => go('menu')} onReset={() => { const empty = clearSave(); setSave(empty); }} />;
  if (screen === 'settings') return <SettingsScreen settings={save.settings} onChange={updateSettings} onBack={() => go('menu')} />;
  return <HowToPlay onBack={() => go('menu')} />;
}

function LoadingScreen() {
  return <main className="loading-screen"><div className="loading-logo"><span>A</span><h1>ATLANTIS ARENA</h1><p>ARENA HAZIRLANIYOR</p><div className="loading-bar"><i /></div></div></main>;
}

function MenuScreen({ save, onGo, onStart }: { save: SaveData; onGo: (screen: Screen) => void; onStart: () => void }) {
  const buttons: Array<[string, Screen | 'start', string]> = [
    ['OYUNA BAŞLA', 'start', 'Takımını kur ve turnuvaya katıl'], ['KARAKTERLER', 'characters', '21 savaşçıyı incele'], ['ARENALAR', 'arenas', '25 mücadele alanını keşfet'],
    ['MAĞAZA OLAYLARI', 'events', '37 sürprizi görüntüle'], ['SAVAŞ GEÇMİŞİ', 'history', `${save.battles} karşılaşma kaydı`], ['AYARLAR', 'settings', 'Ses, hız ve erişilebilirlik'], ['NASIL OYNANIR?', 'how', 'Kurallar ve taktikler'],
  ];
  return <main className="menu-screen">
    <BrandHeader />
    <div className="menu-backdrop" />
    <section className="menu-hero">
      <div className="eyebrow">DECATHLON ATLANTIS'TEN ESİNLENEN</div>
      <h1>ATLANTIS<br /><span>ARENA</span></h1>
      <p>Departmanlar Arenada Buluşuyor!</p>
      <div className="menu-stats"><span><b>{save.wins}</b> GALİBİYET</span><span><b>{save.tournaments}</b> ŞAMPİYONLUK</span><span><b>21</b> SAVAŞÇI</span></div>
    </section>
    <nav className="menu-grid">
      {buttons.map(([label, destination, hint], index) => <button key={label} className={index === 0 ? 'menu-tile menu-tile--primary' : 'menu-tile'} onClick={() => destination === 'start' ? onStart() : onGo(destination)}><span className="menu-tile__number">{String(index + 1).padStart(2, '0')}</span><b>{label}</b><small>{hint}</small></button>)}
    </nav>
    <div className="menu-marquee"><div>HER TUR YENİ BİR MAĞAZA OLAYI • 5v5 OTOMATİK SAVAŞ • 25 BENZERSİZ ARENA • 37 MAĞAZA ANONSU •</div></div>
  </main>;
}

function TeamBuilder({ onBack, onComplete }: { onBack: () => void; onComplete: (ids: string[], name: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<(typeof departments)[number]>('Tümü');
  const [detail, setDetail] = useState<Character>(characters[0]!);
  const [teamName, setTeamName] = useState('');
  const validation = validateTeam(selected);
  const filtered = characters.filter((character) => filter === 'Tümü' || filter === 'Yöneticiler' ? filter === 'Tümü' || character.manager : character.department === filter);
  const toggle = (character: Character) => {
    setDetail(character); audioEngine.sfx('select');
    setSelected((current) => current.includes(character.id) ? current.filter((id) => id !== character.id) : current.length < 5 ? [...current, character.id] : current);
  };
  const previewTeam: Team = { id: 'preview', name: teamName, characterIds: selected };
  const bonuses = selected.length ? getTeamBonuses(previewTeam) : undefined;
  return <main className="screen-shell team-screen">
    <BrandHeader compact onHome={onBack} subtitle="TAKIM KURULUMU • 1 YÖNETİCİ + 4 DANIŞMAN" />
    <section className="selection-rail">
      <button className="back-button" onClick={onBack}>GERİ</button>
      <div className="team-slots">{Array.from({ length: 5 }, (_, index) => { const id = selected[index]; return <div className={`team-slot ${id ? 'is-filled' : ''}`} key={index}>{id ? <><PixelPortrait character={characterById[id]!} size="tiny" /><span>{characterById[id]!.name}</span><button onClick={() => setSelected((items) => items.filter((value) => value !== id))}>×</button></> : <span>{index === 0 ? 'SEÇ' : '+'}</span>}</div>; })}</div>
      <div className="team-summary"><b>{selected.reduce((sum, id) => sum + characterById[id]!.power, 0)}</b><small>TAKIM GÜCÜ</small></div>
      <input className="team-name-input" value={teamName} onChange={(event) => setTeamName(event.target.value.slice(0, 22))} placeholder="Takım adı (isteğe bağlı)" />
      <button className="primary-button" disabled={!validation.valid} onClick={() => onComplete(selected, teamName)}>TURNUVAYA KATIL</button>
    </section>
    <div className="filter-tabs">{departments.map((item) => <button className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
    <div className="team-content">
      <section className="character-grid">{filtered.map((character) => <CharacterCard key={character.id} character={character} selected={selected.includes(character.id)} onClick={() => toggle(character)} />)}</section>
      <CharacterDetail character={detail} bonuses={bonuses?.labels ?? []} />
    </div>
    <footer className={`selection-footer ${validation.valid ? 'is-valid' : ''}`}><span>{validation.valid ? 'TAKIM HAZIR!' : validation.reason}</span><span>{bonuses?.labels.join(' • ') || 'Karakter seçtikçe sinerjiler burada görünecek.'}</span></footer>
  </main>;
}

function CharacterCard({ character, selected, onClick }: { character: Character; selected?: boolean; onClick: () => void }) {
  return <button className={`character-card ${selected ? 'is-selected' : ''}`} style={{ '--accent': character.accent } as React.CSSProperties} onClick={onClick}>
    <PixelPortrait character={character} />
    <div className="character-card__top"><span>{character.manager ? 'LİDER' : character.rarity.toLocaleUpperCase('tr-TR')}</span><b>{character.power}</b></div>
    <h3>{character.name}</h3><p>{character.department}</p><small>{character.position}</small>
    <div className="mini-stats"><i style={{ width: `${character.stats.hp / 2}%` }} /><i style={{ width: `${character.stats.attack * 1.7}%` }} /><i style={{ width: `${character.stats.speed}%` }} /></div>
    <div className="character-card__ability">{character.special}</div>
    {selected && <span className="selected-stamp">SEÇİLDİ</span>}
  </button>;
}

function CharacterDetail({ character, bonuses = [] }: { character: Character; bonuses?: string[] }) {
  return <aside className="character-detail" style={{ '--accent': character.accent } as React.CSSProperties}>
    <div className="detail-hero"><PixelPortrait character={character} size="large" /><div><span className="department-tag">{character.department}</span><h2>{character.name}</h2><p>{character.position} • {character.experience}</p></div></div>
    <div className="stat-table"><Stat label="HP" value={character.stats.hp} max={200} /><Stat label="SALDIRI" value={character.stats.attack} max={60} /><Stat label="SAVUNMA" value={character.stats.defense} max={50} /><Stat label="HIZ" value={character.stats.speed} max={100} /></div>
    <section><small>ÖZEL GÜÇ</small><h3>{character.special}</h3><p>{character.specialDescription}</p></section>
    <section><small>ULTIMATE</small><h3>{character.ultimate}</h3><p>{character.ultimateDescription}</p></section>
    {character.passive && <section><small>PASİF</small><h3>{character.passive}</h3></section>}
    <blockquote>“{character.quotes[0]}”</blockquote>
    {bonuses.length > 0 && <div className="synergy-list">{bonuses.map((bonus) => <span key={bonus}>{bonus}</span>)}</div>}
  </aside>;
}

function Stat({ label, value, max }: { label: string; value: number; max: number }) { return <div><span>{label}</span><b>{Math.round(value)}</b><i><em style={{ width: `${Math.min(100, value / max * 100)}%` }} /></i></div>; }

function BracketScreen({ tournament, onBack, onContinue }: { tournament: TournamentState; onBack: () => void; onContinue: () => void }) {
  return <main className="screen-shell bracket-screen"><BrandHeader compact onHome={onBack} subtitle={`TURNUVA SEED • ${tournament.seed}`} />
    <div className="page-heading"><span>4 TAKIM • 20 SAVAŞÇI • TEK ŞAMPİYON</span><h1>TURNUVA EŞLEŞMELERİ</h1><p>Takımlar seed’li olarak oluşturuldu. Hiçbir karakter birden fazla takımda bulunmuyor.</p></div>
    <div className="bracket">
      <div className="bracket-round"><h3>YARI FİNAL</h3><TeamMatch teamA={tournament.teams[0]!} teamB={tournament.teams[1]!} /><TeamMatch teamA={tournament.teams[2]!} teamB={tournament.teams[3]!} /></div>
      <div className="bracket-lines"><i /><i /></div>
      <div className="bracket-round bracket-round--final"><h3>FİNAL</h3><div className="final-placeholder"><span>?</span><b>FİNALİSTLER</b><small>Yarı final galipleri burada buluşacak</small></div></div>
    </div>
    <div className="reserve-card"><span>YEDEK</span><PixelPortrait character={characterById[tournament.reserveId]!} size="small" /><b>{characterById[tournament.reserveId]!.name}</b><small>Bu turnuvada savaşa girmez.</small></div>
    <div className="bottom-actions"><button className="secondary-button" onClick={onBack}>TAKIMI DEĞİŞTİR</button><button className="primary-button primary-button--large" onClick={onContinue}>ARENA SEÇ</button></div>
  </main>;
}

function TeamMatch({ teamA, teamB }: { teamA: Team; teamB: Team }) {
  const row = (team: Team) => <div className={team.isPlayer ? 'match-team is-player' : 'match-team'}><PixelPortrait character={characterById[team.characterIds[0]!]!} size="small" /><div><span>{team.isPlayer ? 'SENİN TAKIMIN' : 'RAKİP'}</span><b>{team.name}</b><small>GÜÇ {teamPower(team)}</small></div><div className="match-members">{team.characterIds.slice(1).map((id) => <PixelPortrait key={id} character={characterById[id]!} size="tiny" />)}</div></div>;
  return <div className="team-match">{row(teamA)}<strong>VS</strong>{row(teamB)}</div>;
}

function ArenaSelect({ save, stage, onBack, onChoose }: { save: SaveData; stage: MatchStage; onBack: () => void; onChoose: (arena: Arena) => void }) {
  const available = arenas.filter((arena) => !arena.special || arena.id === 'atlantis-magaza' || save.unlockedArenas.includes(arena.id));
  const [selected, setSelected] = useState<Arena>(available[0]!);
  return <main className="screen-shell arena-select-screen"><BrandHeader compact onHome={onBack} subtitle={stage === 'final' ? 'BÜYÜK FİNAL • ARENA SEÇİMİ' : 'YARI FİNAL • ARENA SEÇİMİ'} />
    <div className="arena-preview" style={{ backgroundImage: `url(./assets/arenas/${selected.id}.png)` }}><div className="arena-preview__shade" /><div className="arena-preview__copy"><span>{selected.department}</span><h1>{selected.name}</h1><p>{selected.description}</p><b>{selected.bonusLabel}</b></div><button className="primary-button primary-button--large" onClick={() => onChoose(selected)}>SAVAŞI BAŞLAT</button></div>
    <div className="arena-carousel"><button className="arena-card arena-card--random" onClick={() => setSelected(available[Math.floor(Math.random() * available.length)]!)}><b>?</b><span>RASTGELE ARENA</span></button>{available.map((arena) => <button key={arena.id} className={`arena-card ${selected.id === arena.id ? 'is-selected' : ''}`} onClick={() => { setSelected(arena); audioEngine.sfx('select'); }}><img src={`./assets/arenas/${arena.id}.png`} alt="" /><span>{arena.name}</span><small>{arena.bonusLabel}</small></button>)}</div>
  </main>;
}

type BattlePhase = 'intro' | 'wheel' | 'event' | 'actions' | 'transition' | 'finished';

function BattleScreen({ result, settings, onSettings, onDone, onExit }: { result: BattleResult; settings: GameSettings; onSettings: (settings: GameSettings) => void; onDone: () => void; onExit: () => void }) {
  const [turnIndex, setTurnIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [phase, setPhase] = useState<BattlePhase>('intro');
  const [introLabel, setIntroLabel] = useState('VS');
  const doneRef = useRef(false);
  const turn = result.turns[Math.min(turnIndex, result.turns.length - 1)]!;
  const beforeLeft = turnIndex === 0 ? result.initialLeft : result.turns[turnIndex - 1]!.left;
  const beforeRight = turnIndex === 0 ? result.initialRight : result.turns[turnIndex - 1]!.right;
  const showAfter = phase === 'actions' || phase === 'transition' || phase === 'finished';
  const leftFighters = showAfter ? turn.left : beforeLeft;
  const rightFighters = showAfter ? turn.right : beforeRight;
  const fighters = [...leftFighters, ...rightFighters];
  const aliveCount = fighters.filter((fighter) => fighter.alive).length;
  const isPaused = paused || confirmExit;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmExit) setConfirmExit(false); else setPaused((value) => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmExit]);

  useEffect(() => {
    if (phase !== 'intro' || isPaused) return;
    const order = ['VS', '3', '2', '1', 'FIGHT!'];
    const index = order.indexOf(introLabel);
    const timer = window.setTimeout(() => {
      if (index < order.length - 1) setIntroLabel(order[index + 1]!);
      else setPhase('wheel');
    }, introLabel === 'VS' ? 1400 : introLabel === 'FIGHT!' ? 850 : 720);
    return () => window.clearTimeout(timer);
  }, [phase, introLabel, isPaused]);

  useEffect(() => {
    if (isPaused || phase === 'intro' || phase === 'finished') return;
    const timing: Record<Exclude<BattlePhase, 'intro' | 'finished'>, number> = {
      wheel: Math.max(950, 2000 / settings.speed),
      event: Math.max(1800, 3000 / settings.speed),
      actions: Math.max(1800, 6000 / settings.speed),
      transition: Math.max(350, 650 / settings.speed),
    };
    const timer = window.setTimeout(() => {
      if (phase === 'wheel') setPhase('event');
      else if (phase === 'event') setPhase('actions');
      else if (phase === 'actions') setPhase('transition');
      else if (turnIndex < result.turns.length - 1) { setTurnIndex((index) => index + 1); setPhase('wheel'); }
      else setPhase('finished');
    }, timing[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, isPaused, settings.speed, turnIndex, result.turns.length]);

  useEffect(() => {
    if (phase === 'wheel') { audioEngine.sfx('announcement'); audioEngine.sfx('wheelSpin'); }
    if (phase === 'event') audioEngine.sfx('wheelStop');
    if (aliveCount <= 2 && phase !== 'finished') audioEngine.playMusic('duel');
  }, [phase, aliveCount]);

  useEffect(() => {
    if (phase !== 'finished' || doneRef.current) return;
    doneRef.current = true;
    audioEngine.sfx(result.winnerId === 'player' ? 'victory' : 'defeat');
    const timer = window.setTimeout(onDone, 1700);
    return () => window.clearTimeout(timer);
  }, [phase, onDone, result.winnerId]);

  const actionSound = (action: BattleAction) => {
    if (action.kind === 'ultimate') audioEngine.sfx('ultimate');
    else if (action.critical) audioEngine.sfx('critical');
    else if (action.actorId === 'can') audioEngine.sfx('boxing');
    else if (action.actorId === 'yagmur') audioEngine.sfx('football');
    else if (['ikra', 'sinejan'].includes(action.actorId)) audioEngine.sfx('ice');
    else if (action.actorId === 'arda') audioEngine.sfx('water');
    else audioEngine.sfx('attack');
  };
  const leftHp = leftFighters.reduce((sum, fighter) => sum + fighter.currentHp, 0), leftMax = leftFighters.reduce((sum, fighter) => sum + fighter.maxHp, 0);
  const rightHp = rightFighters.reduce((sum, fighter) => sum + fighter.currentHp, 0), rightMax = rightFighters.reduce((sum, fighter) => sum + fighter.maxHp, 0);
  const logs = result.turns.slice(0, phase === 'wheel' || phase === 'event' ? turnIndex : turnIndex + 1).flatMap((item) => item.logs).slice(-18).reverse();
  return <main className={`battle-screen battle-phase-${phase} ${settings.reducedMotion ? 'reduce-motion' : ''}`}>
    <BrandHeader compact onHome={() => { setPaused(true); setConfirmExit(true); }} subtitle={`${result.arena.name} • ${result.arena.bonusLabel}`} />
    <section className="battle-hud">
      <TeamHud team={result.leftTeam} hp={leftHp} max={leftMax} align="left" leaderId={result.leftTeam.characterIds[0]!} />
      <div className="round-counter"><small>TUR</small><b>{turn.number}</b><span>/ {result.turns.length}</span></div>
      <TeamHud team={result.rightTeam} hp={rightHp} max={rightMax} align="right" leaderId={result.rightTeam.characterIds[0]!} />
    </section>
    <section className="battle-stage">
      <Suspense fallback={<div className="battle-canvas battle-canvas--loading">ARENA YÜKLENİYOR…</div>}><BattleCanvas result={result} turnIndex={turnIndex} speed={settings.speed} active={phase === 'actions'} reducedMotion={settings.reducedMotion} lowGraphics={settings.lowGraphics} onAction={actionSound} /></Suspense>
      {phase === 'intro' && <div className="battle-intro"><div className="versus-teams"><article><PixelPortrait character={characterById[result.leftTeam.characterIds[0]!]!} size="large" /><b>{result.leftTeam.name}</b><span>%{result.estimatedWinChance[0]}</span></article><strong>{introLabel}</strong><article><PixelPortrait character={characterById[result.rightTeam.characterIds[0]!]!} size="large" /><b>{result.rightTeam.name}</b><span>%{result.estimatedWinChance[1]}</span></article></div><p>{result.arena.name} • {result.arena.bonusLabel}</p></div>}
      {phase === 'wheel' && <EventWheel result={result} turnIndex={turnIndex} />}
      {phase === 'event' && <div className="event-card"><span>MAĞAZA ANONSU</span><img src={`./assets/events/${storeEvents.indexOf(turn.event) + 1}.png`} alt="" /><h2>{turn.event.name}</h2><p>{turn.event.description}</p><div><b>ETKİLENENLER</b><em>{turn.event.specialCharacter ? characterById[turn.event.specialCharacter]?.name : 'Tüm uygun karakterler'}</em><b>SÜRE</b><em>1 tur</em></div></div>}
      {aliveCount <= 2 && phase === 'actions' && <div className="final-duel">FINAL DUEL!</div>}
      <FighterBars fighters={leftFighters} side="left" /><FighterBars fighters={rightFighters} side="right" />
      {isPaused && !confirmExit && <div className="pause-overlay"><b>DURAKLATILDI</b><button onClick={() => setPaused(false)}>DEVAM ET</button></div>}
      {phase === 'finished' && <div className={`battle-finish ${result.winnerId === 'player' ? 'is-win' : ''}`}>{result.winnerId === 'player' ? 'VICTORY!' : 'YENİLGİ!'}</div>}
    </section>
    <section className="battle-console">
      <div className="combat-log"><header><span>CANLI SAVAŞ GÜNLÜĞÜ</span><i>SEED {result.seed}</i></header><div>{logs.length ? logs.map((log, index) => <p className={`log-${log.type}`} key={`${turnIndex}-${index}`}>{log.text}</p>) : <p className="log-system">Savaş başlamak üzere…</p>}</div></div>
      <div className="spectator-controls"><span>SEYİRCİ KONTROLLERİ</span><button onClick={() => setPaused((value) => !value)}>{paused ? 'DEVAM' : 'DURAKLAT'}</button><div>{([0.5, 1, 2, 4] as const).map((speed) => <button className={settings.speed === speed ? 'is-active' : ''} onClick={() => onSettings({ ...settings, speed })} key={speed}>{speed}x</button>)}</div><button onClick={() => onSettings({ ...settings, muted: !settings.muted })}>{settings.muted ? 'SESİ AÇ' : 'SESSİZ'}</button><button onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}>TAM EKRAN</button><button onClick={() => { setPaused(true); setConfirmExit(true); }}>ÇIKIŞ</button></div>
    </section>
    {confirmExit && <div className="confirm-modal" role="dialog" aria-modal="true"><div><span>AKTİF SAVAŞ</span><h2>Savaştan çıkmak istiyor musun?</h2><p>İzleme ilerlemesi kaybolacak; matematiksel sonuç değişmeyecek.</p><button className="secondary-button" onClick={() => { setConfirmExit(false); setPaused(false); }}>SAVAŞA DÖN</button><button className="primary-button" onClick={onExit}>ANA MENÜYE ÇIK</button></div></div>}
  </main>;
}

function EventWheel({ result, turnIndex }: { result: BattleResult; turnIndex: number }) {
  const selected = result.turns[turnIndex]!.event;
  const start = Math.max(0, storeEvents.indexOf(selected) - 3);
  const options = [...storeEvents.slice(start, start + 7)];
  if (!options.includes(selected)) options[3] = selected;
  return <div className="wheel-overlay"><div className="wheel-pointer" /><div className="event-wheel">{options.map((event, index) => <div key={`${event.id}-${index}`} className={event.id === selected.id ? 'is-selected' : ''} style={{ '--slot': index } as React.CSSProperties}><img src={`./assets/events/${storeEvents.indexOf(event) + 1}.png`} alt="" /><span>{event.name}</span></div>)}<strong>?</strong></div><h2>MAĞAZA OLAYI SEÇİLİYOR</h2></div>;
}

function TeamHud({ team, hp, max, align, leaderId }: { team: Team; hp: number; max: number; align: 'left' | 'right'; leaderId: string }) { return <div className={`team-hud team-hud--${align}`}><PixelPortrait character={characterById[leaderId]!} size="small" /><div><span>{team.name}</span><div className="team-hp"><i style={{ width: `${hp / max * 100}%` }} /></div><small>{hp} / {max} TOPLAM HP</small></div></div>; }

function FighterBars({ fighters, side }: { fighters: BattleResult['finalLeft']; side: 'left' | 'right' }) { return <div className={`fighter-bars fighter-bars--${side}`}>{fighters.map((fighter) => <div key={fighter.id} className={!fighter.alive ? 'is-dead' : ''}><span>{fighter.name}</span><i className="hp"><em style={{ width: `${fighter.currentHp / fighter.maxHp * 100}%` }} /></i><i className="energy"><em style={{ width: `${fighter.energy}%` }} /></i>{fighter.shield > 0 && <b>◆ {fighter.shield}</b>}</div>)}</div>; }

function ResultScreen({ result, stage, onContinue, onReplay, onNew, onHome }: { result: BattleResult; stage: MatchStage; onContinue: () => void; onReplay: () => void; onNew: () => void; onHome: () => void }) {
  const won = result.winnerId === 'player';
  const winner = result.winnerId === result.leftTeam.id ? result.leftTeam : result.rightTeam;
  const loser = result.winnerId === result.leftTeam.id ? result.rightTeam : result.leftTeam;
  const all = [...result.finalLeft, ...result.finalRight];
  const mvp = characterById[result.mvpId]!;
  const damage = all.reduce((sum, fighter) => sum + fighter.statsBattle.damageDealt, 0);
  const healing = all.reduce((sum, fighter) => sum + fighter.statsBattle.healing, 0);
  return <main className={`screen-shell result-screen ${won ? 'is-victory' : 'is-defeat'}`}><BrandHeader compact subtitle={`${stage === 'final' ? 'FİNAL' : 'YARI FİNAL'} SONUCU`} />
    <section className="result-hero"><span>{won ? 'ZAFER' : 'YENİLGİ'}</span><h1>{winner.name}</h1><p>{loser.name} karşısında {result.turns.length} turda kazandı.</p>{result.tiebreaker && <b className="tiebreak-note">Eşitlik, performans puanıyla bozuldu.</b>}</section>
    <div className="result-highlights"><article><small>SAVAŞIN MVP'Sİ</small><PixelPortrait character={mvp} size="large" /><h2>{mvp.name}</h2><p>{all.find((fighter) => fighter.id === mvp.id)?.statsBattle.damageDealt} HASAR</p></article><div className="result-stats"><StatBox label="TOPLAM TUR" value={result.turns.length} /><StatBox label="SÜRE" value={`${result.duration} sn`} /><StatBox label="TOPLAM HASAR" value={damage} /><StatBox label="İYİLEŞTİRME" value={healing} /><StatBox label="KRİTİK" value={all.reduce((sum, fighter) => sum + fighter.statsBattle.criticals, 0)} /><StatBox label="ULTIMATE" value={all.reduce((sum, fighter) => sum + fighter.statsBattle.ultimates, 0)} /></div></div>
    <div className="performance-table"><header><span>KARAKTER</span><span>HASAR</span><span>ALINAN</span><span>İYİLEŞTİRME</span><span>KALKAN</span><span>KRİTİK</span></header>{[...all].sort((a, b) => b.statsBattle.damageDealt - a.statsBattle.damageDealt).map((fighter) => <div key={`${fighter.teamId}-${fighter.id}`}><span><PixelPortrait character={fighter} size="tiny" />{fighter.name}{!fighter.alive && <em>ELENDİ</em>}</span><b>{fighter.statsBattle.damageDealt}</b><b>{fighter.statsBattle.damageTaken}</b><b>{fighter.statsBattle.healing}</b><b>{fighter.statsBattle.shieldGiven}</b><b>{fighter.statsBattle.criticals}</b></div>)}</div>
    <div className="event-recap"><span>GERÇEKLEŞEN OLAYLAR</span>{result.turns.map((turn) => <i key={turn.number}>{turn.number}. {turn.event.name}</i>)}</div>
    <div className="bottom-actions"><button className="secondary-button" onClick={onHome}>ANA MENÜ</button><button className="secondary-button" onClick={onReplay}>TEKRAR İZLE</button><button className="secondary-button" onClick={onNew}>YENİ SAVAŞ</button><button className="primary-button primary-button--large" onClick={onContinue}>{stage === 'final' ? 'ŞAMPİYONLUK SAHNESİ' : won ? 'TURNUVAYA DEVAM ET' : 'TURNUVAYI İZLE'}</button></div>
  </main>;
}

function StatBox({ label, value }: { label: string; value: string | number }) { return <div><b>{value}</b><span>{label}</span></div>; }

function ChampionScreen({ result, onNew, onHome }: { result: BattleResult; onNew: () => void; onHome: () => void }) {
  const champion = result.winnerId === result.leftTeam.id ? result.leftTeam : result.rightTeam;
  return <main className="champion-screen"><BrandHeader compact /><div className="fireworks" /><div className="confetti">{Array.from({ length: 40 }, (_, index) => <i key={index} style={{ '--i': index } as React.CSSProperties} />)}</div><section><span>ATLANTIS ŞAMPİYONU!</span><div className="trophy">★<b>🏆</b>★</div><h1>{champion.name}</h1><div className="champion-team">{champion.characterIds.map((id) => <div key={id}><PixelPortrait character={characterById[id]!} size={characterById[id]!.manager ? 'large' : 'medium'} /><b>{characterById[id]!.name}</b></div>)}</div><p>Turnuva MVP'si: <b>{characterById[result.mvpId]!.name}</b></p><div><button className="secondary-button" onClick={onHome}>ANA MENÜ</button><button className="primary-button" onClick={onNew}>YENİ TURNUVA</button></div></section></main>;
}

function CharacterGuide({ onBack }: { onBack: () => void }) {
  const [detail, setDetail] = useState(characters[0]!);
  const [filter, setFilter] = useState<(typeof departments)[number]>('Tümü');
  const filtered = characters.filter((character) => filter === 'Tümü' || filter === 'Yöneticiler' ? filter === 'Tümü' || character.manager : character.department === filter);
  return <main className="screen-shell guide-screen"><BrandHeader compact onHome={onBack} subtitle="KARAKTERLER REHBERİ • 21/21" /><div className="filter-tabs">{departments.map((item) => <button className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><div className="team-content"><section className="character-grid">{filtered.map((character) => <CharacterCard character={character} selected={detail.id === character.id} onClick={() => setDetail(character)} key={character.id} />)}</section><CharacterDetail character={detail} /></div></main>;
}

function ArenaGuide({ save, onBack }: { save: SaveData; onBack: () => void }) { return <main className="screen-shell guide-screen"><BrandHeader compact onHome={onBack} subtitle="ARENA REHBERİ • 21 ANA + 4 ÖZEL" /><div className="page-heading"><h1>25 BENZERSİZ ARENA</h1><p>Arena avantajları sadece ilgili departmandaki karakterlere uygulanır.</p></div><section className="arena-guide-grid">{arenas.map((arena) => { const locked = Boolean(arena.special && arena.id !== 'atlantis-magaza' && !save.unlockedArenas.includes(arena.id)); return <article className={locked ? 'is-locked' : ''} key={arena.id}><img src={`./assets/arenas/${arena.id}.png`} alt={`${arena.name} pixel art arenası`} /><span>{arena.department}</span><h2>{locked ? 'KİLİTLİ ARENA' : arena.name}</h2><b>{locked ? `${arena.unlockWins} galibiyetle açılır` : arena.bonusLabel}</b><p>{arena.description}</p></article>; })}</section></main>; }

function EventGuide({ onBack }: { onBack: () => void }) { return <main className="screen-shell guide-screen"><BrandHeader compact onHome={onBack} subtitle="MAĞAZA OLAYLARI • HER TUR TAM BİR OLAY" /><div className="page-heading"><h1>MAĞAZA ANONSLARI</h1><p>Normal %70 • Nadir %25 • Efsanevi %5. Karakter olayları yalnız ilgili savaşçı arenadaysa seçilir.</p></div>{(['Normal', 'Nadir', 'Efsanevi'] as const).map((rarity) => <section className="event-section" key={rarity}><h2>{rarity} OLAYLAR <span>{storeEvents.filter((event) => event.rarity === rarity).length}</span></h2><div className="event-grid">{storeEvents.filter((event) => event.rarity === rarity).map((event) => <article key={event.id}><img src={`./assets/events/${storeEvents.indexOf(event) + 1}.png`} alt="" /><div><h3>{event.name}</h3><p>{event.description}</p>{event.specialCharacter && <small>{characterById[event.specialCharacter]?.name} özel olayı</small>}</div></article>)}</div></section>)}</main>; }

function HistoryScreen({ save, onBack, onReset }: { save: SaveData; onBack: () => void; onReset: () => void }) {
  const favorite = Object.entries(save.characterUses).sort((a, b) => b[1] - a[1])[0];
  return <main className="screen-shell history-screen"><BrandHeader compact onHome={onBack} subtitle="SAVAŞ GEÇMİŞİ" /><div className="page-heading"><h1>KARİYER İSTATİSTİKLERİ</h1></div><div className="history-stats"><StatBox label="SAVAŞ" value={save.battles} /><StatBox label="GALİBİYET" value={save.wins} /><StatBox label="YENİLGİ" value={save.losses} /><StatBox label="ŞAMPİYONLUK" value={save.tournaments} /><StatBox label="FAVORİ" value={favorite ? titleCase(characterById[favorite[0]]!.name) : '—'} /></div><section className="history-list"><header><span>SON KARŞILAŞMALAR</span><button onClick={onReset}>GEÇMİŞİ SIFIRLA</button></header>{save.history.length ? save.history.map((item, index) => <article key={`${item.date}-${index}`}><time>{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.date))}</time><b>{item.winner}</b><span>kazandı</span><strong>{item.loser}</strong><i>{item.arena} • {item.turns} tur</i></article>) : <p className="empty-state">Henüz savaş kaydı yok. İlk turnuvanı başlat!</p>}</section></main>;
}

function SettingsScreen({ settings, onChange, onBack }: { settings: GameSettings; onChange: (settings: GameSettings) => void; onBack: () => void }) {
  const slider = (key: 'master' | 'music' | 'effects' | 'announcements', label: string) => <label className="setting-slider"><span>{label}</span><input type="range" min="0" max="1" step=".05" value={settings[key]} onChange={(event) => onChange({ ...settings, [key]: Number(event.target.value) })} /><b>%{Math.round(settings[key] * 100)}</b></label>;
  const toggle = (key: 'muted' | 'reducedMotion' | 'lowGraphics', label: string, text: string) => <label className="setting-toggle"><div><b>{label}</b><p>{text}</p></div><input type="checkbox" checked={settings[key]} onChange={(event) => onChange({ ...settings, [key]: event.target.checked })} /><i /></label>;
  return <main className="screen-shell settings-screen"><BrandHeader compact onHome={onBack} subtitle="AYARLAR" /><div className="settings-panel"><section><h2>SES</h2>{slider('master', 'MASTER SES')}{slider('music', 'MÜZİK')}{slider('effects', 'EFEKTLER')}{slider('announcements', 'ANONS / ÇARK')}{toggle('muted', 'SESLERİ KAPAT', 'Müzik ve bütün efektleri sessize alır.')}</section><section><h2>GÖRÜNTÜ VE ERİŞİLEBİLİRLİK</h2>{toggle('reducedMotion', 'HAREKETİ AZALT', 'Sarsıntıları ve yoğun geçişleri azaltır.')}{toggle('lowGraphics', 'DÜŞÜK GRAFİK MODU', 'Canvas görüntüleyici ve azaltılmış efekt kullanır.')}<div className="speed-setting"><span>VARSAYILAN SAVAŞ HIZI</span>{([0.5, 1, 2, 4] as const).map((speed) => <button className={settings.speed === speed ? 'is-active' : ''} onClick={() => onChange({ ...settings, speed })} key={speed}>{speed}x</button>)}</div></section></div><div className="bottom-actions"><button className="primary-button" onClick={onBack}>AYARLARI KAYDET</button></div></main>;
}

function HowToPlay({ onBack }: { onBack: () => void }) { const steps = [['1', 'TAKIMINI KUR', 'Tam bir yönetici ve dört sporcu danışmanı seç. Departman sinerjilerini izle.'], ['2', 'ARENANI SEÇ', 'Arena avantajı yalnız ilgili departmanın karakterlerine uygulanır.'], ['3', 'SAVAŞI İZLE', 'Karakterler hedeflerini ve yeteneklerini otomatik seçer. Sen yalnızca hızı kontrol edersin.'], ['4', 'FİNALE YÜKSEL', 'Yarı finali kazan, yeni arena seç ve Atlantis Şampiyonu ol.']]; return <main className="screen-shell how-screen"><BrandHeader compact onHome={onBack} subtitle="NASIL OYNANIR?" /><div className="page-heading"><h1>ARENAYA HOŞ GELDİN</h1><p>Atlantis Arena, kararları takım kurulumunda verdiğin 5v5 otomatik savaş RPG’sidir.</p></div><div className="how-steps">{steps.map(([number, title, text]) => <article key={number}><b>{number}</b><h2>{title}</h2><p>{text}</p></article>)}</div><div className="rules-grid"><section><h3>SAVAŞ KURALLARI</h3><ul><li>Her tur kesinlikle bir mağaza olayı gerçekleşir.</li><li>Tur başında hayatta olan herkes bir ana saldırı yapar.</li><li>50 enerjide özel güç, 100 enerjide ultimate kullanılabilir.</li><li>Elenen karakter geri dönmez ve iyileştirilemez.</li><li>15. turdan sonra Mağaza Kapanıyor uzatması başlar.</li></ul></section><section><h3>SİNERJİ İPUÇLARI</h3><ul><li>Aynı departmandan 2–3 kişi güçlü takım bonusları açar.</li><li>Dört departmanı birleştiren Dengeli Kadro savunma ve saldırı verir.</li><li>Arda ve Özgür Sercan birlikte Kardeş Gücü’nü açar.</li><li>Yönetici seçimin liderlik pasifini belirler.</li></ul></section><section><h3>SEYİRCİ KONTROLLERİ</h3><ul><li>Savaş sonucunu değiştirmeden 0.5x, 1x, 2x veya 4x izle.</li><li>İstediğin anda duraklat veya tam ekrana geç.</li><li>Canlı günlükte hasar, iyileştirme ve olayları takip et.</li><li>Sonuç ekranında her karakterin performansını karşılaştır.</li></ul></section></div><div className="bottom-actions"><button className="primary-button primary-button--large" onClick={onBack}>ANLADIM, ARENAYA DÖN</button></div></main>; }
