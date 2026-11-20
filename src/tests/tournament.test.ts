import { describe, expect, it } from 'vitest';
import { createTournament, assertTournamentIntegrity, validateTeam } from '../game/tournament/tournament';

const player = ['gokhan', 'abdullah', 'selen', 'pinar', 'arda'];

describe('turnuva kurucusu', () => {
  it('dört adet beş kişilik, çakışmayan takım ve bir yedek oluşturur', () => {
    const tournament = createTournament(player, 20261120, 'Test Takımı');
    expect(assertTournamentIntegrity(tournament)).toBe(true);
    expect(tournament.teams.every((team) => team.characterIds.length === 5)).toBe(true);
    expect(new Set(tournament.teams.flatMap((team) => team.characterIds)).size).toBe(20);
  });

  it('her takımda tam bir yönetici şartını uygular', () => {
    expect(validateTeam(player).valid).toBe(true);
    expect(validateTeam(['abdullah', 'selen', 'pinar', 'arda', 'yusuf']).valid).toBe(false);
    expect(validateTeam(['gokhan', 'duygu', 'selen', 'pinar', 'arda']).valid).toBe(false);
  });

  it('aynı seed ile aynı turnuvayı üretir', () => {
    expect(createTournament(player, 42)).toEqual(createTournament(player, 42));
  });
});
