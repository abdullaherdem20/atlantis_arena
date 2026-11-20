export type Department = 'Takım Sporları' | 'Quechua' | 'Su / Kış' | 'Danışma';
export type Rarity = 'Normal' | 'Nadir' | 'Efsanevi' | 'Legendary';
export type CombatRole = 'saldırı' | 'savunma' | 'destek';

export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
}

export interface Character {
  id: string;
  name: string;
  department: Department;
  position: string;
  experience: string;
  power: number;
  rarity: Rarity;
  manager: boolean;
  role: CombatRole;
  stats: Stats;
  special: string;
  specialDescription: string;
  ultimate: string;
  ultimateDescription: string;
  passive?: string;
  appearance: string[];
  quotes: string[];
  accent: string;
}

export interface Arena {
  id: string;
  name: string;
  department: Department | 'Tarafsız';
  bonusType: 'attack' | 'defense' | 'speed' | 'crit' | 'special' | 'heal' | 'shield' | 'accuracy' | 'hp' | 'dodge' | 'combo' | 'none';
  bonus: number;
  bonusLabel: string;
  description: string;
  special?: boolean;
  unlockWins?: number;
  palette: [string, string, string];
}

export interface StoreEvent {
  id: string;
  name: string;
  description: string;
  rarity: Exclude<Rarity, 'Legendary'>;
  icon: string;
  specialCharacter?: string;
}

export interface Combatant extends Character {
  teamId: string;
  currentHp: number;
  maxHp: number;
  energy: number;
  shield: number;
  alive: boolean;
  buffs: Record<string, number>;
  performance: { label: 'Kötü Gün' | 'Normal Gün' | 'İyi Gün' | 'Efsanevi Gün'; multiplier: number };
  statsBattle: BattleCharacterStats;
}

export interface Team {
  id: string;
  name: string;
  characterIds: string[];
  isPlayer?: boolean;
}

export interface BattleCharacterStats {
  damageDealt: number;
  damageTaken: number;
  healing: number;
  shieldGiven: number;
  criticals: number;
  specials: number;
  ultimates: number;
  eliminations: number;
}

export interface BattleAction {
  id: string;
  turn: number;
  actorId: string;
  targetId: string;
  actorTeamId: string;
  kind: 'attack' | 'special' | 'ultimate' | 'heal' | 'shield' | 'miss';
  amount: number;
  critical: boolean;
  label: string;
  secondaryTargetIds?: string[];
}

export interface BattleTurn {
  number: number;
  event: StoreEvent;
  actions: BattleAction[];
  logs: BattleLog[];
  left: Combatant[];
  right: Combatant[];
}

export interface BattleLog {
  text: string;
  type: 'system' | 'event' | 'damage' | 'heal' | 'energy' | 'special' | 'ultimate' | 'elimination';
}

export interface BattleResult {
  seed: number;
  arena: Arena;
  leftTeam: Team;
  rightTeam: Team;
  winnerId: string;
  loserId: string;
  turns: BattleTurn[];
  initialLeft: Combatant[];
  initialRight: Combatant[];
  finalLeft: Combatant[];
  finalRight: Combatant[];
  mvpId: string;
  duration: number;
  estimatedWinChance: [number, number];
  tiebreaker?: boolean;
}

export interface TournamentState {
  seed: number;
  teams: Team[];
  reserveId: string;
  semiPlayer?: BattleResult;
  semiAi?: BattleResult;
  final?: BattleResult;
  championId?: string;
}

export interface GameSettings {
  master: number;
  music: number;
  effects: number;
  announcements: number;
  muted: boolean;
  reducedMotion: boolean;
  lowGraphics: boolean;
  speed: 0.5 | 1 | 2 | 4;
}

export interface SaveData {
  battles: number;
  wins: number;
  losses: number;
  tournaments: number;
  characterUses: Record<string, number>;
  arenaWins: Record<string, number>;
  mvpCounts: Record<string, number>;
  history: Array<{ date: string; winner: string; loser: string; arena: string; turns: number }>;
  unlockedArenas: string[];
  settings: GameSettings;
}
