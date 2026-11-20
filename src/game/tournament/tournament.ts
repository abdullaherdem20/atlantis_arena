import { characterById, characters, consultants, managers } from '../../data/characters';
import type { Team, TournamentState } from '../../types/game';
import { SeededRandom } from '../../utils/rng';

const opponentNames = ['Atlantis Warriors', 'Quechua Titans', 'Mavi Şimşekler'];

export const validateTeam = (ids: string[]): { valid: boolean; reason: string } => {
  const unique = new Set(ids);
  if (ids.length !== 5 || unique.size !== 5) return { valid: false, reason: 'Takım beş farklı karakterden oluşmalı.' };
  const selected = ids.map((id) => characterById[id]).filter(Boolean);
  if (selected.length !== 5) return { valid: false, reason: 'Geçersiz karakter seçimi.' };
  if (selected.filter((character) => character.manager).length !== 1) return { valid: false, reason: 'Takımda tam bir yönetici bulunmalı.' };
  return { valid: true, reason: '' };
};

export const createTournament = (playerIds: string[], seed: number, teamName?: string): TournamentState => {
  const validation = validateTeam(playerIds);
  if (!validation.valid) throw new Error(validation.reason);
  const rng = new SeededRandom(seed);
  const playerManager = playerIds.map((id) => characterById[id]).find((character) => character.manager)!;
  const remainingManagers = rng.shuffle(managers.filter((character) => !playerIds.includes(character.id)));
  const remainingConsultants = rng.shuffle(consultants.filter((character) => !playerIds.includes(character.id)));
  const teams: Team[] = [{
    id: 'player',
    name: teamName?.trim() || `${playerManager.name.charAt(0)}${playerManager.name.slice(1).toLocaleLowerCase('tr-TR')} Takımı`,
    characterIds: [...playerIds],
    isPlayer: true,
  }];
  for (let index = 0; index < 3; index += 1) {
    const manager = remainingManagers[index]!;
    const memberIds = remainingConsultants.slice(index * 4, index * 4 + 4).map((character) => character.id);
    teams.push({ id: `opponent-${index + 1}`, name: opponentNames[index]!, characterIds: [manager.id, ...memberIds] });
  }
  return { seed, teams, reserveId: remainingConsultants[12]!.id };
};

export const assertTournamentIntegrity = (tournament: TournamentState): boolean => {
  if (tournament.teams.length !== 4 || tournament.teams.some((team) => !validateTeam(team.characterIds).valid)) return false;
  const active = tournament.teams.flatMap((team) => team.characterIds);
  return active.length === 20 && new Set(active).size === 20 && !active.includes(tournament.reserveId) && characters.length === 21;
};
