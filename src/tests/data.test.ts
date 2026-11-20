import { describe, expect, it } from 'vitest';
import { arenas } from '../data/arenas';
import { characters, consultants, managers } from '../data/characters';
import { storeEvents } from '../data/events';

describe('merkezi oyun verileri', () => {
  it('21 benzersiz karakter ve doğru rol dağılımını içerir', () => {
    expect(characters).toHaveLength(21);
    expect(new Set(characters.map((character) => character.id)).size).toBe(21);
    expect(managers).toHaveLength(4);
    expect(consultants).toHaveLength(17);
  });

  it('Abdullah en yüksek bireysel temel güce sahiptir', () => {
    const abdullah = characters.find((character) => character.id === 'abdullah')!;
    expect(abdullah.power).toBe(99);
    expect(characters.every((character) => character.id === 'abdullah' || character.power < abdullah.power)).toBe(true);
    expect(abdullah.stats.hp).toBe(Math.max(...characters.map((character) => character.stats.hp)));
    expect(abdullah.stats.attack).toBe(Math.max(...characters.map((character) => character.stats.attack)));
  });

  it('21 ana/standart ve 4 özel arena ile 37 olayı içerir', () => {
    expect(arenas).toHaveLength(25);
    expect(arenas.filter((arena) => arena.special)).toHaveLength(4);
    expect(storeEvents).toHaveLength(37);
    expect(storeEvents.filter((event) => event.rarity === 'Normal')).toHaveLength(20);
    expect(storeEvents.filter((event) => event.rarity === 'Nadir')).toHaveLength(12);
    expect(storeEvents.filter((event) => event.rarity === 'Efsanevi')).toHaveLength(5);
  });
});
