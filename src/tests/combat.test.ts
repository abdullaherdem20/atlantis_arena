import { describe, expect, it } from 'vitest';
import { arenaById } from '../data/arenas';
import { simulateBattle } from '../game/combat/engine';
import { getTeamBonuses } from '../game/combat/synergies';
import type { Team } from '../types/game';

const left: Team = { id: 'player', name: 'Mavi Takım', isPlayer: true, characterIds: ['gokhan', 'abdullah', 'selen', 'pinar', 'arda'] };
const right: Team = { id: 'enemy', name: 'Kırmızı Takım', characterIds: ['duygu', 'deniz-arda', 'emirhan', 'ikra', 'can'] };

describe('deterministik otomatik savaş', () => {
  it('aynı seed ile aynı sonucu ve günlüğü üretir', () => {
    const first = simulateBattle(left, right, arenaById['hali-saha']!, 1453);
    const second = simulateBattle(left, right, arenaById['hali-saha']!, 1453);
    expect(first.winnerId).toBe(second.winnerId);
    expect(first.turns).toEqual(second.turns);
  });

  it('her tur tam bir olay üretir ve savaş daima sonlanır', () => {
    const battle = simulateBattle(left, right, arenaById.kamp!, 99);
    expect(battle.turns.length).toBeGreaterThan(0);
    expect(battle.turns.length).toBeLessThanOrEqual(40);
    expect(battle.turns.every((turn) => Boolean(turn.event.id))).toBe(true);
    expect(['player', 'enemy']).toContain(battle.winnerId);
  });

  it('tur başında hayatta olan her karaktere bir ana saldırı hakkı verir', () => {
    const battle = simulateBattle(left, right, arenaById.boks!, 831);
    battle.turns.forEach((turn, index) => {
      const previous = index === 0 ? 10 : [...battle.turns[index - 1]!.left, ...battle.turns[index - 1]!.right].filter((fighter) => fighter.alive).length;
      const mainActors = new Set(turn.actions.filter((action) => !action.id.endsWith('-extra')).map((action) => `${action.actorTeamId}-${action.actorId}`));
      expect(mainActors.size).toBe(previous);
    });
  });

  it('elenen karakterler sonraki turlarda saldırmaz ve iyileştirilemez', () => {
    const battle = simulateBattle(left, right, arenaById.kayak!, 12);
    battle.turns.forEach((turn, index) => {
      if (index === 0) return;
      const eliminated = [...battle.turns[index - 1]!.left, ...battle.turns[index - 1]!.right].filter((fighter) => !fighter.alive);
      eliminated.forEach((fighter) => {
        expect(turn.actions.some((action) => action.actorId === fighter.id && action.actorTeamId === fighter.teamId)).toBe(false);
        const current = [...turn.left, ...turn.right].find((item) => item.id === fighter.id && item.teamId === fighter.teamId)!;
        expect(current.currentHp).toBe(0);
      });
    });
  });

  it('enerjiyi 0–100 aralığında tutar', () => {
    const battle = simulateBattle(left, right, arenaById['self-kasa']!, 477);
    battle.turns.flatMap((turn) => [...turn.left, ...turn.right]).forEach((fighter) => expect(fighter.energy).toBeGreaterThanOrEqual(0));
    battle.turns.flatMap((turn) => [...turn.left, ...turn.right]).forEach((fighter) => expect(fighter.energy).toBeLessThanOrEqual(100));
  });

  it('Kardeş Gücü yalnız iki kardeş aynı takımdayken açılır', () => {
    expect(getTeamBonuses({ ...left, characterIds: ['gokhan', 'arda', 'ozgur-sercan', 'pinar', 'selen'] }).siblingIds).toEqual(['arda', 'ozgur-sercan']);
    expect(getTeamBonuses(left).siblingIds).toEqual([]);
  });

  it('Yusuf hırsızlık alarmının olumsuz hedefi olmaz', () => {
    const yusufTeam: Team = { id: 'yusuf-team', name: 'Yusuf Takımı', characterIds: ['merve', 'yusuf', 'hazal', 'gulnihal', 'aysegul'] };
    for (let seed = 1; seed <= 120; seed += 1) {
      const battle = simulateBattle(yusufTeam, right, arenaById.danisma!, seed);
      battle.turns.filter((turn) => turn.event.id === 'alarm').forEach((turn) => {
        expect(turn.logs.some((log) => log.text === 'YUSUF alarmdan etkilendi.')).toBe(false);
      });
    }
  });

  it('10.000 otomatik savaşı sonlandırır, geçerli olayı korur ve Abdullah takım halinde yenilebilir', () => {
    let playerLosses = 0;
    for (let seed = 1; seed <= 10_000; seed += 1) {
      const battle = simulateBattle(left, right, arenaById[seed % 2 ? 'hali-saha' : 'kayak']!, seed);
      expect(battle.turns.length).toBeLessThanOrEqual(40);
      expect(battle.turns.every((turn) => Boolean(turn.event.id))).toBe(true);
      expect(battle.estimatedWinChance[0] + battle.estimatedWinChance[1]).toBe(100);
      if (battle.winnerId !== 'player') playerLosses += 1;
    }
    expect(playerLosses).toBeGreaterThan(0);
  }, 120_000);

  it('performans günü savaşçılara kontrollü seed varyasyonu uygular', () => {
    const labels = new Set<string>();
    for (let seed = 1; seed <= 180; seed += 1) {
      const battle = simulateBattle(left, right, arenaById['atlantis-magaza']!, seed);
      battle.initialLeft.forEach((fighter) => labels.add(fighter.performance.label));
    }
    expect(labels).toEqual(new Set(['Kötü Gün', 'Normal Gün', 'İyi Gün', 'Efsanevi Gün']));
  });
});
