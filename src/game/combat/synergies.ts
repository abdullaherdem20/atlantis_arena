import { characterById } from '../../data/characters';
import type { Department, Team } from '../../types/game';

export interface TeamBonuses {
  attack: number;
  defense: number;
  special: number;
  healing: number;
  energy: number;
  crit: number;
  labels: string[];
  siblingIds: string[];
}

export const getTeamBonuses = (team: Team): TeamBonuses => {
  const members = team.characterIds.map((id) => characterById[id]).filter(Boolean);
  const counts = members.reduce<Record<Department, number>>((result, character) => {
    result[character.department] += 1;
    return result;
  }, { 'Takım Sporları': 0, Quechua: 0, 'Su / Kış': 0, Danışma: 0 });
  const result: TeamBonuses = { attack: 0, defense: 0, special: 0, healing: 0, energy: 0, crit: 0, labels: [], siblingIds: [] };

  if (counts['Takım Sporları'] >= 2) {
    result.attack += counts['Takım Sporları'] >= 3 ? .10 : .05;
    result.labels.push(`Takım Oyunu +%${result.attack * 100} saldırı`);
  }
  if (counts.Quechua >= 2) {
    const amount = counts.Quechua >= 3 ? .10 : .05;
    result.defense += amount;
    result.labels.push(`Kamp Ruhu +%${amount * 100} savunma`);
  }
  if (counts['Su / Kış'] >= 2) {
    const amount = counts['Su / Kış'] >= 3 ? .10 : .05;
    result.special += amount;
    result.labels.push(`Element Akışı +%${amount * 100} özel hasar`);
  }
  if (counts.Danışma >= 2) {
    const amount = counts.Danışma >= 3 ? .10 : .05;
    result.healing += amount;
    result.energy += amount;
    result.labels.push(`Operasyon Ağı +%${amount * 100} destek`);
  }
  if (Object.values(counts).every((count) => count >= 1)) {
    result.attack += .05;
    result.defense += .05;
    result.labels.push('Dengeli Kadro +%5 saldırı ve savunma');
  }
  if (team.characterIds.includes('arda') && team.characterIds.includes('ozgur-sercan')) {
    result.siblingIds = ['arda', 'ozgur-sercan'];
    result.labels.push('Kardeş Gücü +%20 saldırı ve savunma');
  }
  const leader = members.find((member) => member.manager);
  if (leader?.id === 'gokhan') { result.attack += .10; result.defense += .10; result.labels.push("Gökhan'ın Liderliği"); }
  if (leader?.id === 'duygu') { result.crit += .08; result.labels.push("Duygu'nun Liderliği"); }
  if (leader?.id === 'sinejan') { result.special += .15; result.labels.push("Sinejan'ın Liderliği"); }
  if (leader?.id === 'merve') { result.energy += .20; result.labels.push("Merve'nin Liderliği"); }
  return result;
};
