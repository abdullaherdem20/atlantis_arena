import type { BattleResult, GameSettings, SaveData } from '../types/game';

const KEY = 'atlantis-arena-save-v2';
const LEGACY_KEY = 'atlantis-arena-save-v1';
export const defaultSettings: GameSettings = { master: .8, music: .55, effects: .75, announcements: .8, muted: false, reducedMotion: false, lowGraphics: false, speed: 1 };
export const defaultSave: SaveData = { battles: 0, wins: 0, losses: 0, tournaments: 0, characterUses: {}, arenaWins: {}, mvpCounts: {}, history: [], unlockedArenas: ['atlantis-magaza'], settings: defaultSettings };

export const loadSave = (): SaveData => {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return structuredClone(defaultSave);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...structuredClone(defaultSave), ...parsed, settings: { ...defaultSettings, ...parsed.settings } };
  } catch {
    return structuredClone(defaultSave);
  }
};

export const persistSave = (save: SaveData): void => localStorage.setItem(KEY, JSON.stringify(save));
export const clearSave = (): SaveData => { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); return structuredClone(defaultSave); };

export const recordBattle = (save: SaveData, result: BattleResult, playerTeamId: string): SaveData => {
  const won = result.winnerId === playerTeamId;
  const winner = result.winnerId === result.leftTeam.id ? result.leftTeam : result.rightTeam;
  const loser = result.winnerId === result.leftTeam.id ? result.rightTeam : result.leftTeam;
  const next: SaveData = structuredClone(save);
  next.battles += 1;
  if (won) next.wins += 1; else next.losses += 1;
  next.arenaWins[result.arena.id] = (next.arenaWins[result.arena.id] ?? 0) + (won ? 1 : 0);
  next.mvpCounts[result.mvpId] = (next.mvpCounts[result.mvpId] ?? 0) + 1;
  const player = result.leftTeam.id === playerTeamId ? result.leftTeam : result.rightTeam;
  player.characterIds.forEach((id) => { next.characterUses[id] = (next.characterUses[id] ?? 0) + 1; });
  next.history.unshift({ date: new Date().toISOString(), winner: winner.name, loser: loser.name, arena: result.arena.name, turns: result.turns.length });
  next.history = next.history.slice(0, 20);
  if (next.wins >= 1 && !next.unlockedArenas.includes('otopark')) next.unlockedArenas.push('otopark');
  if (next.wins >= 2 && !next.unlockedArenas.includes('mola')) next.unlockedArenas.push('mola');
  if (next.wins >= 3 && !next.unlockedArenas.includes('depo')) next.unlockedArenas.push('depo');
  persistSave(next);
  return next;
};
